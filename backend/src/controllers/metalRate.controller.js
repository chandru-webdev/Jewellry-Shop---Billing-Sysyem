const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const metalRateService = require('../services/metalRate.service')

const metalRateController = {
  // GET /api/metal-rates
  getCurrent: asyncHandler(async (req, res) => {
    const rate = await metalRateService.getCurrent()
    success(res, 200, rate, 'Silver rate fetched')
  }),

  // GET /api/metal-rates/history
  getHistory: asyncHandler(async (req, res) => {
    const history = await metalRateService.getHistory(req.query.limit)
    success(res, 200, history, 'Rate history fetched')
  }),

  // POST /api/metal-rates/preview
  preview: asyncHandler(async (req, res) => {
    const result = await metalRateService.preview(req.body.rate)
    success(res, 200, result, 'Preview ready')
  }),

  // PUT /api/metal-rates/silver
  updateSilver: asyncHandler(async (req, res) => {
    const result = await metalRateService.updateSilver(req.body.rate, req.user.id)
    success(res, 200, result, 'Silver rate updated and prices recalculated')
  }),
}

module.exports = metalRateController
