const express = require('express')
const rateRequestController = require('../controllers/rateRequest.controller')
const { authenticate, authorize } = require('../middleware/auth')
const { rateRequestSchema, reviewSchema } = require('../validators/rateRequest.validator')
const validate = require('../middleware/validate')

const router = express.Router()
router.use(authenticate)

// Manager: submit a rate change request
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), validate(rateRequestSchema), rateRequestController.createRequest)

// Admin: list all requests (with optional status filter)
router.get('/', authorize('SUPER_ADMIN'), rateRequestController.listRequests)

// Admin: get single request
router.get('/:id', authorize('SUPER_ADMIN'), rateRequestController.getRequest)

// Admin: approve/reject a request
router.patch('/:id/review', authorize('SUPER_ADMIN'), validate(reviewSchema), rateRequestController.reviewRequest)

module.exports = router