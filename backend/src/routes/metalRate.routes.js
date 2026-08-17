const express = require('express')
const metalRateController = require('../controllers/metalRate.controller')
const { rateSchema } = require('../validators/metalRate.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

// Anyone logged in can view rates + history
router.get('/', metalRateController.getCurrent)
router.get('/history', metalRateController.getHistory)

// Only ADMIN can change the silver rate (it affects every price!)
router.post('/preview', validate(rateSchema), metalRateController.preview)
router.put('/silver', authorize('SUPER_ADMIN', 'MANAGER'), validate(rateSchema), metalRateController.updateSilver)

module.exports = router
