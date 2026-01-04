import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated, sendPaginated } from '../utils/response';
import { ProductModel, RedemptionModel } from '../models/marketplace.model';
import { UserModel } from '../models/user.model';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';

export async function listProducts(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, category, search } = req.query as any;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filter: any = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { provider: { $regex: search, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter)
    ]);

    return sendPaginated(res, products, page, limit, total);
  } catch (error) {
    console.error('Error in listProducts:', error);
    return sendError(res, 'Error al obtener productos', 500, 'PRODUCTS_FETCH_ERROR');
  }
}

export async function getProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de producto inválido', 400, 'INVALID_PRODUCT_ID');
    }

    const product = await ProductModel.findById(id).lean();
    if (!product) {
      return sendError(res, 'Producto no encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    return sendOk(res, product);
  } catch (error) {
    console.error('Error in getProduct:', error);
    return sendError(res, 'Error al obtener producto', 500, 'PRODUCT_FETCH_ERROR');
  }
}

export async function redeemProduct(req: AuthenticatedRequest, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { productId } = req.body;

    const [user, product] = await Promise.all([
      UserModel.findById(req.user!.id).session(session),
      ProductModel.findById(productId).session(session)
    ]);

    if (!user) {
      await session.abortTransaction();
      return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    if (!product || !product.isActive) {
      await session.abortTransaction();
      return sendError(res, 'Producto no disponible', 400, 'PRODUCT_UNAVAILABLE');
    }

    if (product.stock <= 0) {
      await session.abortTransaction();
      return sendError(res, 'Producto sin stock', 400, 'OUT_OF_STOCK');
    }

    // Validar Metro Premium para productos exclusivos
    if (product.category === 'premium' && !user.hasMetroPremium) {
      await session.abortTransaction();
      return sendError(res, 'Requiere suscripción MetroPremium para este producto', 403, 'PREMIUM_REQUIRED');
    }

    if (user.pointsSmart < product.pointsCost) {
      await session.abortTransaction();
      return sendError(res, 'Puntos insuficientes', 400, 'INSUFFICIENT_POINTS');
    }

    // Verificar que el usuario no haya canjeado este producto antes
    const existingRedemption = await RedemptionModel.findOne({
      userId: user._id,
      productId: product._id
    }).session(session);

    if (existingRedemption) {
      await session.abortTransaction();
      return sendError(res, 'Ya has canjeado este producto anteriormente', 400, 'ALREADY_REDEEMED');
    }

    // Actualizar puntos del usuario y stock del producto
    user.pointsSmart -= product.pointsCost;
    product.stock -= 1;

    // Crear registro de canje
    const expiresAt = product.category === 'physical'
      ? undefined
      : new Date(Date.now() + (product as any).validityMinutes * 60 * 1000);
    const redemption = await RedemptionModel.create([{
      userId: user._id,
      productId: product._id,
      pointsSpent: product.pointsCost,
      status: 'pending',
      expiresAt,
    }], { session });

    // Guardar cambios
    await Promise.all([
      user.save({ session }),
      product.save({ session })
    ]);

    // Generar código de canje para mostrar QR/código en app
    const red = redemption[0];
    const shortId = (red._id as any).toString().slice(-6).toUpperCase();
    const random = Math.random().toString(36).slice(-4).toUpperCase();
    const code = `R-${shortId}-${random}`;
    await RedemptionModel.findByIdAndUpdate(red._id, { code }, { session });

    await session.commitTransaction();

    return sendCreated(res, {
      redemption: { ...(red as any).toObject?.() || red, code, expiresAt },
      userPointsRemaining: user.pointsSmart
    }, 'Producto canjeado exitosamente');

  } catch (error) {
    await session.abortTransaction();
    console.error('Error in redeemProduct:', error);
    
    // Si es un error de validación de Mongoose, devolver mensaje específico
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400, 'VALIDATION_ERROR');
    }
    
    return sendError(res, 'Error al canjear producto', 500, 'REDEMPTION_ERROR');
  } finally {
    session.endSession();
  }
}

export async function getUserRedemptions(req: AuthenticatedRequest, res: Response) {
  try {
    const { page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;

    const [redemptions, total] = await Promise.all([
      RedemptionModel.find({ userId: req.user!.id })
        .populate('productId', 'name imageUrl category provider')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RedemptionModel.countDocuments({ userId: req.user!.id })
    ]);

    return sendPaginated(res, redemptions, page, limit, total);
  } catch (error) {
    console.error('Error in getUserRedemptions:', error);
    return sendError(res, 'Error al obtener canjes', 500, 'REDEMPTIONS_FETCH_ERROR');
  }
}

// Usuario confirma recepción de canje (solo productos digitales)
export async function confirmRedemption(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as any;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de canje inválido', 400, 'INVALID_REDEMPTION_ID');
    }

    const redemption = await RedemptionModel.findOne({ _id: id, userId: req.user!.id })
      .populate('productId', 'category');
    if (!redemption) {
      return sendError(res, 'Canje no encontrado', 404, 'REDEMPTION_NOT_FOUND');
    }

    const product: any = redemption.productId;
    if (!product || product.category !== 'digital') {
      return sendError(res, 'Solo los canjes digitales pueden ser confirmados por el usuario', 400, 'REDEMPTION_NOT_DIGITAL');
    }

    if (redemption.status === 'delivered') {
      return sendOk(res, { message: 'El canje ya fue marcado como recibido', redemption });
    }

    redemption.status = 'delivered';
    await redemption.save();

    return sendOk(res, { message: 'Canje marcado como recibido', redemption });
  } catch (error) {
    console.error('Error in confirmRedemption:', error);
    return sendError(res, 'Error al confirmar canje', 500, 'REDEMPTION_CONFIRM_ERROR');
  }
}


