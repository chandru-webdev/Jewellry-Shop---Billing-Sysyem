const { z } = require('zod')

// A silver rate must be a positive number (₹ per gram)
const rateSchema = z.object({
  rate: z.number().positive('Rate must be a positive number'),
})

module.exports = { rateSchema }
