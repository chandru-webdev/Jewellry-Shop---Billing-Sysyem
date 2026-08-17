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
      out[key] = raw !== undefined && raw !== null ? raw : def.default
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

    const updated = {}
    await prisma.$transaction([
      ...entries.map(([key, value]) =>
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
          metadata: { keys: entries.map(([k]) => k) },
        },
      }),
    ])

    for (const [key, value] of entries) {
      updated[key] = value
    }
    return updated
  },
}

module.exports = settingService
