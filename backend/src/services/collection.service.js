const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

const collectionService = {
  async list() {
    return prisma.collection.findMany({ orderBy: { name: 'asc' } })
  },

  async create(data) {
    const exists = await prisma.collection.findUnique({ where: { name: data.name } })
    if (exists) throw new ApiError(400, `Collection "${data.name}" already exists`)
    return prisma.collection.create({
      data: { name: data.name, description: data.description || null },
    })
  },
}

module.exports = collectionService