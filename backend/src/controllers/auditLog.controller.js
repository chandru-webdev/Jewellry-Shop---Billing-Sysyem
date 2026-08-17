const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const auditLogService = require('../services/auditLog.service')

const auditLogController = {
  // GET /api/audit-logs?action=&entity=&search=&limit=
  list: asyncHandler(async (req, res) => {
    const data = await auditLogService.list(req.query)
    success(res, 200, data, 'Audit logs fetched')
  }),
}

module.exports = auditLogController
