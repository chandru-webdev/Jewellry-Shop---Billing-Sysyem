const express = require('express')
const auditLogController = require('../controllers/auditLog.controller')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

// Audit logs expose who did what — only ADMIN may view them.
router.use(authenticate, authorize('SUPER_ADMIN'))

router.get('/', auditLogController.list)

module.exports = router
