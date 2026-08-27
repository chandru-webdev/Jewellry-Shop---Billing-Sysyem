const prisma = require('../prisma/client')

const notificationService = {
  // GET /api/notifications — list for the logged-in user (or all if ADMIN)
  async list(userId, role, { unreadOnly = false, limit = 50 } = {}) {
    const where = {}

    // Non-admin users see only their own notifications
    if (role !== 'SUPER_ADMIN') {
      where.userId = userId
    }

    if (unreadOnly === 'true') {
      where.isRead = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit) || 50,
      }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ])

    return { notifications, unreadCount }
  },

  // GET /api/notifications/unread-count
  async getUnreadCount(userId, role) {
    const where = { isRead: false }
    if (role !== 'SUPER_ADMIN') {
      where.userId = userId
    }
    return prisma.notification.count({ where })
  },

  // PATCH /api/notifications/:id/read
  async markAsRead(id, userId, role) {
    const where = { id: Number(id) }
    // Non-admin can only mark their own
    if (role !== 'SUPER_ADMIN') {
      where.userId = userId
    }
    return prisma.notification.updateMany({
      where,
      data: { isRead: true },
    })
  },

  // PATCH /api/notifications/read-all
  async markAllAsRead(userId, role) {
    const where = { isRead: false }
    if (role !== 'SUPER_ADMIN') {
      where.userId = userId
    }
    return prisma.notification.updateMany({
      where,
      data: { isRead: true },
    })
  },

  // DELETE /api/notifications/:id
  async remove(id, userId, role) {
    const where = { id: Number(id) }
    if (role !== 'SUPER_ADMIN') {
      where.userId = userId
    }
    return prisma.notification.deleteMany({ where })
  },

  // Internal helper — called by other services when business events occur
  async create({ userId, type, title, message }) {
    return prisma.notification.create({
      data: { userId, type, title, message },
    })
  },

  // Create notifications for all users with a given role (or all users if no role specified)
  async createForAll({ type, title, message, excludeUserId = null }) {
    const users = await prisma.user.findMany({
      where: { isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true },
    })
    if (users.length === 0) return

    return prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type,
        title,
        message,
      })),
    })
  },
}

module.exports = notificationService
