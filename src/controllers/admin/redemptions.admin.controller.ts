import { Request, Response } from 'express';
import { sendOk, sendError } from '../../utils/response';
import { RedemptionModel } from '../../models/marketplace.model';
import mongoose from 'mongoose';

export async function confirmByCode(req: Request, res: Response) {
  try {
    const { code } = req.body as any;
    if (!code) return sendError(res, 'Código requerido', 400);
    const redemption: any = await RedemptionModel.findOne({ code });
    if (!redemption) return sendError(res, 'Canje no encontrado', 404);
    if (redemption.status !== 'pending') return sendOk(res, { message: 'Ya procesado', redemption });
    redemption.status = 'confirmed';
    redemption.confirmedAt = new Date();
    // Guardar estación si viene
    const station = (req.body as any).station;
    if (station) {
      redemption.station = {
        name: station.name,
        code: station.code,
        deviceId: station.deviceId,
      };
    }
    // Audit trail
    redemption.audit = redemption.audit || { entries: [] };
    redemption.audit.entries.push({ action: 'confirm', at: new Date(), stationCode: station?.code, deviceId: station?.deviceId, outcome: 'ok' });
    await redemption.save();
    return sendOk(res, { confirmed: true, redemption });
  } catch { return sendError(res, 'Error', 500); }
}
export async function markDeliveredByCode(req: Request, res: Response) {
  try {
    const { code } = req.body as any;
    if (!code) return sendError(res, 'Código requerido', 400);
    const redemption: any = await RedemptionModel.findOne({ code });
    if (!redemption) return sendError(res, 'Canje no encontrado', 404);
    if (redemption.status === 'delivered') return sendOk(res, { message: 'Ya entregado', redemption });
    redemption.status = 'delivered';
    redemption.deliveredAt = new Date();
    // Audit trail
    redemption.audit = redemption.audit || { entries: [] };
    redemption.audit.entries.push({ action: 'deliver', at: new Date(), outcome: 'ok' });
    await redemption.save();
    return sendOk(res, { delivered: true, redemption });
  } catch { return sendError(res, 'Error', 500); }
}
export async function getStats(_req: Request, res: Response) {
  try {
    const { stationCode, limit = 10 } = _req.query as any;
    const match: any = {};
    if (stationCode) match['station.code'] = stationCode;
    const [total, delivered, pending, confirmed, recent] = await Promise.all([
      RedemptionModel.countDocuments(match),
      RedemptionModel.countDocuments({ ...match, status: 'delivered' }),
      RedemptionModel.countDocuments({ ...match, status: 'pending' }),
      RedemptionModel.countDocuments({ ...match, status: 'confirmed' }),
      RedemptionModel.find(match).sort({ updatedAt: -1 }).limit(Number(limit)).select('status code updatedAt confirmedAt deliveredAt').lean()
    ]);
    return sendOk(res, { total, delivered, pending, confirmed, recent });
  } catch { return sendError(res, 'Error', 500); }
}

export async function exportCsv(req: Request, res: Response) {
  try {
    const { from, to, stationCode } = req.query as any;
    const match: any = {};
    if (stationCode) match['station.code'] = stationCode;
    if (from || to) {
      match.createdAt = {} as any;
      if (from) (match.createdAt as any).$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) (match.createdAt as any).$lte = new Date(`${to}T23:59:59.999Z`);
    }
    const rows: any[] = await RedemptionModel.find(match)
      .select('code status pointsSpent createdAt confirmedAt deliveredAt station.code station.name')
      .sort({ createdAt: -1 })
      .lean();
    const headers = ['code', 'status', 'pointsSpent', 'createdAt', 'confirmedAt', 'deliveredAt', 'station.code', 'station.name'];
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csv = [headers.join(',')]
      .concat(rows.map(r => [
        escape(r.code),
        escape(r.status),
        escape(r.pointsSpent),
        escape(r.createdAt),
        escape(r.confirmedAt),
        escape(r.deliveredAt),
        escape(r.station?.code),
        escape(r.station?.name),
      ].join(',')))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="redemptions.csv"');
    return res.status(200).send(csv);
  } catch {
    return sendError(res, 'Error exportando CSV', 500);
  }
}


