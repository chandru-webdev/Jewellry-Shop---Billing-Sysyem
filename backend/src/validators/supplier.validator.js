const { z } = require('zod')

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  isActive: z.boolean().optional(),
})

const createSupplierSchema = supplierSchema

const updateSupplierSchema = supplierSchema.partial()

module.exports = { createSupplierSchema, updateSupplierSchema }
