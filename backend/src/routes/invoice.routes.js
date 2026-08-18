const express = require('express')
const invoiceController = require('../controllers/invoice.controller')
const { createInvoiceSchema, updateInvoiceSchema } = require('../validators/invoice.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', invoiceController.list)
router.get('/:id', invoiceController.getById)

// MANAGER, STAFF and ADMIN can create invoices (billing)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'), validate(createInvoiceSchema), invoiceController.create)

// SUPER_ADMIN and MANAGER can update invoices (e.g. add customer)
router.put('/:id', authorize('SUPER_ADMIN', 'MANAGER'), validate(updateInvoiceSchema), invoiceController.update)

module.exports = router
