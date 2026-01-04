import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { CartItemModel, CartSummaryModel } from '../models/cart.model';
import { MicroseguroProductModel } from '../models/microseguro.model';
import { ProductModel } from '../models/marketplace.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';

// Obtener carrito del usuario
export async function getCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    const cartItems = await CartItemModel.find({ userId })
      .populate({
        path: 'productId',
        select: 'name description imageUrl pointsCost stock isActive price coverage'
      })
      .sort({ addedAt: -1 });

    const summary = await CartSummaryModel.findOne({ userId }) || {
      totalItems: 0,
      totalPointsPrice: 0,
      totalSolesPrice: 0,
      itemsByType: { microseguros: 0, marketplace_products: 0, premium_services: 0 }
    };

    return sendOk(res, {
      items: cartItems,
      summary,
      message: cartItems.length > 0 ? `${cartItems.length} productos en tu carrito` : 'Tu carrito está vacío'
    });
  } catch (error) {
    console.error('Error in getCart:', error);
    return sendError(res, 'Error al obtener el carrito', 500, 'CART_GET_ERROR');
  }
}

// Agregar producto al carrito
export async function addToCart(req: Request, res: Response) {
  try {
    const { productId, productType, quantity = 1, metadata = {} } = req.body;
    const userId = (req as any).user.id;

    // Validar que el producto existe y está disponible
    let product;
    let unitPrice;
    let currency;

    if (productType === 'microseguro') {
      product = await (MicroseguroProductModel as any).findById(productId);
      if (!product || !product.isActive) {
        return sendError(res, 'Microseguro no disponible', 404, 'PRODUCT_NOT_AVAILABLE');
      }
      unitPrice = product.price;
      currency = 'soles';
    } else if (productType === 'marketplace_product') {
      product = await ProductModel.findById(productId);
      if (!product || !product.isActive || product.stock < quantity) {
        return sendError(res, 'Producto no disponible o sin stock suficiente', 404, 'PRODUCT_NOT_AVAILABLE');
      }
      unitPrice = product.pointsCost;
      currency = 'points';
    } else {
      return sendError(res, 'Tipo de producto no válido', 400, 'INVALID_PRODUCT_TYPE');
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = await CartItemModel.findOne({ userId, productId, productType });
    
    if (existingItem) {
      // Actualizar cantidad
      existingItem.quantity += quantity;
      await existingItem.save();
    } else {
      // Crear nuevo item en el carrito
      await CartItemModel.create({
        userId,
        productId,
        productType,
        quantity,
        unitPrice,
        currency,
        metadata
      });
    }

    // Actualizar resumen del carrito
    await updateCartSummary(userId);

    return sendCreated(res, { message: 'Producto agregado al carrito exitosamente' });
  } catch (error) {
    console.error('Error in addToCart:', error);
    return sendError(res, 'Error al agregar producto al carrito', 500, 'CART_ADD_ERROR');
  }
}

// Actualizar cantidad de producto en el carrito
export async function updateCartItem(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = (req as any).user.id;

    if (quantity <= 0) {
      return removeFromCart(req, res);
    }

    const cartItem = await CartItemModel.findOne({ _id: itemId, userId });
    if (!cartItem) {
      return sendError(res, 'Producto no encontrado en el carrito', 404, 'CART_ITEM_NOT_FOUND');
    }

    // Validar stock disponible para productos físicos
    if (cartItem.productType === 'marketplace_product') {
      const product = await ProductModel.findById(cartItem.productId);
      if (!product || product.stock < quantity) {
        return sendError(res, 'Stock insuficiente', 400, 'INSUFFICIENT_STOCK');
      }
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    // Actualizar resumen del carrito
    await updateCartSummary(userId);

    return sendOk(res, { message: 'Cantidad actualizada exitosamente' });
  } catch (error) {
    console.error('Error in updateCartItem:', error);
    return sendError(res, 'Error al actualizar el carrito', 500, 'CART_UPDATE_ERROR');
  }
}

// Remover producto del carrito
export async function removeFromCart(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const userId = (req as any).user.id;

    const result = await CartItemModel.deleteOne({ _id: itemId, userId });
    if (result.deletedCount === 0) {
      return sendError(res, 'Producto no encontrado en el carrito', 404, 'CART_ITEM_NOT_FOUND');
    }

    // Actualizar resumen del carrito
    await updateCartSummary(userId);

    return sendOk(res, { message: 'Producto removido del carrito exitosamente' });
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    return sendError(res, 'Error al remover producto del carrito', 500, 'CART_REMOVE_ERROR');
  }
}

// Limpiar carrito completo
export async function clearCart(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    await CartItemModel.deleteMany({ userId });
    await CartSummaryModel.deleteOne({ userId });

    return sendOk(res, { message: 'Carrito limpiado exitosamente' });
  } catch (error) {
    console.error('Error in clearCart:', error);
    return sendError(res, 'Error al limpiar el carrito', 500, 'CART_CLEAR_ERROR');
  }
}

// Procesar compra del carrito
export async function checkoutCart(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = (req as any).user.id;
    const { paymentMethod = 'points' } = req.body;

    // Obtener items del carrito
    const cartItems = await CartItemModel.find({ userId }).populate('productId');
    if (cartItems.length === 0) {
      return sendError(res, 'El carrito está vacío', 400, 'EMPTY_CART');
    }

    // Obtener usuario
    const user = await UserModel.findById(userId);
    if (!user) {
      return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    // Calcular totales
    let totalPoints = 0;
    let totalSoles = 0;
    const purchases = [];

    for (const item of cartItems) {
      if (item.currency === 'points') {
        totalPoints += item.unitPrice * item.quantity;
      } else {
        totalSoles += item.unitPrice * item.quantity;
      }

      purchases.push({
        productId: item.productId,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currency: item.currency,
        totalPrice: item.unitPrice * item.quantity
      });
    }

    // Verificar fondos disponibles
    if (totalPoints > 0 && user.pointsSmart < totalPoints) {
      return sendError(res, 'Puntos insuficientes', 400, 'INSUFFICIENT_POINTS');
    }

    // Para microseguros (pagos en soles), aquí integrarías con Stripe o tu gateway de pagos
    if (totalSoles > 0) {
      // Por ahora, solo simulamos la compra exitosa
      // TODO: Integrar con Stripe para pagos reales
    }

    // Procesar la compra
    if (totalPoints > 0) {
      user.pointsSmart -= totalPoints;
      await user.save({ session });
    }

    // Crear registros de compra/canje
    for (const item of cartItems) {
      if (item.productType === 'marketplace_product') {
        // Crear canje de producto
        const { RedemptionModel } = await import('../models/marketplace.model');
        await RedemptionModel.create([{
          userId,
          productId: item.productId,
          pointsSpent: item.unitPrice * item.quantity,
          status: 'pending'
        }], { session });

        // Reducir stock
        await ProductModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -item.quantity } },
          { session }
        );
      } else if (item.productType === 'microseguro') {
        // Crear contrato de microseguro
        // TODO: Implementar lógica de contratación de microseguros
      }
    }

    // Limpiar carrito
    await CartItemModel.deleteMany({ userId }, { session });
    await CartSummaryModel.deleteOne({ userId }, { session });

    await session.commitTransaction();

    return sendCreated(res, {
      purchases,
      totalPoints,
      totalSoles,
      remainingPoints: user.pointsSmart,
      message: 'Compra procesada exitosamente'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in checkoutCart:', error);
    return sendError(res, 'Error al procesar la compra', 500, 'CHECKOUT_ERROR');
  } finally {
    session.endSession();
  }
}

// Función auxiliar para actualizar el resumen del carrito
async function updateCartSummary(userId: string) {
  try {
    const cartItems = await CartItemModel.find({ userId });
    
    let totalItems = 0;
    let totalPointsPrice = 0;
    let totalSolesPrice = 0;
    const itemsByType = {
      microseguros: 0,
      marketplace_products: 0,
      premium_services: 0
    };

    for (const item of cartItems) {
      totalItems += item.quantity;
      
      if (item.currency === 'points') {
        totalPointsPrice += item.unitPrice * item.quantity;
      } else {
        totalSolesPrice += item.unitPrice * item.quantity;
      }

      if (item.productType === 'microseguro') {
        itemsByType.microseguros += item.quantity;
      } else if (item.productType === 'marketplace_product') {
        itemsByType.marketplace_products += item.quantity;
      } else if (item.productType === 'premium_service') {
        itemsByType.premium_services += item.quantity;
      }
    }

    await CartSummaryModel.findOneAndUpdate(
      { userId },
      {
        totalItems,
        totalPointsPrice,
        totalSolesPrice,
        itemsByType,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating cart summary:', error);
  }
}
