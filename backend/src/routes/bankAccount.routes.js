const express = require('express')
const bankAccountController = require('../controllers/bankAccount.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createBankAccountSchema, updateBankAccountSchema } = require('../validators/bankAccount.validator')

const router = express.Router()

router.use(authenticate)

router.get('/summary', bankAccountController.summary)
router.get('/', bankAccountController.list)
router.get('/:id', bankAccountController.getById)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), validate(createBankAccountSchema), bankAccountController.create)
router.put('/:id', authorize('SUPER_ADMIN', 'MANAGER'), validate(updateBankAccountSchema), bankAccountController.update)
router.delete('/:id', authorize('SUPER_ADMIN'), bankAccountController.remove)

module.exports = router
