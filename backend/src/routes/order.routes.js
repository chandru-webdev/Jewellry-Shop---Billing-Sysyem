const express = require('express')
const orderController = require('../controllers/order.controller')
const { createOrderSchema, updateStatusSchema } = require('../validators/order.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', orderController.list)
router.get('/:id', orderController.getById)

// POS orders — anyone who can bill can create one
router.post('/', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(createOrderSchema), orderController.create)

// Status changes (cancel/fulfil/refund) are manager-level actions
router.patch('/:id/status', authorize('ADMIN', 'MANAGER'), validate(updateStatusSchema), orderController.updateStatus)

module.exports = router
