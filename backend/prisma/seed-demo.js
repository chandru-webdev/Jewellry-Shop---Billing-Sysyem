/**
 * Seeds demo data for testing:
 *   - Customers
 *   - Products with correct pricing (uses the pricing formula)
 *   - Orders (POS + Shopify)
 *   - Invoices
 *   - Payments
 *   - Notifications
 *
 * Run: node prisma/seed-demo.js
 */
const bcrypt = require('bcryptjs')
const prisma = require('../src/prisma/client')

const { Prisma } = require('@prisma/client')

const Decimal = Prisma.Decimal

function calculatePrice({ silverRate, weight, makingCharge, gstPercent }) {
  const perGram = new Decimal(silverRate).plus(makingCharge)
  const baseAmount = perGram.mul(weight)
  const gstAmount = baseAmount.mul(gstPercent).div(100)
  const sellingPrice = baseAmount.plus(gstAmount)
  return {
    baseAmount: baseAmount.toDecimalPlaces(2).toNumber(),
    gstAmount: gstAmount.toDecimalPlaces(2).toNumber(),
    sellingPrice: sellingPrice.toDecimalPlaces(2).toNumber(),
  }
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function hoursAgo(n) {
  const d = new Date()
  d.setHours(d.getHours() - n)
  return d
}

async function main() {
  console.log('Seeding demo data...\n')

  // Ensure roles exist
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access', permissions: ['*'], isSystem: true },
    { name: 'MANAGER', description: 'Access to most modules', permissions: ['dashboard:view','billing:view','billing:create','products:view','products:manage','customers:view','customers:manage','inventory:view','inventory:manage','orders:view','orders:manage','invoices:view','invoices:create','reports:view','metal-rates:view'], isSystem: true },
    { name: 'EMPLOYEE', description: 'Limited access', permissions: ['dashboard:view','billing:view','billing:create','customers:view','orders:view','invoices:view'], isSystem: true },
  ]
  for (const role of roles) {
    await prisma.role.upsert({ where: { name: role.name }, update: { permissions: role.permissions }, create: role })
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
  const staffRole = await prisma.role.findUnique({ where: { name: 'EMPLOYEE' } })

  // Admin user
  const adminEmail = 'admin@opalline.com'
  const adminHash = await bcrypt.hash('Admin@123', 10)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'OPAL Line Admin',
      email: adminEmail,
      password: adminHash,
      roleId: adminRole.id,
    },
  })

  // Staff user
  const staffEmail = 'staff@opalline.com'
  const staffHash = await bcrypt.hash('Staff@123', 10)
  const staff = await prisma.user.upsert({
    where: { email: staffEmail },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: staffEmail,
      password: staffHash,
      roleId: staffRole.id,
    },
  })
  console.log('✓ Users: admin + staff')

  // Silver rate
  await prisma.metalRate.upsert({
    where: { metal: 'silver' },
    update: { rate: 92.8 },
    create: { metal: 'silver', rate: 92.8 },
  })
  console.log('✓ Silver rate: ₹92.80/g')

  // Categories
  const categories = [
    { name: 'Rings', slug: 'rings' },
    { name: 'Chains', slug: 'chains' },
    { name: 'Pendants', slug: 'pendants' },
    { name: 'Bracelets', slug: 'bracelets' },
    { name: 'Earrings', slug: 'earrings' },
    { name: 'Anklets', slug: 'anklets' },
    { name: 'Toe Rings', slug: 'toe-rings' },
    { name: 'Nose Pins', slug: 'nose-pins' },
  ]
  const catMap = {}
  for (const c of categories) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })
    catMap[c.slug] = cat.id
  }
  console.log('✓ Categories: 8')

  // Products
  const silverRate = 92.8
  const productsData = [
    { sku: 'OL-RNG-001', name: 'Sterling Silver Classic Band Ring', slug: 'rings', weight: 4.5, making: 180, low: 3 },
    { sku: 'OL-RNG-002', name: 'Silver Oxidised Couple Ring Set', slug: 'rings', weight: 7.2, making: 200, low: 2 },
    { sku: 'OL-RNG-003', name: 'Filigree Flower Ring', slug: 'rings', weight: 3.8, making: 220, low: 5 },
    { sku: 'OL-CHN-001', name: 'Box Chain 925 Silver 20 inch', slug: 'chains', weight: 12.5, making: 150, low: 5 },
    { sku: 'OL-CHN-002', name: 'Curb Chain 925 Silver 18 inch', slug: 'chains', weight: 10.8, making: 160, low: 4 },
    { sku: 'OL-CHN-003', name: 'Twisted Rope Chain 22 inch', slug: 'chains', weight: 14.2, making: 170, low: 3 },
    { sku: 'OL-PDT-001', name: 'Om Pendant with Chain', slug: 'pendants', weight: 5.0, making: 200, low: 6 },
    { sku: 'OL-PDT-002', name: 'Diamond-Cut Heart Pendant', slug: 'pendants', weight: 3.5, making: 250, low: 4 },
    { sku: 'OL-BRC-001', name: 'Silver Cuff Bracelet', slug: 'bracelets', weight: 18.0, making: 140, low: 3 },
    { sku: 'OL-BRC-002', name: 'Beaded Silver Charm Bracelet', slug: 'bracelets', weight: 15.5, making: 190, low: 2 },
    { sku: 'OL-EAR-001', name: 'Classic Silver Jhumka Earrings', slug: 'earrings', weight: 6.8, making: 210, low: 5 },
    { sku: 'OL-EAR-002', name: 'Minimalist Stud Earrings 925', slug: 'earrings', weight: 2.2, making: 260, low: 8 },
    { sku: 'OL-EAR-003', name: 'Chandbali Drops', slug: 'earrings', weight: 8.5, making: 230, low: 3 },
    { sku: 'OL-ANK-001', name: 'Silver Payal Anklet', slug: 'anklets', weight: 22.0, making: 130, low: 4 },
    { sku: 'OL-ANK-002', name: 'Adjustable Silver Anklet', slug: 'anklets', weight: 16.0, making: 145, low: 3 },
    { sku: 'OL-TOE-001', name: 'Silver Toe Ring Pair', slug: 'toe-rings', weight: 3.0, making: 200, low: 6 },
    { sku: 'OL-NOS-001', name: 'Silver Nose Pin with Stone', slug: 'nose-pins', weight: 1.2, making: 300, low: 10 },
    { sku: 'OL-NOS-002', name: 'Diamond-Look Nose Stud', slug: 'nose-pins', weight: 0.8, making: 320, low: 8 },
    { sku: 'OL-RNG-004', name: 'Men\'s Signet Ring', slug: 'rings', weight: 9.0, making: 170, low: 2 },
    { sku: 'OL-CHN-004', name: 'Thick Cuban Link Chain', slug: 'chains', weight: 20.0, making: 165, low: 2 },
  ]

  const productIds = []
  for (const p of productsData) {
    const price = calculatePrice({ silverRate, weight: p.weight, makingCharge: p.making, gstPercent: 3 })
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: catMap[p.slug],
        metal: 'silver',
        weight: p.weight,
        makingCharge: p.making,
        gstPercent: 3,
        baseAmount: price.baseAmount,
        gstAmount: price.gstAmount,
        sellingPrice: price.sellingPrice,
        lowStockThreshold: p.low,
      },
    })
    productIds.push(prod.id)

    // Inventory
    const qty = Math.floor(Math.random() * 15) + 3
    await prisma.inventory.upsert({
      where: { productId: prod.id },
      update: { quantity: qty },
      create: { productId: prod.id, quantity: qty },
    })
  }
  console.log(`✓ Products: ${productsData.length} + inventory`)

  // Customers
  const customersData = [
    { name: 'Ananya Patel', phone: '9876543210', email: 'ananya.p@gmail.com', address: 'Andheri West, Mumbai', gstin: '27AAPFU0939F1ZV' },
    { name: 'Rohit Mehta', phone: '9820123456', email: 'rohit.m@outlook.com', address: 'Bandra East, Mumbai', gstin: '27BBPGR4521A1ZQ' },
    { name: 'Sneha Kulkarni', phone: '9765432109', email: 'sneha.k@yahoo.com', address: 'Thane West', gstin: null },
    { name: 'Vikram Joshi', phone: '9890123456', email: 'vikram.j@rediffmail.com', address: 'Dadar, Mumbai', gstin: null },
    { name: 'Priyanka Desai', phone: '9812345678', email: 'priyanka.d@gmail.com', address: 'Dadar West, Mumbai', gstin: '27CCPDH7812B1ZO' },
    { name: 'Amit Sharma', phone: '9871234567', email: 'amit.s@live.com', address: 'Andheri East, Mumbai', gstin: null },
    { name: 'Neha Gupta', phone: '9987654321', email: 'neha.g@gmail.com', address: 'Powai, Mumbai', gstin: '27DDNGP3345C1ZP' },
    { name: 'Sanjay Kulkarni', phone: '9765412345', email: 'sanjay.k@icloud.com', address: 'Juhu, Mumbai', gstin: null },
    { name: 'Deepa Iyer', phone: '9854321678', email: 'deepa.i@gmail.com', address: 'Lower Parel, Mumbai', gstin: '27EEPID5678D1ZR' },
    { name: 'Kunal Bhatt', phone: '9843210987', email: 'kunal.b@gmail.com', address: 'Chembur, Mumbai', gstin: null },
  ]
  const custIds = []
  for (const c of customersData) {
    const cust = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    })
    custIds.push(cust.id)
  }
  console.log(`✓ Customers: ${customersData.length}`)

  // Orders + Invoices + Payments
  let orderCount = 0
  let invoiceCount = 0
  const paymentMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']
  const orderStatuses = ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED']

  for (let i = 0; i < 25; i++) {
    const source = i < 15 ? 'POS' : 'SHOPIFY'
    const custIdx = Math.floor(Math.random() * custIds.length)
    const customerId = custIds[custIdx]
    const numItems = Math.floor(Math.random() * 3) + 1
    const createdAt = daysAgo(Math.floor(Math.random() * 30))

    // Pick products for order
    const orderItems = []
    let totalAmount = new Decimal(0)
    for (let j = 0; j < numItems; j++) {
      const pIdx = Math.floor(Math.random() * productsData.length)
      const p = productsData[pIdx]
      const pid = productIds[pIdx]
      const qty = Math.floor(Math.random() * 2) + 1
      const price = calculatePrice({ silverRate, weight: p.weight, makingCharge: p.making, gstPercent: 3 })
      const lineTotal = new Decimal(price.sellingPrice).mul(qty)
      totalAmount = totalAmount.plus(lineTotal)

      orderItems.push({
        productId: pid,
        sku: p.sku,
        name: p.name,
        quantity: qty,
        unitPrice: price.sellingPrice,
        lineTotal: lineTotal.toDecimalPlaces(2).toNumber(),
        weight: p.weight * qty,
        makingCharge: p.making,
        silverRate: silverRate,
        gstAmount: price.gstAmount * qty,
      })
    }

    const orderNum = source === 'POS'
      ? `POS-${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`
      : `SHOPIFY-${1000 + i}`

    const status = i < 18 ? 'PAID' : i < 22 ? 'FULFILLED' : i < 24 ? 'PENDING' : 'CANCELLED'

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        source,
        customerId,
        status,
        totalAmount: totalAmount.toDecimalPlaces(2).toNumber(),
        createdAt,
        updatedAt: createdAt,
        items: {
          create: orderItems,
        },
      },
    })
    orderCount++

    // Create invoice for paid/fulfilled orders
    if (status === 'PAID' || status === 'FULFILLED') {
      const invNum = `INV-${String(invoiceCount + 1).padStart(4, '0')}`
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
      const subtotal = totalAmount.div(1.03).toDecimalPlaces(2).toNumber()
      const gstTotal = totalAmount.minus(subtotal).toDecimalPlaces(2).toNumber()

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: invNum,
          customerId,
          orderId: order.id,
          date: createdAt,
          paymentMethod: method,
          salespersonId: Math.random() > 0.5 ? admin.id : staff.id,
          status: 'PAID',
          subtotal,
          discount: 0,
          gstTotal,
          grandTotal: totalAmount.toDecimalPlaces(2).toNumber(),
          totalWeight: orderItems.reduce((s, it) => s + it.weight, 0),
          totalMakingCharge: orderItems.reduce((s, it) => s + it.makingCharge * it.quantity, 0),
          createdAt,
          updatedAt: createdAt,
          items: {
            create: orderItems.map((it) => ({
              productId: it.productId,
              sku: it.sku,
              name: it.name,
              quantity: it.quantity,
              weight: it.weight,
              makingCharge: it.makingCharge,
              silverRate: silverRate,
              baseAmount: new Decimal(it.unitPrice).div(1.03).toDecimalPlaces(2).toNumber(),
              gstAmount: it.gstAmount,
              finalAmount: it.lineTotal,
            })),
          },
        },
      })
      invoiceCount++

      // Payment
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          orderId: order.id,
          customerId,
          amount: totalAmount.toDecimalPlaces(2).toNumber(),
          method,
          status: 'PAID',
          reference: method === 'UPI' ? `UPI-${Date.now()}-${i}` : null,
          createdAt,
        },
      })

      // Stock-out inventory transactions for sold items
      for (const it of orderItems) {
        await prisma.inventoryTransaction.create({
          data: {
            productId: it.productId,
            type: 'SALE',
            quantity: -it.quantity,
            reference: `Invoice ${invNum}`,
            note: `Sold ${it.quantity}x ${it.name}`,
            createdById: staff.id,
            createdAt,
          },
        })
      }
    }
  }
  console.log(`✓ Orders: ${orderCount}, Invoices: ${invoiceCount}`)

  // Notifications
  const notificationsData = [
    { type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'OL-RNG-004 (Men\'s Signet Ring) has only 2 units left.', hoursAgo: 1 },
    { type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'OL-CHN-004 (Thick Cuban Link Chain) has only 2 units left.', hoursAgo: 3 },
    { type: 'ORDER_RECEIVED', title: 'New POS Order', message: 'POS order POS-20260817-001 received from Ananya Patel.', hoursAgo: 5 },
    { type: 'RATE_CHANGED', title: 'Silver Rate Updated', message: 'Silver rate changed to ₹92.80/g (was ₹90.00/g).', hoursAgo: 24 },
    { type: 'ORDER_RECEIVED', title: 'New Shopify Order', message: 'Shopify order SHOPIFY-1020 received.', hoursAgo: 8 },
    { type: 'INVOICE_CREATED', title: 'Invoice Generated', message: 'INV-018 created for Rohit Mehta — ₹4,250.00.', hoursAgo: 12 },
    { type: 'SYNC_COMPLETE', title: 'Shopify Sync Complete', message: 'Product prices synced to Shopify successfully.', hoursAgo: 6 },
    { type: 'LOW_STOCK', title: 'Low Stock Alert', message: 'OL-NOS-001 (Silver Nose Pin with Stone) has only 10 units — nearing threshold.', hoursAgo: 2 },
    { type: 'INVOICE_CREATED', title: 'Invoice Generated', message: 'INV-019 created for Priyanka Desai — ₹8,920.50.', hoursAgo: 4 },
    { type: 'ORDER_RECEIVED', title: 'New POS Order', message: 'POS order received from Vikram Joshi — ₹2,145.80.', hoursAgo: 1 },
  ]

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: false,
        createdAt: hoursAgo(n.hoursAgo),
      },
    })
  }
  console.log(`✓ Notifications: ${notificationsData.length}`)

  // Metal rate history
  const rates = [
    { rate: 88.5, daysAgo: 30 },
    { rate: 89.2, daysAgo: 25 },
    { rate: 90.0, daysAgo: 20 },
    { rate: 91.5, daysAgo: 14 },
    { rate: 90.8, daysAgo: 7 },
    { rate: 92.8, daysAgo: 0 },
  ]
  for (const r of rates) {
    await prisma.metalRateHistory.create({
      data: {
        metal: 'silver',
        oldRate: r.rate - 2,
        newRate: r.rate,
        changedById: admin.id,
        changedAt: daysAgo(r.daysAgo),
      },
    })
  }
  console.log('✓ Metal rate history: 6 entries')

  // Invoice prefix setting
  await prisma.setting.upsert({
    where: { key: 'invoicePrefix' },
    update: {},
    create: { key: 'invoicePrefix', value: 'INV' },
  })

  console.log('\n✅ Demo data seeded successfully!')
  console.log('   Login: admin@opalline.com / Admin@123')
  console.log('   Login: staff@opalline.com / Staff@123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
