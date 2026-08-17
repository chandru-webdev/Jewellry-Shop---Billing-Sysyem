const { z } = require('zod')

const createRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
})

const updateRoleSchema = createRoleSchema.partial()

module.exports = { createRoleSchema, updateRoleSchema }
