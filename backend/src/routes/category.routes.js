const express = require('express')
const categoryController = require('../controllers/category.controller')
const { createCategorySchema } = require('../validators/category.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', categoryController.list)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), validate(createCategorySchema), categoryController.create)

module.exports = router
