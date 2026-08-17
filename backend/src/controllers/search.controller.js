const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const searchService = require('../services/search.service')

const searchController = {
  search: asyncHandler(async (req, res) => {
    const results = await searchService.search(req.query.q, req.user.role.name)
    success(res, 200, results, 'Search results fetched')
  }),
}

module.exports = searchController
