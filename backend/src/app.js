const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const env = require('./config/env')
const routes = require('./routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// Express cannot serialize BigInt (e.g. Prisma BigInt ids like shopifyOrderId).
// Register a global JSON replacer so every res.json() handles BigInt safely.
app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
)

// Secure HTTP headers
app.use(helmet())

// CORS — allow only the React app
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
)

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
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})
app.use('/api', apiLimiter)

// All API routes
app.use('/api', routes)

// 404 for anything unknown
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// Global error handler (must be last)
app.use(errorHandler)

module.exports = app
