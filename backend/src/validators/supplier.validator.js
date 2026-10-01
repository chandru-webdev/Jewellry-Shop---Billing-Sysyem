const { z } = require('zod')

// Optional fields arrive from the forms as '' when a user clears them.
// Left as-is, '' fails the email format check and Prisma would store empty
// strings instead of NULL, so normalise blanks to null first.
const blankToNull = (schema) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema.nullable().optional())

const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: blankToNull(z.string()),
  phone: blankToNull(z.string()),
  email: blankToNull(z.string().email()),
  address: blankToNull(z.string()),
  gstin: blankToNull(z.string()),
  isActive: z.boolean().optional(),
})

const createSupplierSchema = supplierSchema

const updateSupplierSchema = supplierSchema.partial()

module.exports = { createSupplierSchema, updateSupplierSchema }