const express = require('express')
const userController = require('../controllers/user.controller')
const { createUserSchema, updateUserSchema } = require('../validators/user.validator')
const validate = require('../middleware/validate')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

// Staff account management is an ADMIN-only area.
router.use(authenticate, authorize('ADMIN'))

router.get('/', userController.list)
router.get('/:id', userController.getById)
router.post('/', validate(createUserSchema), userController.create)
router.put('/:id', validate(updateUserSchema), userController.update)

module.exports = router
