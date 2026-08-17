const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const categoryService = require('../services/category.service')

const categoryController = {
  list: asyncHandler(async (req, res) => {
    const categories = await categoryService.list()
    success(res, 200, categories, 'Categories fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const category = await categoryService.create(req.body.name, req.body.description)
    success(res, 201, category, 'Category created')
  }),
}

module.exports = categoryController
