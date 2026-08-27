const express = require('express')
const authController = require('../controllers/auth.controller')
const { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, verifyResetCodeSchema } = require('../validators/auth.validator')
const validate = require('../middleware/validate')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login)

// POST /api/auth/logout
router.post('/logout', authenticate, authController.logout)

// GET /api/auth/me  (protected)
router.get('/me', authenticate, authController.me)

// POST /api/auth/change-password  (protected)
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword)

// POST /api/auth/forgot-password  (public)
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword)

// POST /api/auth/verify-reset-code  (public)
router.post('/verify-reset-code', validate(verifyResetCodeSchema), authController.verifyResetCode)

// POST /api/auth/reset-password  (public)
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword)

module.exports = router
