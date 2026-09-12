// =============================================================
// ONE-TIME SETUP: create the product metafield DEFINITIONS that
// the "Product Details / Price Breakup" storefront section reads.
//
// Run:  node scripts/create-metafield-definitions.js
//
// Why GraphQL? The admin "Settings → Custom data" UI is a paid
// feature, and Shopify has no free REST endpoint to define
// metafields. The Admin GraphQL mutation metafieldDefinitionCreate
// works on any plan. Once a definition exists with storefront
// access PUBLIC_READ, the VALUE pushes (REST metafields, sent by
// ProductsSync / price sync) show up in the Liquid theme.
//
// Idempotent: skips any definition that already exists.
// =============================================================
const { graphql } = require('../src/integrations/shopify/client')

const DEFINITIONS = [
  { namespace: 'silver',   key: 'purity',       type: 'single_line_text_field', name: 'Purity' },
  { namespace: 'silver',   key: 'weight',       type: 'number_decimal',         name: 'Net weight (g)' },
  { namespace: 'silver',   key: 'rate',         type: 'number_decimal',         name: 'Silver rate (₹/g)' },
  { namespace: 'silver',   key: 'gross_weight', type: 'number_decimal',         name: 'Gross weight (g)' },
  { namespace: 'stone',    key: 'type',         type: 'single_line_text_field', name: 'Stone type' },
  { namespace: 'stone',    key: 'weight',       type: 'number_decimal',         name: 'Stone weight (ct)' },
  { namespace: 'stone',    key: 'pieces',       type: 'number_integer',         name: 'Number of stones' },
  { namespace: 'stone',    key: 'value',        type: 'number_decimal',         name: 'Stone value (₹)' },
  { namespace: 'pricing',  key: 'making_charge',type: 'number_decimal',         name: 'Making charges per gram' },
  { namespace: 'pricing',  key: 'gst_amount',   type: 'number_decimal',         name: 'GST amount (₹)' },
  { namespace: 'pricing',  key: 'grand_total',  type: 'number_decimal',         name: 'Grand total (₹)' },
]

// Fetch all existing product definitions (paginated) so we skip them.
async function listExisting() {
  const existing = new Map()
  let cursor = null
  const QUERY = `query ($cursor: String) {
    metafieldDefinitions(first: 100, ownerType: PRODUCT, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id namespace key access { storefront } }
    }
  }`

  let hasNext = true
  while (hasNext) {
    const res = await graphql(QUERY, { cursor })
    const { pageInfo, nodes } = res?.data?.metafieldDefinitions || { pageInfo: null, nodes: [] }
    for (const n of nodes || []) {
      existing.set(`${n.namespace}.${n.key}`, { id: n.id, storefront: n.access?.storefront })
    }
    hasNext = pageInfo?.hasNextPage || false
    cursor = pageInfo?.endCursor || null
    if (!hasNext) break
  }
  return existing
}

async function createDefinition({ namespace, key, type, name }) {
  const QUERY = `mutation CreateDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id namespace key }
      userErrors { field message }
    }
  }`

  const res = await graphql(QUERY, {
    definition: {
      namespace,
      key,
      name,
      type,
      ownerType: 'PRODUCT',
      access: { storefront: 'PUBLIC_READ' },
    },
  })

  const userErrors = res?.data?.metafieldDefinitionCreate?.userErrors || []
  if (userErrors.length) {
    return { ok: false, errors: userErrors.map((e) => `${e.field || ''}: ${e.message}`.trim()) }
  }
  return { ok: true }
}

// Update an EXISTING definition to expose it on the storefront
// (metafieldDefinitionUpdate can flip storefront access).
async function updateDefinition(id, { namespace, key, name }) {
  const QUERY = `mutation UpdateDefinition($id: ID!, $definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(id: $id, definition: $definition) {
      updatedDefinition { id namespace key access { storefront } }
      userErrors { field message }
    }
  }`

  const res = await graphql(QUERY, {
    id,
    definition: {
      name,
      access: { storefront: 'PUBLIC_READ' },
    },
  })

  const userErrors = res?.data?.metafieldDefinitionUpdate?.userErrors || []
  if (userErrors.length) {
    return { ok: false, errors: userErrors.map((e) => `${e.field || ''}: ${e.message}`.trim()) }
  }
  return { ok: true }
}

async function main() {
  console.log('Fetching existing metafield definitions…')
  const existing = await listExisting()
  console.log(`Found ${existing.size} existing product definitions.`)

  let created = 0
  let skipped = 0
  let updated = 0
  let failed = 0

  for (const def of DEFINITIONS) {
    const id = `${def.namespace}.${def.key}`
    const current = existing.get(id)

    // Already exists AND is visible on the storefront — nothing to do.
    if (current?.storefront === 'PUBLIC_READ') {
      console.log(`  · ${id}  (already PUBLIC_READ — skip)`)
      skipped++
      continue
    }

    if (current) {
      console.log(`  ~ ${id}  (exists, storefront = ${current.storefront} — enabling PUBLIC_READ…)`)
      const result = await updateDefinition(current.id, def)
      if (result.ok) {
        console.log(`    ✓ ${id}  now public`)
        updated++
      } else {
        console.error(`    ✗ ${id}  ${result.errors.join(' | ')}`)
        failed++
      }
      continue
    }

    const result = await createDefinition(def)
    if (result.ok) {
      console.log(`  ✓ ${id}  (new, public storefront)`)
      created++
    } else {
      console.error(`  ✗ ${id}  ${result.errors.join(' | ')}`)
      failed++
    }
  }

  console.log(`\nDone: ${created} created, ${updated} updated, ${skipped} already public, ${failed} failed.`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})