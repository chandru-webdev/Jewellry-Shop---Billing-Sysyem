const express = require('express')
const productPriceHistoryController = require('../controllers/productPriceHistory.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createPriceHistorySchema } = require('../validators/productPriceHistory.validator')

const router = express.Router()

router.use(authenticate)

router.get('/stats', productPriceHistoryController.getStats)
router.get('/', productPriceHistoryController.list)
router.get('/product/:productId', productPriceHistoryController.getByProduct)
router.get('/:id', productPriceHistoryController.getById)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), validate(createPriceHistorySchema), productPriceHistoryController.create)

module.exports = router
