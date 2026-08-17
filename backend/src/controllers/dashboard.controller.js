const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const dashboardService = require('../services/dashboard.service')

const dashboardController = {
  getStats: asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats({
      filter: req.query.filter,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    })
    success(res, 200, stats, 'Dashboard stats fetched')
  }),
}

module.exports = dashboardController
