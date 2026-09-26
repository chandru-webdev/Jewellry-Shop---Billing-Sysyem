const { z } = require('zod')

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

// Settings values are mostly free-form. Any subset of keys is allowed; Zod
// strips keys it doesn't know, so this list MUST stay in sync with the
// SETTING_DEFS whitelist in setting.service.js.
const updateSettingsSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name cannot be empty').max(120).optional(),
    businessAddress: z.string().trim().max(500).optional(),
    businessPhone: z.string().trim().max(30).optional(),
    businessEmail: z.string().trim().email('Enter a valid email').max(120).optional(),
    gstin: z.string().trim().max(20).refine((v) => !v || GSTIN_REGEX.test(v), {
      message: 'GSTIN must be 15 characters: 2-digit state code + PAN + entity + Z + check digit',
    }).optional(),
    pan: z.string().trim().max(20).refine((v) => !v || PAN_REGEX.test(v), {
      message: 'PAN must be 10 characters: 5 letters + 4 digits + 1 letter',
    }).optional(),
    businessLogo: z.string().max(500000).optional(),
    businessHours: z.string().trim().max(200).optional(),
    invoicePrefix: z
      .string()
      .trim()
      .min(1, 'Invoice prefix cannot be empty')
      .max(20)
      .regex(/^[A-Za-z0-9-]+$/, 'Prefix can only contain letters, numbers and hyphens')
      .optional(),
    invoiceNumberDigits: z.coerce.number().int().min(2).max(6).optional(),
    paymentTerms: z.string().trim().max(120).optional(),
    invoiceFooter: z.string().trim().max(500).optional(),
    invoiceTerms: z.string().trim().max(2000).optional(),
    currency: z.string().trim().max(12).optional(),
    taxInclusive: z.boolean().optional(),
    lowStockThresholdDefault: z.coerce.number().min(0).max(100000).optional(),
    invoiceNotificationsEnabled: z.boolean().optional(),
    orderNotificationsEnabled: z.boolean().optional(),
    lowStockNotificationsEnabled: z.boolean().optional(),
    sessionTimeoutMinutes: z.coerce.number().int().min(0).max(10080).optional(),
    // JSON configs owned by the Pricing Rules and Tax/HSN settings pages.
    pricingRules: z.array(z.record(z.string(), z.unknown())).optional(),
    hsnCodes: z.array(z.record(z.string(), z.unknown())).optional(),
    taxSlabs: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one setting to update',
  })

module.exports = { updateSettingsSchema }