const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

// Role names are stored UPPERCASE because the authorize() middleware matches
// req.user.role.name against values like "ADMIN", "MANAGER", "STAFF".
const roleService = {
  async list() {
    return prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    })
  },

  async create(data) {
    const name = data.name.trim().toUpperCase()
    const existing = await prisma.role.findUnique({ where: { name } })
    if (existing) throw new ApiError(400, 'A role with that name already exists')
    return prisma.role.create({ data: { name, description: data.description } })
  },

  async update(id, data) {
    const role = await prisma.role.findUnique({ where: { id: Number(id) } })
    if (!role) throw new ApiError(404, 'Role not found')

    const patch = {}
    if (data.name) {
      const name = data.name.trim().toUpperCase()
      if (name !== role.name && role.isSystem) {
        throw new ApiError(400, 'System roles cannot be renamed')
      }
      const existing = await prisma.role.findUnique({ where: { name } })
      if (existing && existing.id !== role.id) {
        throw new ApiError(400, 'A role with that name already exists')
      }
      patch.name = name
    }
    if (typeof data.description === 'string') {
      patch.description = data.description
    }

    return prisma.role.update({ where: { id: role.id }, data: patch })
  },

  async remove(id) {
    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: { _count: { select: { users: true } } },
    })
    if (!role) throw new ApiError(404, 'Role not found')
    if (role.isSystem) throw new ApiError(400, 'System roles cannot be deleted')
    if (role._count.users > 0) {
      throw new ApiError(400, 'Cannot delete a role that still has users')
    }
    return prisma.role.delete({ where: { id: role.id } })
  },
}

module.exports = roleService
