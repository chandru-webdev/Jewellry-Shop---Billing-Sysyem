const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const settingService = require('../services/setting.service')

const settingController = {
  // GET /api/settings
  getAll: asyncHandler(async (req, res) => {
    const data = await settingService.getAll()
    success(res, 200, data, 'Settings fetched')
  }),

  // PUT /api/settings
  update: asyncHandler(async (req, res) => {
    const data = await settingService.update(req.body, req.user.id)
    success(res, 200, data, 'Settings updated')
  }),
}

module.exports = settingController
