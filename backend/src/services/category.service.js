const prisma = require('../prisma/client')
const ApiError = require('../utils/ApiError')

// Slug helper: "Nose Pins" -> "nose-pins"
function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const categoryService = {
  async list() {
    return prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
  },

  async create(name, description) {
    const slug = slugify(name)
    const duplicate = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }] },
    })
    if (duplicate) throw new ApiError(400, 'A category with that name already exists')
    return prisma.category.create({ data: { name, slug, description } })
  },
}

module.exports = categoryService
