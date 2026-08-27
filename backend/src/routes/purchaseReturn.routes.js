const express = require('express')
const purchaseReturnController = require('../controllers/purchaseReturn.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createPurchaseReturnSchema, updatePurchaseReturnStatusSchema } = require('../validators/purchaseReturn.validator')

const router = express.Router()

router.use(authenticate)

router.get('/', purchaseReturnController.list)
router.get('/:id', purchaseReturnController.getById)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), validate(createPurchaseReturnSchema), purchaseReturnController.create)
router.patch('/:id/status', authorize('SUPER_ADMIN', 'MANAGER'), validate(updatePurchaseReturnStatusSchema), purchaseReturnController.updateStatus)
router.delete('/:id', authorize('SUPER_ADMIN'), purchaseReturnController.remove)

module.exports = router
