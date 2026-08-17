const { z } = require('zod')

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().optional(),
  email: z.email().optional(),
  address: z.string().optional(),
})

const createSupplierSchema = supplierSchema

const updateSupplierSchema = supplierSchema.partial()

module.exports = { createSupplierSchema, updateSupplierSchema }
