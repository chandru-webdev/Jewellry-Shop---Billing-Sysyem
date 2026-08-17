const bcrypt = require('bcryptjs')
const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const userService = {
  async list({ search, roleId, isActive, limit = 50 } = {}) {
    const where = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (roleId) where.roleId = Number(roleId)
    if (isActive !== undefined) where.isActive = isActive === 'true'

    const users = await prisma.user.findMany({
      where,
      include: { role: true, _count: { select: { invoices: true } } },
      orderBy: { name: 'asc' },
      take: Number(limit),
    })
    return users.map((u) => this.safeUser(u))
  },

  async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { role: true },
    })
    if (!user) throw new ApiError(404, 'User not found')
    return this.safeUser(user)
  },

  async create(data, actorId) {
    const email = data.email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new ApiError(400, 'A user with that email already exists')

    const role = await prisma.role.findUnique({ where: { id: Number(data.roleId) } })
    if (!role) throw new ApiError(400, 'Role not found')

    const password = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: { name: data.name, email, password, roleId: role.id },
    })

    await prisma.auditLog.create({
      data: { userId: actorId, action: 'USER_CREATED', entity: 'User', entityId: user.id },
    })

    return this.getById(user.id)
  },

  async update(id, data, actorId) {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } })
    if (!user) throw new ApiError(404, 'User not found')

    const patch = {}
    if (data.name) patch.name = data.name

    if (data.email) {
      const email = data.email.toLowerCase().trim()
      if (email !== user.email) {
        const taken = await prisma.user.findUnique({ where: { email } })
        if (taken) throw new ApiError(400, 'A user with that email already exists')
        patch.email = email
      }
    }

    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: Number(data.roleId) } })
      if (!role) throw new ApiError(400, 'Role not found')
      patch.roleId = role.id
    }

    if (data.password) {
      patch.password = await bcrypt.hash(data.password, 10)
    }

    if (typeof data.isActive === 'boolean') {
      if (data.isActive === false && Number(id) === Number(actorId)) {
        throw new ApiError(400, 'You cannot disable your own account')
      }
      patch.isActive = data.isActive
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: patch })

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_UPDATED',
        entity: 'User',
        entityId: user.id,
        metadata: { fields: Object.keys(patch) },
      },
    })

    return this.getById(updated.id)
  },

  safeUser(user) {
    const { password, ...safe } = user
    return safe
  },
}

module.exports = userService
