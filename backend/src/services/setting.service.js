// =============================================================
// Settings service (Phase 21)
// Business details + system configuration stored as key/value.
//   GET /api/settings          -> flat object of all settings
//   PUT /api/settings          -> update one or more (ADMIN only)
// Only keys in the WHITELIST can be read or written.
// =============================================================
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')
const { credentials } = require('../integrations/shopify/shopifyConfig')

// Everything the Settings page can store. `type` drives validation.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

const SETTING_DEFS = {
  businessName: { type: 'string', default: 'OPAL LINE' },
  businessAddress: { type: 'string', default: '' },
  businessPhone: { type: 'string', default: '' },
  businessEmail: { type: 'string', default: '' },
  gstin: { type: 'string', default: '', validate: (v) => !v || GSTIN_REGEX.test(v) || 'GSTIN must be 15 characters: 2-digit state code + PAN + entity + Z + check digit' },
  pan: { type: 'string', default: '', validate: (v) => !v || PAN_REGEX.test(v) || 'PAN must be 10 characters: 5 letters + 4 digits + 1 letter' },
  // Data-URL of the business logo (resized client-side before upload).
  businessLogo: { type: 'string', default: '' },
  businessHours: { type: 'string', default: '' },
  invoicePrefix: { type: 'string', default: 'INV-' },
  invoiceNumberDigits: { type: 'number', default: 4 },
  // Shown on the print/PDF invoice header: payment terms, footer note, terms & conditions.
  paymentTerms: { type: 'string', default: 'Due on Receipt' },
  invoiceFooter: { type: 'string', default: 'Thank you for shopping with us!' },
  invoiceTerms: { type: 'string', default: '' },
  currency: { type: 'string', default: 'INR' },
  // True = quoted prices already include GST (the current formula). False would
  // mean items are priced pre-GST and GST is added at checkout.
  taxInclusive: { type: 'boolean', default: true },
  // Global fallback for LOW_STOCK notifications when a product has no per-item threshold.
  lowStockThresholdDefault: { type: 'number', default: 5 },
  invoiceNotificationsEnabled: { type: 'boolean', default: true },
  orderNotificationsEnabled: { type: 'boolean', default: true },
  lowStockNotificationsEnabled: { type: 'boolean', default: true },
  // Idle minutes after which the app logs the user out. 0 = never.
  sessionTimeoutMinutes: { type: 'number', default: 0 },
  // JSON configs used by the Pricing Rules and Tax/HSN settings pages.
  pricingRules: {
    type: 'json',
    default: [
      { id: 1, name: 'Silver Making Charge %', type: '%', value: 15, description: 'Percentage of silver rate added as making charge' },
      { id: 2, name: 'Gold Making Charge %', type: '%', value: 12, description: 'Percentage of gold rate added as making charge' },
      { id: 3, name: 'Diamond Making Charge (Fixed)', type: 'fixed', value: 500, description: 'Fixed amount for diamond studded jewellery' },
      { id: 4, name: 'Gemstone Making Charge', type: 'fixed', value: 300, description: 'Per stone making charge' },
      { id: 5, name: 'Minimum Making Charge', type: 'fixed', value: 100, description: 'Minimum charge per invoice' },
      { id: 6, name: 'GST on Making Charge', type: '%', value: 3, description: 'GST percentage applicable on making charge' },
    ],
  },
  hsnCodes: {
    type: 'json',
    default: [
      { id: 1, hsnCode: '7113', description: 'Silver jewellery articles', gstRate: 3, category: 'Silver', isActive: true },
      { id: 2, hsnCode: '7101', description: 'Pearls, natural or cultured', gstRate: 3, category: 'Pearls', isActive: true },
      { id: 3, hsnCode: '7117', description: 'Imitation jewellery', gstRate: 3, category: 'Imitation', isActive: true },
      { id: 4, hsnCode: '7106', description: 'Silver unwrought', gstRate: 3, category: 'Silver Raw', isActive: true },
      { id: 5, hsnCode: '7108', description: 'Gold unwrought', gstRate: 3, category: 'Gold Raw', isActive: true },
      { id: 6, hsnCode: '7116', description: 'Articles of precious metal', gstRate: 3, category: 'Precious Metal', isActive: true },
      { id: 7, hsnCode: '7118', description: 'Coins', gstRate: 3, category: 'Coins', isActive: true },
    ],
  },
  taxSlabs: {
    type: 'json',
    default: [
      { id: 1, name: '0%', rate: 0, items: 'Jewellery boxes, polishing charges, cleaning services' },
      { id: 2, name: '3%', rate: 3, items: 'Bangles, Chains, Earrings, Rings (up to 22 carat), Pendants' },
      { id: 3, name: '5%', rate: 5, items: 'Necklaces (gold), Premium gold articles' },
    ],
  },
}

// Apply a setting's type coercion + default for any incoming/stored value.
function coerce(def, raw) {
  const value = raw !== undefined && raw !== null ? raw : def.default
  if (def.type === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1'
  }
  if (def.type === 'number') {
    const n = Number(value)
    return Number.isFinite(n) ? n : def.default
  }
  if (def.type === 'json') {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        return def.default
      }
    }
    return value
  }
  return value
}

const settingService = {
  // All settings as a flat { key: value } object, with defaults for
  // anything that hasn't been saved yet.
  async getAll() {
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SETTING_DEFS) } } })
    const map = new Map(rows.map((r) => [r.key, r.value]))

    const out = {}
    for (const [key, def] of Object.entries(SETTING_DEFS)) {
      out[key] = coerce(def, map.has(key) ? map.get(key) : undefined)
    }
    return out
  },

  // Read a single setting, applying its default and type coercion.
  // Used by services (invoice numbering, low-stock alerts, ...) without a
  // full settings round-trip.
  async getValue(key) {
    const def = SETTING_DEFS[key]
    const row = await prisma.setting.findUnique({ where: { key }, select: { value: true } })
    return coerce(def, row?.value)
  },

  async getIntegrationStatus() {
    const { shopDomain, accessToken, source } = await credentials()
    return {
      shopify: {
        configured: Boolean(shopDomain && accessToken),
        shopDomain: shopDomain || null,
        source: source || null, // 'db' = app-configured, 'env' = server vars
      },
      smtp: {
        configured: Boolean(process.env.SMTP_HOST),
        host: process.env.SMTP_HOST || null,
      },
      paymentGateway: {
        connected: false,
        provider: null, // Razorpay integration not built yet
      },
    }
  },

  // PUT /api/settings — upsert the supplied whitelisted keys.
  // Unknown keys are ignored (never silently persisted).
  async update(data, userId) {
    const entries = Object.entries(data).filter(([key]) => SETTING_DEFS[key])
    if (entries.length === 0) {
      throw new ApiError(400, 'No valid settings provided')
    }

    const normalized = entries.map(([key, value]) => {
      const def = SETTING_DEFS[key]
      let parsed = coerce(def, value)
      if (def.type === 'boolean' && parsed !== true && parsed !== false) {
        throw new ApiError(400, `${key} must be a boolean`)
      }
      if (def.type === 'number' && (Number.isNaN(parsed) || typeof parsed !== 'number')) {
        throw new ApiError(400, `${key} must be a number`)
      }
      if (def.type === 'json') {
        if (!Array.isArray(parsed)) {
          throw new ApiError(400, `${key} must be an array`)
        }
      }
      if (def.validate) {
        const error = def.validate(parsed)
        if (error !== true && error) {
          throw new ApiError(400, error)
        }
      }
      return [key, parsed]
    })

    const updated = {}
    await prisma.$transaction([
      ...normalized.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      ),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'SETTINGS_UPDATED',
          entity: 'Setting',
          metadata: { keys: normalized.map(([k]) => k) },
        },
      }),
    ])

    for (const [key, value] of normalized) {
      updated[key] = value
    }
    return updated
  },
}

module.exports = settingService
