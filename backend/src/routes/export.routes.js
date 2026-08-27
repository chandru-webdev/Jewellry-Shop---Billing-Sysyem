const { Router } = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const exportController = require('../controllers/export.controller')

const router = Router()

router.use(authenticate)

// GET /api/export/:type — download CSV for products/customers/orders/inventory/sales/gst
router.get('/:type', authorize('SUPER_ADMIN', 'MANAGER'), exportController.download)

module.exports = router
