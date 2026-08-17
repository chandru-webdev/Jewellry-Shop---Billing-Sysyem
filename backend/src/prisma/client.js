// One shared Prisma Client for the whole backend.
// Import this anywhere you need to talk to the database.
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const env = require('../config/env')

// Prisma 7 connects to PostgreSQL through a "driver adapter".
// The adapter reads the connection string from DATABASE_URL.
const adapter = new PrismaPg({ connectionString: env.databaseUrl })

const prisma = new PrismaClient({ adapter })

module.exports = prisma
