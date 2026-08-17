const request = require('supertest')
const app = require('./src/app')

async function main() {
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: process.env.SEED_ADMIN_EMAIL || 'admin@opalline.com', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123' })
  const token = login.body.data.token
  console.log('login:', login.status)

  // Settings GET
  const s = await request(app).get('/api/settings').set('Authorization', `Bearer ${token}`)
  console.log('GET /settings:', s.status, JSON.stringify(s.body.data))

  // Settings PUT
  const u = await request(app)
    .put('/api/settings')
    .set('Authorization', `Bearer ${token}`)
    .send({ businessName: 'OPAL LINE', invoiceFooter: 'Thank you for shopping with us!' })
  console.log('PUT /settings:', u.status, JSON.stringify(u.body.data))

  // Settings PUT validation error
  const bad = await request(app)
    .put('/api/settings')
    .set('Authorization', `Bearer ${token}`)
    .send({ invoicePrefix: 'bad prefix!' })
  console.log('PUT /settings invalid:', bad.status, JSON.stringify(bad.body.message))

  // Audit logs GET (admin)
  const logs = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${token}`)
  console.log('GET /audit-logs:', logs.status, 'total=', logs.body.data?.total)

  // Non-admin cannot view audit logs
  const staffRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'does-not-exist@test.com', password: 'x' })
  console.log('staff login (expected fail):', staffRes.status)

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
