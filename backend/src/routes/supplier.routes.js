const express = require('express')
const supplierController = require('../controllers/supplier.controller')
const { createSupplierSchema, updateSupplierSchema } = require('../validators/supplier.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', supplierController.list)
router.get('/:id', supplierController.getById)
router.post('/', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(createSupplierSchema), supplierController.create)
router.put('/:id', authorize('ADMIN', 'MANAGER', 'STAFF'), validate(updateSupplierSchema), supplierController.update)

module.exports = router
