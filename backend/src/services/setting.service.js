// =============================================================
// Settings service (Phase 21)
// Business details + system configuration stored as key/value.
//   GET /api/settings          -> flat object of all settings
//   PUT /api/settings          -> update one or more (ADMIN only)
// Only keys in the WHITELIST can be read or written.
// =============================================================
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

// Everything the Settings page can store. `type` drives validation.
const SETTING_DEFS = {
  businessName: { type: 'string', default: 'OPAL LINE' },
  businessAddress: { type: 'string', default: '' },
  businessPhone: { type: 'string', default: '' },
  businessEmail: { type: 'string', default: '' },
  gstin: { type: 'string', default: '' },
  invoicePrefix: { type: 'string', default: 'INV' },
  invoiceFooter: { type: 'string', default: 'Thank you for shopping with us!' },
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

const settingService = {
  // All settings as a flat { key: value } object, with defaults for
  // anything that hasn't been saved yet.
  async getAll() {
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SETTING_DEFS) } } })
    const map = new Map(rows.map((r) => [r.key, r.value]))

    const out = {}
    for (const [key, def] of Object.entries(SETTING_DEFS)) {
      const raw = map.get(key)
      let value = raw !== undefined && raw !== null ? raw : def.default
      if (def.type === 'json' && typeof value === 'string') {
        try {
          value = JSON.parse(value)
        } catch {
          value = def.default
        }
      }
      out[key] = value
    }
    return out
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
      let parsed = value
      if (def.type === 'json') {
        if (typeof value === 'string') {
          try {
            parsed = JSON.parse(value)
          } catch {
            throw new ApiError(400, `${key} must be valid JSON`)
          }
        }
        if (!Array.isArray(parsed)) {
          throw new ApiError(400, `${key} must be an array`)
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
