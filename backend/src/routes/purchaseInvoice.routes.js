const express = require('express')
const purchaseInvoiceController = require('../controllers/purchaseInvoice.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createPurchaseInvoiceSchema, updatePurchaseInvoiceSchema, recordPaymentSchema } = require('../validators/purchaseInvoice.validator')

const router = express.Router()

router.use(authenticate)

router.get('/', purchaseInvoiceController.list)
router.get('/:id', purchaseInvoiceController.getById)
router.post(
  '/',
  authorize('SUPER_ADMIN', 'MANAGER'),
  validate(createPurchaseInvoiceSchema),
  purchaseInvoiceController.create
)
router.put(
  '/:id',
  authorize('SUPER_ADMIN', 'MANAGER'),
  validate(updatePurchaseInvoiceSchema),
  purchaseInvoiceController.update
)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'MANAGER'), purchaseInvoiceController.update)
router.post(
  '/:id/payment',
  authorize('SUPER_ADMIN', 'MANAGER'),
  validate(recordPaymentSchema),
  purchaseInvoiceController.recordPayment
)
router.post('/:id/refresh-payment', authorize('SUPER_ADMIN', 'MANAGER'), purchaseInvoiceController.refreshPaymentState)
router.delete('/:id', authorize('SUPER_ADMIN'), purchaseInvoiceController.remove)

module.exports = router