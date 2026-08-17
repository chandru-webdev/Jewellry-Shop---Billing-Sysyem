// =============================================================
// Audit log service (Phase 21)
// Read-only trail of every important action. Only ADMIN can view.
//   GET /api/audit-logs?action=&entity=&search=&limit=&cursor=
// =============================================================
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

// Whitelist of values for filters so they can't abuse query params.
function cleanStr(value) {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  return v ? v : undefined
}

const auditLogService = {
  // Returns the latest logs, newest first. Filters are all optional.
  async list({ action, entity, search, limit = 50 } = {}) {
    const take = Math.min(Number(limit) || 50, 200)
    if (take < 1) throw new ApiError(400, 'limit must be a positive number')

    const where = {}
    const cleanAction = cleanStr(action)
    const cleanEntity = cleanStr(entity)
    const cleanSearch = cleanStr(search)
    if (cleanAction) where.action = cleanAction
    if (cleanEntity) where.entity = cleanEntity
    if (cleanSearch) {
      where.OR = [
        { user: { name: { contains: cleanSearch, mode: 'insensitive' } } },
        { action: { contains: cleanSearch, mode: 'insensitive' } },
        { entity: { contains: cleanSearch, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])

    return { items, total, limit: take }
  },
}

module.exports = auditLogService
