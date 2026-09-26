const asyncHandler = require('../utils/asyncHandler')
const { success, failure } = require('../utils/ApiResponse')
const systemHealthService = require('../services/systemHealth.service')

const systemHealthController = {
  // GET /api/system-health — run all seven checks
  all: asyncHandler(async (req, res) => {
    const result = await systemHealthService.getAllChecks()
    success(res, 200, result, 'System health fetched')
  }),

  // GET /api/system-health/:key — re-run one check (frontend per-tile Recheck)
  one: asyncHandler(async (req, res) => {
    const check = await systemHealthService.getOneCheck(req.params.key)
    if (!check) return failure(res, 404, `Unknown check key "${req.params.key}"`)
    success(res, 200, check, 'Check re-run')
  }),
}

module.exports = systemHealthController