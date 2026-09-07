const express = require('express')
const analyticsController = require('../controllers/analytics.controller')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// Analytics is read-only and needs a logged-in user.
router.use(authenticate)

// GET /api/analytics/overview — all four dashboard widgets in one call
router.get('/overview', analyticsController.overview)

module.exports = router