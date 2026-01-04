import { Request, Response } from 'express';
import { sendOk, sendError, sendCreated } from '../../utils/response';
import { SubscriptionModel } from '../../models/subscription.model';
import { UserModel } from '../../models/user.model';
import mongoose from 'mongoose';

export async function listSubscriptions(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, status } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: any = {};
    if (status) filter.status = status;

    const [subs, total] = await Promise.all([
      (SubscriptionModel as any)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'displayName metroUsername email')
        .lean(),
      SubscriptionModel.countDocuments(filter)
    ]);

    const mapped = subs.map((s: any) => ({
      id: s._id,
      user: { id: s.userId?._id, name: s.userId?.displayName, username: s.userId?.metroUsername, email: s.userId?.email },
      type: s.type,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      price: s.price,
      currency: s.currency,
      autoRenew: s.autoRenew,
      transactionId: s.transactionId
    }));

    return sendOk(res, { subscriptions: mapped, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch { return sendError(res, 'Error', 500); }
}
export async function getStats(_req: Request, res: Response) {
  try {
    const [total, active, cancelled, expired, pending] = await Promise.all([
      SubscriptionModel.countDocuments(),
      SubscriptionModel.countDocuments({ status: 'active' }),
      SubscriptionModel.countDocuments({ status: 'cancelled' }),
      SubscriptionModel.countDocuments({ status: 'expired' }),
      SubscriptionModel.countDocuments({ status: 'pending' })
    ]);
    return sendOk(res, { total, active, cancelled, expired, pending });
  } catch { return sendError(res, 'Error', 500); }
}
export async function getRevenue(_req: Request, res: Response) {
  try {
    const agg = await SubscriptionModel.aggregate([
      { $match: { status: { $in: ['active', 'expired', 'cancelled'] } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    return sendOk(res, { total: agg[0]?.total || 0 });
  } catch { return sendError(res, 'Error', 500); }
}
export async function createSubscription(req: Request, res: Response) {
  try {
    const payload = req.body;
    
    console.log('Creating subscription with payload:', payload);
    
    // Validar que el usuario existe
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      console.log('User not found:', payload.userId);
      return sendError(res, 'Usuario no encontrado', 404);
    }
    
    console.log('User found:', user.displayName);
    
    // Validar campos requeridos
    if (!payload.type || !payload.status || !payload.startDate || !payload.endDate || !payload.price || !payload.currency) {
      console.log('Missing required fields');
      return sendError(res, 'Faltan campos requeridos', 400);
    }
    
    // Convertir fechas
    const subscriptionData = {
      ...payload,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      price: parseFloat(payload.price),
      autoRenew: payload.autoRenew || false
    };
    
    console.log('Processed subscription data:', subscriptionData);
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      console.log('Creating subscription in database...');
      const sub = await SubscriptionModel.create([subscriptionData], { session });
      console.log('Subscription created:', sub[0]._id);
      
      // Sincronizar bandera premium en usuario
      console.log('Updating user premium status...');
      await UserModel.findByIdAndUpdate(
        payload.userId, 
        { hasMetroPremium: payload.status === 'active' }, 
        { session }
      );
      console.log('User premium status updated');
      
      await session.commitTransaction();
      console.log('✅ Transaction committed successfully');
      
      return sendCreated(res, { id: (sub[0] as any)._id, success: true });
    } catch (e) {
      console.error('❌ Error in transaction:', e);
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return sendError(res, `Error al crear suscripción: ${error.message}`, 500);
  }
}
export async function updateSubscription(req: Request, res: Response) {
  try {
    const updated = await SubscriptionModel.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!updated) return sendError(res, 'Suscripción no encontrada', 404);
    // Sincronizar premium al cambiar status
    await UserModel.findByIdAndUpdate(updated.userId, { hasMetroPremium: updated.status === 'active' });
    return sendOk(res, { id: updated._id, ...updated });
  } catch { return sendError(res, 'Error', 500); }
}
export async function cancelSubscription(req: Request, res: Response) {
  try {
    const sub = await SubscriptionModel.findByIdAndUpdate(req.params.id, { status: 'cancelled', cancelledAt: new Date() }, { new: true });
    if (!sub) return sendError(res, 'Suscripción no encontrada', 404);
    await UserModel.findByIdAndUpdate(sub.userId, { hasMetroPremium: false });
    return sendOk(res, { cancelled: true });
  } catch { return sendError(res, 'Error', 500); }
}