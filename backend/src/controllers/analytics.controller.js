const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const analyticsService = require('../services/analytics.service')

const analyticsController = {
  overview: asyncHandler(async (req, res) => {
    const data = await analyticsService.overview({ months: req.query.months })
    success(res, 200, data, 'Analytics overview fetched')
  }),
}

module.exports = analyticsController