const express = require('express')
const expenseController = require('../controllers/expense.controller')
const { authenticate, authorize } = require('../middleware/auth')
const validate = require('../middleware/validate')
const { createExpenseSchema, updateExpenseSchema } = require('../validators/expense.validator')

const router = express.Router()

router.use(authenticate)

router.get('/categories', expenseController.categories)
router.get('/summary', expenseController.summary)
router.get('/:id', expenseController.getById)
router.get('/', expenseController.list)
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), validate(createExpenseSchema), expenseController.create)
router.put('/:id', authorize('SUPER_ADMIN', 'MANAGER'), validate(updateExpenseSchema), expenseController.update)
router.delete('/:id', authorize('SUPER_ADMIN'), expenseController.remove)

module.exports = router