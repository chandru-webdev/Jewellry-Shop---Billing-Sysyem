const bcrypt = require('bcryptjs')
const crypto = require('crypto')
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

    // Use provided password or generate a temporary one
    const tempPassword = data.password || this.generatePassword()
    const hashed = await bcrypt.hash(tempPassword, 10)
    const mustChange = !data.password // Force password change if no password provided

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        password: hashed,
        role: { connect: { id: role.id } },
        mustChangePassword: mustChange,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_CREATED',
        entity: 'User',
        entityId: user.id,
        metadata: { email, role: role.name },
      },
    })

    return { user: this.safeUser(await this.getById(user.id)), tempPassword: mustChange ? tempPassword : null }
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
      patch.role = { connect: { id: role.id } }
    }

    if (typeof data.isActive === 'boolean') {
      if (data.isActive === false && Number(id) === Number(actorId)) {
        throw new ApiError(400, 'You cannot disable your own account')
      }
      patch.isActive = data.isActive
    }

    if (data.customPermissions !== undefined) {
      patch.customPermissions = data.customPermissions
    }

    if (Object.keys(patch).length === 0) {
      throw new ApiError(400, 'No fields to update')
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

  // Admin resets a user's password — generates a new temporary password
  async resetPassword(id, actorId) {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } })
    if (!user) throw new ApiError(404, 'User not found')

    const tempPassword = this.generatePassword()
    const hashed = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_PASSWORD_RESET',
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email },
      },
    })

    return { tempPassword, email: user.email }
  },

  // Admin sets a specific password for a user
  async setPassword(id, newPassword, actorId) {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } })
    if (!user) throw new ApiError(404, 'User not found')

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false },
    })

    await prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_PASSWORD_SET',
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email },
      },
    })

    return { message: 'Password updated successfully' }
  },

  generatePassword() {
    return 'Temp' + crypto.randomBytes(4).toString('hex') + '!'
  },

  safeUser(user) {
    const { password, ...safe } = user
    return safe
  },
}

module.exports = userService
