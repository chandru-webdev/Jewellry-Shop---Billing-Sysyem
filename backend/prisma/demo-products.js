// Adds a realistic demo catalogue so the app has products to show.
// Run with:  npm run db:demo
// Safe to re-run — it skips products whose SKU already exists.

const prisma = require('../src/prisma/client')
const productService = require('../src/services/product.service')

const admin = { id: 1 }

const products = [
  // Rings
  { sku: 'SLR-001', name: 'Silver Solitaire Ring', category: 'Rings', weight: 4.5, makingCharge: 22, stock: 12 },
  { sku: 'SLR-002', name: 'Silver Band Ring', category: 'Rings', weight: 3.2, makingCharge: 15, stock: 18 },
  { sku: 'SLR-003', name: 'Antique Silver Ring', category: 'Rings', weight: 6, makingCharge: 28, stock: 8 },
  // Chains
  { sku: 'SLC-001', name: 'Silver Rope Chain', category: 'Chains', weight: 22, makingCharge: 18, stock: 6 },
  { sku: 'SLC-002', name: 'Silver Cuban Chain', category: 'Chains', weight: 30, makingCharge: 20, stock: 4 },
  { sku: 'SLC-003', name: 'Silver Box Chain', category: 'Chains', weight: 15, makingCharge: 16, stock: 10 },
  // Pendants
  { sku: 'SLP-001', name: 'Om Symbol Pendant', category: 'Pendants', weight: 5, makingCharge: 25, stock: 15 },
  { sku: 'SLP-002', name: 'Ganesh Pendant', category: 'Pendants', weight: 6.5, makingCharge: 30, stock: 11 },
  { sku: 'SLP-003', name: 'Silver Locket Pendant', category: 'Pendants', weight: 4, makingCharge: 20, stock: 20 },
  // Bracelets
  { sku: 'SLB-001', name: 'Silver Link Bracelet', category: 'Bracelets', weight: 14, makingCharge: 17, stock: 9 },
  { sku: 'SLB-002', name: 'Silver Cuff Bracelet', category: 'Bracelets', weight: 18, makingCharge: 21, stock: 7 },
  // Anklets
  { sku: 'SLA-001', name: 'Silver Payal Anklet', category: 'Anklets', weight: 28, makingCharge: 15, stock: 5 },
  { sku: 'SLA-002', name: 'Silver Bell Anklet', category: 'Anklets', weight: 35, makingCharge: 18, stock: 3 },
  // Earrings
  { sku: 'SLE-001', name: 'Silver Jhumka Earrings', category: 'Earrings', weight: 8, makingCharge: 26, stock: 14 },
  { sku: 'SLE-002', name: 'Silver Stud Earrings', category: 'Earrings', weight: 2.5, makingCharge: 18, stock: 25 },
  { sku: 'SLE-003', name: 'Silver Dangle Earrings', category: 'Earrings', weight: 6, makingCharge: 24, stock: 10 },
  // Toe Rings
  { sku: 'SLT-001', name: 'Silver Toe Ring', category: 'Toe Rings', weight: 1.5, makingCharge: 12, stock: 30 },
  { sku: 'SLT-002', name: 'Silver Toe Ring with Beads', category: 'Toe Rings', weight: 2.2, makingCharge: 14, stock: 22 },
  // Nose Pins
  { sku: 'SLN-001', name: 'Silver Nose Pin', category: 'Nose Pins', weight: 0.8, makingCharge: 16, stock: 40 },
  { sku: 'SLN-002', name: 'Silver Nose Ring', category: 'Nose Pins', weight: 1.2, makingCharge: 18, stock: 35 },
]

async function main() {
  const categories = await prisma.category.findMany()
  const map = new Map(categories.map((c) => [c.name, c.id]))

  let created = 0
  let skipped = 0

  for (const p of products) {
    const exists = await prisma.product.findUnique({ where: { sku: p.sku } })
    if (exists) {
      skipped++
      continue
    }
    if (!map.has(p.category)) {
      console.log(`SKIP ${p.sku}: category "${p.category}" not found`)
      continue
    }
    await productService.create(
      {
        sku: p.sku,
        name: p.name,
        categoryId: map.get(p.category),
        metal: 'silver',
        weight: p.weight,
        makingCharge: p.makingCharge,
        initialStock: p.stock,
      },
      admin.id
    )
    created++
  }

  console.log(`Demo products: ${created} created, ${skipped} skipped`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
