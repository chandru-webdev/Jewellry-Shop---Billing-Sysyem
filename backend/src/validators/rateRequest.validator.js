const { z } = require('zod')

const rateRequestSchema = z.object({
  rate: z.number().positive('Rate must be a positive number'),
})

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

module.exports = { rateRequestSchema, reviewSchema }