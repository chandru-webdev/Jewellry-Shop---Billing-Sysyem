const prisma = require('../prisma/client')

const notificationService = {
  // GET /api/notifications — notifications for the logged-in user only.
  // Broadcast events (createForAll) fan out one row per user, so scoping by
  // userId means each event appears exactly once instead of once per user.
  async list(userId, role, { unreadOnly = false, limit = 50 } = {}) {
    const where = { userId }

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
    return prisma.notification.count({ where: { userId, isRead: false } })
  },

  // PATCH /api/notifications/:id/read
  async markAsRead(id, userId, role) {
    return prisma.notification.updateMany({
      where: { id: Number(id), userId },
      data: { isRead: true },
    })
  },

  // PATCH /api/notifications/read-all
  async markAllAsRead(userId, role) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  },

  // DELETE /api/notifications/:id
  async remove(id, userId, role) {
    return prisma.notification.deleteMany({ where: { id: Number(id), userId } })
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
