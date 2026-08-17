const express = require('express')
const reportController = require('../controllers/report.controller')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// Reports are read-only — any logged-in user can view them.
router.use(authenticate)

router.get('/sales', reportController.sales)
router.get('/inventory', reportController.inventory)
router.get('/products', reportController.products)

module.exports = router
