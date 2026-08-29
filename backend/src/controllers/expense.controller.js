const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/ApiResponse')
const expenseService = require('../services/expense.service')

const expenseController = {
  // GET /api/expenses
  list: asyncHandler(async (req, res) => {
    const result = await expenseService.list(req.query)
    success(res, 200, result, 'Expenses fetched')
  }),

  // GET /api/expenses/categories
  categories: asyncHandler(async (req, res) => {
    const result = await expenseService.categories()
    success(res, 200, result, 'Expense categories fetched')
  }),

  // GET /api/expenses/summary
  summary: asyncHandler(async (req, res) => {
    const result = await expenseService.summary()
    success(res, 200, result, 'Expense summary fetched')
  }),

  // GET /api/expenses/:id
  getById: asyncHandler(async (req, res) => {
    const result = await expenseService.getById(Number(req.params.id))
    success(res, 200, result, 'Expense fetched')
  }),

  // POST /api/expenses
  create: asyncHandler(async (req, res) => {
    const result = await expenseService.create(req.body, req.user.id)
    success(res, 201, result, 'Expense recorded')
  }),

  // PUT /api/expenses/:id
  update: asyncHandler(async (req, res) => {
    const result = await expenseService.update(Number(req.params.id), req.body)
    success(res, 200, result, 'Expense updated')
  }),

  // DELETE /api/expenses/:id
  remove: asyncHandler(async (req, res) => {
    const result = await expenseService.remove(Number(req.params.id))
    success(res, 200, result, 'Expense deleted')
  }),
}

module.exports = expenseController