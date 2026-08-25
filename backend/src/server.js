const { execSync } = require('child_process')
const env = require('./config/env')
const app = require('./app')

try {
  console.log('Syncing database schema...')
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
  console.log('Database schema synced.')
} catch (e) {
  console.error('Schema sync failed, continuing anyway:', e.message)
}

app.listen(env.port, () => {
  console.log(`OPAL LINE ERP API running on http://localhost:${env.port}`)
})
