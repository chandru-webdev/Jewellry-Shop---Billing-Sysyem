const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const dashboardService = require('../services/dashboard.service')

const dashboardController = {
  getStats: asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats()
    success(res, 200, stats, 'Dashboard stats fetched')
  }),
}

module.exports = dashboardController
