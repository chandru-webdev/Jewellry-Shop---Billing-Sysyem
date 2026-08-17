const express = require('express')
const customerController = require('../controllers/customer.controller')
const { createCustomerSchema, updateCustomerSchema } = require('../validators/customer.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', customerController.list)
router.get('/:id', customerController.getById)
router.post('/', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(createCustomerSchema), customerController.create)
router.put('/:id', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(updateCustomerSchema), customerController.update)

module.exports = router
