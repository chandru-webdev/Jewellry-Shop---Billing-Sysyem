const env = require('./config/env')
const app = require('./app')

app.listen(env.port, () => {
  console.log(`OPAL LINE ERP API running on http://localhost:${env.port}`)
})
