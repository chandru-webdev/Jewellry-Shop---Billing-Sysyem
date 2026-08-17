const prisma = require('./src/prisma/client')

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 AS ok`
    console.log('Database connected! Query result:', JSON.stringify(result))
    process.exit(0)
  } catch (e) {
    console.error('Connection FAILED:', e.message)
    process.exit(1)
  }
}

testConnection()
