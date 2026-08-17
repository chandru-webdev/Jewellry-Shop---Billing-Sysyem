// Seeds the database with:
//   1. The three roles (ADMIN, MANAGER, STAFF)
//   2. A default ADMIN user so you can log in
// Run:  npm run db:seed
const bcrypt = require('bcryptjs')
const prisma = require('../src/prisma/client')

async function main() {
  // 1. Roles
  const roles = [
    { name: 'ADMIN', description: 'Full access to everything', isSystem: true },
    { name: 'MANAGER', description: 'Products, inventory, orders, reports, billing', isSystem: true },
    { name: 'STAFF', description: 'Billing, customers, orders', isSystem: true },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    })
  }
  console.log('✓ Roles ready: ADMIN, MANAGER, STAFF')

  // 2. Default admin user
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@opalline.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123'
  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    update: { password: hashed, roleId: adminRole.id },
    create: {
      name: 'OPAL Line Admin',
      email,
      password: hashed,
      roleId: adminRole.id,
    },
  })
  console.log(`✓ Admin user ready: ${email} / ${password}`)

  // 3. Default silver rate (so pricing works from day one)
  await prisma.metalRate.upsert({
    where: { metal: 'silver' },
    update: {},
    create: { metal: 'silver', rate: 120 },
  })
  console.log('✓ Default silver rate ready: ₹120/g')

  // 4. Some categories so product creation is easy
  const categories = [
    { name: 'Rings', slug: 'rings' },
    { name: 'Chains', slug: 'chains' },
    { name: 'Pendants', slug: 'pendants' },
    { name: 'Bracelets', slug: 'bracelets' },
    { name: 'Anklets', slug: 'anklets' },
    { name: 'Earrings', slug: 'earrings' },
    { name: 'Toe Rings', slug: 'toe-rings' },
    { name: 'Nose Pins', slug: 'nose-pins' },
  ]
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    })
  }
  console.log('✓ Categories ready: 8 jewellery categories')

  // 5. Invoice prefix setting
  await prisma.setting.upsert({
    where: { key: 'invoicePrefix' },
    update: {},
    create: { key: 'invoicePrefix', value: 'INV' },
  })
  console.log('✓ Default settings ready')

  console.log('\nSeed complete. Log in with:', email, '/', password)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
