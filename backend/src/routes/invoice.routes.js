const express = require('express')
const invoiceController = require('../controllers/invoice.controller')
const { createInvoiceSchema } = require('../validators/invoice.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', invoiceController.list)
router.get('/:id', invoiceController.getById)

// MANAGER, STAFF and ADMIN can create invoices (billing)
router.post('/', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(createInvoiceSchema), invoiceController.create)

module.exports = router
