const express = require('express')

const router = express.Router()

// Every API group is mounted here under /api.
// Future phases add their own: products, inventory, metal-rates...
router.use('/health', require('./health.routes'))
router.use('/auth', require('./auth.routes'))
router.use('/products', require('./product.routes'))
router.use('/categories', require('./category.routes'))
router.use('/inventory', require('./inventory.routes'))
router.use('/metal-rates', require('./metalRate.routes'))
router.use('/invoices', require('./invoice.routes'))
router.use('/customers', require('./customer.routes'))
router.use('/orders', require('./order.routes'))
router.use('/dashboard', require('./dashboard.routes'))
router.use('/suppliers', require('./supplier.routes'))
router.use('/payments', require('./payment.routes'))
router.use('/users', require('./user.routes'))
router.use('/roles', require('./role.routes'))
router.use('/shopify', require('./shopify.routes'))
router.use('/reports', require('./report.routes'))
router.use('/audit-logs', require('./auditLog.routes'))
router.use('/settings', require('./setting.routes'))
router.use('/notifications', require('./notification.routes'))
router.use('/search', require('./search.routes'))

module.exports = router
