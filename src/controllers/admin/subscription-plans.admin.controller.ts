import { Request, Response } from 'express';
import { sendOk, sendError, sendCreated, sendNoContent } from '../../utils/response';
import mongoose from 'mongoose';

// Simple in-memory collection fallback if no model exists
const PlanModel = mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'PEN' },
  durationDays: { type: Number, default: 30 },
  benefits: [{ name: String, description: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true }));

export async function listPlans(_req: Request, res: Response) {
  try {
    const plans = await (PlanModel as any).find({}).sort({ price: 1 }).lean();
    return sendOk(res, plans);
  } catch { return sendError(res, 'Error', 500); }
}
export async function createPlan(req: Request, res: Response) {
  try {
    const plan = await (PlanModel as any).create(req.body);
    return sendCreated(res, plan);
  } catch { return sendError(res, 'Error', 500); }
}
export async function updatePlan(req: Request, res: Response) {
  try {
    const updated = await (PlanModel as any).findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return sendError(res, 'Plan no encontrado', 404);
    return sendOk(res, updated);
  } catch { return sendError(res, 'Error', 500); }
}
export async function deletePlan(req: Request, res: Response) {
  try {
    await (PlanModel as any).findByIdAndDelete(req.params.id);
    return sendNoContent(res);
  } catch { return sendError(res, 'Error', 500); }
}


