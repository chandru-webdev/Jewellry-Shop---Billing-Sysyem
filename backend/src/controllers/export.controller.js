const asyncHandler = require('../utils/asyncHandler')
const exportService = require('../services/export.service')

const ALLOWED_TYPES = ['products', 'customers', 'orders', 'inventory', 'sales', 'gst']

const exportController = {
  download: asyncHandler(async (req, res) => {
    const type = (req.params.type || '').toLowerCase()
    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid export type. Allowed: ' + ALLOWED_TYPES.join(', ') })
    }
    const result = await exportService[type]()
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`)
    return res.send(result.csv)
  }),
}

module.exports = exportController
