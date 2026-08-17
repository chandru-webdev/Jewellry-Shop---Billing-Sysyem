const express = require('express')
const dashboardController = require('../controllers/dashboard.controller')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// Every dashboard endpoint is read-only and needs a logged-in user.
router.use(authenticate)

// GET /api/dashboard — all overview stats in one call
router.get('/', dashboardController.getStats)

module.exports = router
