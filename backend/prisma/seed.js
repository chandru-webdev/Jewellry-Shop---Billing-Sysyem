// Seeds the database with:
//   1. The three roles (SUPER_ADMIN, MANAGER, EMPLOYEE) with permissions
//   2. A default SUPER_ADMIN user so you can log in
// Run:  npm run db:seed
const bcrypt = require('bcryptjs')
const prisma = require('../src/prisma/client')

// Permission definitions by role
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], // All permissions
  MANAGER: [
    'dashboard:view',
    'billing:view', 'billing:create',
    'products:view', 'products:manage',
    'categories:view', 'categories:manage',
    'customers:view', 'customers:manage',
    'inventory:view', 'inventory:manage',
    'orders:view', 'orders:manage',
    'invoices:view', 'invoices:create',
    'payments:view', 'payments:manage',
    'suppliers:view', 'suppliers:manage',
    'reports:view',
    'shopify:view', 'shopify:manage',
    'metal-rates:view', 'metal-rates:manage',
  ],
  EMPLOYEE: [
    'dashboard:view',
    'billing:view', 'billing:create',
    'customers:view',
    'orders:view',
    'invoices:view',
  ],
}

async function main() {
  // 1. Roles with permissions
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access — can manage users, roles, and all modules', permissions: ROLE_PERMISSIONS.SUPER_ADMIN, isSystem: true },
    { name: 'MANAGER', description: 'Access to most modules except user management', permissions: ROLE_PERMISSIONS.MANAGER, isSystem: true },
    { name: 'EMPLOYEE', description: 'Limited access — billing, customers, and orders only', permissions: ROLE_PERMISSIONS.EMPLOYEE, isSystem: true },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions, description: role.description },
      create: role,
    })
  }
  console.log('✓ Roles ready: SUPER_ADMIN, MANAGER, EMPLOYEE')

  // 2. Default admin user
  const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
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
