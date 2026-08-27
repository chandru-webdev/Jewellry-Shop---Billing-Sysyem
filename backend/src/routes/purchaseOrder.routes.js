const express = require('express')
const purchaseOrderController = require('../controllers/purchaseOrder.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createPurchaseOrderSchema, updatePurchaseOrderStatusSchema } = require('../validators/purchaseOrder.validator')

const router = express.Router()

router.use(authenticate)

router.get('/', purchaseOrderController.list)
router.get('/:id', purchaseOrderController.getById)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), validate(createPurchaseOrderSchema), purchaseOrderController.create)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'MANAGER'), validate(updatePurchaseOrderStatusSchema), purchaseOrderController.updateStatus)
router.delete('/:id', authorize('SUPER_ADMIN'), purchaseOrderController.remove)

module.exports = router
