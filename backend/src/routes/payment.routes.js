const express = require('express')
const paymentController = require('../controllers/payment.controller')
const { createPaymentSchema } = require('../validators/payment.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', paymentController.list)
router.get('/dues', paymentController.dues)
router.get('/summary', paymentController.summary)
router.get('/:id', paymentController.getById)

// Recording a payment is a sales action — any staff member can do it.
router.post('/', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(createPaymentSchema), paymentController.create)

module.exports = router
