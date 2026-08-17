const express = require('express')
const productController = require('../controllers/product.controller')
const { createProductSchema, updateProductSchema } = require('../validators/product.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

// All product routes require login. MANAGER and ADMIN can write.
router.use(authenticate)

router.get('/', productController.list)
router.get('/:id', productController.getById)

router.post('/', authorize('ADMIN', 'MANAGER'), validate(createProductSchema), productController.create)
router.put('/:id', authorize('ADMIN', 'MANAGER'), validate(updateProductSchema), productController.update)
router.delete('/:id', authorize('ADMIN', 'MANAGER'), productController.remove)

module.exports = router
