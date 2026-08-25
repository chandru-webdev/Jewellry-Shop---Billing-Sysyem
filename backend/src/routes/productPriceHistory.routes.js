const express = require('express')
const productPriceHistoryController = require('../controllers/productPriceHistory.controller')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/stats', productPriceHistoryController.getStats)
router.get('/', productPriceHistoryController.list)
router.get('/product/:productId', productPriceHistoryController.getByProduct)
router.get('/:id', productPriceHistoryController.getById)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), productPriceHistoryController.create)

module.exports = router
