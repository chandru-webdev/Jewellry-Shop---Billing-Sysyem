const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const env = require('./config/env')
const routes = require('./routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Trust proxy — required when behind Railway/Nginx/load balancer so that
// express-rate-limit can read X-Forwarded-For without crashing.
app.set('trust proxy', 1)

// Express cannot serialize BigInt (e.g. Prisma BigInt ids like shopifyOrderId).
// Register a global JSON replacer so every res.json() handles BigInt safely.
app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
)

// Secure HTTP headers
app.use(helmet())

// CORS — allow only configured origins
// CORS — allow only configured origins (relaxed in development)
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true)
    // In development, allow all local origins to avoid CORS friction
    if (env.nodeEnv === 'development') return callback(null, true)
    if (env.allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
}
app.use(cors(corsOptions))

// Shopify webhooks MUST be mounted BEFORE the JSON body parser and the
// rate limiter:
//   - the body parser would re-serialize the body and break the HMAC
//   - Shopify retries shouldn't be throttled by the user-facing limiter
app.use('/api/webhooks', require('./routes/webhook.routes'))

// Parse incoming JSON bodies (limit to 1MB to block huge payloads)
app.use(express.json({ limit: '1mb' }))

// Log requests in development
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'))
}

// Rate limiting — protects against brute force / abuse
// Max is configurable via API_RATE_LIMIT_MAX (default 300) so local e2e
// test suites aren't blocked, while production keeps the strict default.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.API_RATE_LIMIT_MAX) || 300, // max 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})
app.use('/api', apiLimiter)

// Stricter rate limit for auth endpoints (login, forgot-password, reset-password)
// The max is configurable via AUTH_RATE_LIMIT_MAX (default 10) so local e2e
// test suites aren't blocked, while production keeps the strict default.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10, // max attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
app.use('/api/auth/reset-password', authLimiter)

// All API routes
app.use('/api', routes)

// 404 for anything unknown
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Global error handler (must be last)
app.use(errorHandler)

module.exports = app
