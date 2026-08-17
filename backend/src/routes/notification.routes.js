const express = require('express')
const notificationController = require('../controllers/notification.controller')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

router.get('/', notificationController.list)
router.get('/unread-count', notificationController.getUnreadCount)
router.patch('/read-all', notificationController.markAllAsRead)
router.patch('/:id/read', notificationController.markAsRead)
router.delete('/:id', notificationController.remove)

module.exports = router
