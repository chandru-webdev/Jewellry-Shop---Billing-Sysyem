const { z } = require('zod')

// Settings values are free-form strings. Any subset of keys is allowed.
const updateSettingsSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name cannot be empty').max(120).optional(),
    businessAddress: z.string().trim().max(500).optional(),
    businessPhone: z.string().trim().max(30).optional(),
    businessEmail: z.string().trim().email('Enter a valid email').max(120).optional(),
    gstin: z.string().trim().max(20).optional(),
    invoicePrefix: z
      .string()
      .trim()
      .min(1, 'Invoice prefix cannot be empty')
      .max(20)
      .regex(/^[A-Za-z0-9-]+$/, 'Prefix can only contain letters, numbers and hyphens')
      .optional(),
    invoiceFooter: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one setting to update',
  })

module.exports = { updateSettingsSchema }
