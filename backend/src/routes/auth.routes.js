const express = require('express')
const authController = require('../controllers/auth.controller')
const { loginSchema } = require('../validators/auth.validator')
const validate = require('../middleware/validate')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login)

// POST /api/auth/logout
router.post('/logout', authController.logout)

// GET /api/auth/me  (protected)
router.get('/me', authenticate, authController.me)

module.exports = router
