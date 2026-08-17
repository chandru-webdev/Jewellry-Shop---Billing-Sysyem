const express = require('express')
const settingController = require('../controllers/setting.controller')
const { updateSettingsSchema } = require('../validators/setting.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

// Any logged-in user can READ settings (invoice prefix is needed at billing time).
router.get('/', settingController.getAll)

// Only ADMIN can change business details / configuration.
router.put('/', authorize('ADMIN'), validate(updateSettingsSchema), settingController.update)

module.exports = router
