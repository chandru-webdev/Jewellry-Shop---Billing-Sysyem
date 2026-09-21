const express = require('express')
const uploadController = require('../controllers/upload.controller')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.post('/media', authenticate, authorize('SUPER_ADMIN', 'MANAGER', 'EMPLOYEE'), uploadController.uploadMedia)

module.exports = router