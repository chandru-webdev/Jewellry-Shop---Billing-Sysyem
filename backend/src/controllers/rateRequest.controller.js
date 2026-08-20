const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const rateRequestService = require('../services/rateRequest.service')

const rateRequestController = {
  // POST /api/rate-requests
  createRequest: asyncHandler(async (req, res) => {
    const result = await rateRequestService.createRequest({
      newRate: req.body.rate,
      userId: req.user.id,
    })
    success(res, 201, result, 'Rate change request submitted for approval')
  }),

  // GET /api/rate-requests
  listRequests: asyncHandler(async (req, res) => {
    const result = await rateRequestService.listRequests(req.query.status)
    success(res, 200, result, 'Rate requests fetched')
  }),

  // GET /api/rate-requests/:id
  getRequest: asyncHandler(async (req, res) => {
    const result = await rateRequestService.getRequestById(Number(req.params.id))
    if (!result) return success(res, 404, null, 'Request not found')
    success(res, 200, result, 'Request fetched')
  }),

  // PATCH /api/rate-requests/:id/review
  reviewRequest: asyncHandler(async (req, res) => {
    const result = await rateRequestService.reviewRequest({
      requestId: Number(req.params.id),
      status: req.body.status,
      userId: req.user.id,
    })
    success(res, 200, result, req.body.status === 'APPROVED' ? 'Request approved and rate updated' : 'Request rejected')
  }),
}

module.exports = rateRequestController