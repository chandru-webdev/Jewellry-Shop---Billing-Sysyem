const express = require('express')
const roleController = require('../controllers/role.controller')
const { createRoleSchema, updateRoleSchema } = require('../validators/role.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.use(authenticate)

// Anyone logged in can list roles (used for the user-form dropdown).
router.get('/', roleController.list)

router.post('/', authorize('ADMIN'), validate(createRoleSchema), roleController.create)
router.put('/:id', authorize('ADMIN'), validate(updateRoleSchema), roleController.update)
router.delete('/:id', authorize('ADMIN'), roleController.remove)

module.exports = router
