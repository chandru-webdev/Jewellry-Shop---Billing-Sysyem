const express = require('express')
const systemHealthController = require('../controllers/systemHealth.controller')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// Every health check needs an authenticated admin session.
router.use(authenticate)

router.get('/', systemHealthController.all)
router.get('/:key', systemHealthController.one)

module.exports = router