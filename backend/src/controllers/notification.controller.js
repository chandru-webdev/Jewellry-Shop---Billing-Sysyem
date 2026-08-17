const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const notificationService = require('../services/notification.service')

const notificationController = {
  list: asyncHandler(async (req, res) => {
    const result = await notificationService.list(req.user.id, req.user.role.name, req.query)
    success(res, 200, result, 'Notifications fetched')
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user.id, req.user.role.name)
    success(res, 200, { count }, 'Unread count fetched')
  }),

  markAsRead: asyncHandler(async (req, res) => {
    await notificationService.markAsRead(req.params.id, req.user.id, req.user.role.name)
    success(res, 200, null, 'Notification marked as read')
  }),

  markAllAsRead: asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.user.id, req.user.role.name)
    success(res, 200, null, 'All notifications marked as read')
  }),

  remove: asyncHandler(async (req, res) => {
    await notificationService.remove(req.params.id, req.user.id, req.user.role.name)
    success(res, 200, null, 'Notification deleted')
  }),
}

module.exports = notificationController
