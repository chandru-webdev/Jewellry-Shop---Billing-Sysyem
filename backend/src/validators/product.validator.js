const { z } = require('zod')

// Matches the expanded product form (Basic Details / Weight & Pricing / Shopify Listing).
// All new fields pass through to the service; unknown keys defined here so they
// are not stripped by zod before the controller sees them.
const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().nullable().optional(),
  categoryId: z.number().int().positive('Select a category'),
  collectionId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
  barcode: z.string().regex(/^\d{12}$/).nullable().optional(),
  purity: z.number().positive().optional(),
  grossWeight: z.number().nonnegative().optional(),
  stoneWeight: z.number().nonnegative().optional(),
  netWeight: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  silverRateUsed: z.number().positive().optional(),
  makingCharge: z.number().nonnegative().optional(),
  gstPercent: z.number().min(0).max(30).optional(),
  compareAtPrice: z.number().nonnegative().nullable().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  initialStock: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  updateStock: z.boolean().optional(),
  shopifyVendor: z.string().nullable().optional(),
  shopifyProductType: z.string().nullable().optional(),
  shopifyTags: z.string().nullable().optional(),
  shopifyImageUrl: z.string().nullable().optional(),
  trackInventory: z.boolean().optional(),
  pushToShopify: z.boolean().optional(),
})

// For updates every field is optional
const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
})

module.exports = { createProductSchema, updateProductSchema }