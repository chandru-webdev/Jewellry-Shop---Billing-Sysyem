const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const collectionService = require('../services/collection.service')

const collectionController = {
  list: asyncHandler(async (req, res) => {
    const collections = await collectionService.list()
    success(res, 200, collections, 'Collections fetched')
  }),

  create: asyncHandler(async (req, res) => {
    const collection = await collectionService.create(req.body)
    success(res, 201, collection, 'Collection created')
  }),
}

module.exports = collectionController