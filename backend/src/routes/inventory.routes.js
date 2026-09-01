const express = require('express')
const inventoryController = require('../controllers/inventory.controller')
const { stockInSchema, stockOutSchema, stockTransferSchema } = require('../validators/inventory.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', inventoryController.list)
router.get('/transactions', inventoryController.transactions)

// Only ADMIN and MANAGER can change stock
router.post('/stock-in', authorize('SUPER_ADMIN', 'MANAGER'), validate(stockInSchema), inventoryController.stockIn)
router.post('/stock-out', authorize('SUPER_ADMIN', 'MANAGER'), validate(stockOutSchema), inventoryController.stockOut)
router.post('/stock-transfer', authorize('SUPER_ADMIN', 'MANAGER'), validate(stockTransferSchema), inventoryController.stockTransfer)

module.exports = router
