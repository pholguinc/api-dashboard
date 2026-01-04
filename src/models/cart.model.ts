import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CartItemDocument extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productType: 'microseguro' | 'marketplace_product' | 'premium_service';
  quantity: number;
  unitPrice: number; // En puntos para productos del marketplace, en soles para microseguros
  currency: 'points' | 'soles';
  metadata?: Record<string, any>; // Para datos específicos del producto
  addedAt: Date;
}

const CartItemSchema = new Schema<CartItemDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    productType: { 
      type: String, 
      enum: ['microseguro', 'marketplace_product', 'premium_service'], 
      required: true 
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['points', 'soles'], required: true },
    metadata: { type: Object, default: {} },
    addedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Índice compuesto para evitar duplicados
CartItemSchema.index({ userId: 1, productId: 1, productType: 1 }, { unique: true });

export const CartItemModel: Model<CartItemDocument> =
  mongoose.models.CartItem || mongoose.model<CartItemDocument>('CartItem', CartItemSchema);

export interface CartSummaryDocument extends Document {
  userId: mongoose.Types.ObjectId;
  totalItems: number;
  totalPointsPrice: number;
  totalSolesPrice: number;
  itemsByType: {
    microseguros: number;
    marketplace_products: number;
    premium_services: number;
  };
  lastUpdated: Date;
}

const CartSummarySchema = new Schema<CartSummaryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalItems: { type: Number, default: 0 },
    totalPointsPrice: { type: Number, default: 0 },
    totalSolesPrice: { type: Number, default: 0 },
    itemsByType: {
      microseguros: { type: Number, default: 0 },
      marketplace_products: { type: Number, default: 0 },
      premium_services: { type: Number, default: 0 }
    },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const CartSummaryModel: Model<CartSummaryDocument> =
  mongoose.models.CartSummary || mongoose.model<CartSummaryDocument>('CartSummary', CartSummarySchema);
