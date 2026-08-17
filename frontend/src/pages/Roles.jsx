import { useQuery } from '@tanstack/react-query'
import { Shield, Plus, Pencil, Loader2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { rolesApi } from '../api/users'

const PERMISSION_LABELS = {
  'dashboard:view': { label: 'Dashboard', group: 'Main' },
  'billing:view': { label: 'View Billing', group: 'Sales' },
  'billing:create': { label: 'Create Bills', group: 'Sales' },
  'products:view': { label: 'View Products', group: 'Inventory' },
  'products:manage': { label: 'Manage Products', group: 'Inventory' },
  'categories:view': { label: 'View Categories', group: 'Inventory' },
  'categories:manage': { label: 'Manage Categories', group: 'Inventory' },
  'customers:view': { label: 'View Customers', group: 'Sales' },
  'customers:manage': { label: 'Manage Customers', group: 'Sales' },
  'inventory:view': { label: 'View Inventory', group: 'Inventory' },
  'inventory:manage': { label: 'Manage Inventory', group: 'Inventory' },
  'orders:view': { label: 'View Orders', group: 'Sales' },
  'orders:manage': { label: 'Manage Orders', group: 'Sales' },
  'invoices:view': { label: 'View Invoices', group: 'Sales' },
  'invoices:create': { label: 'Create Invoices', group: 'Sales' },
  'payments:view': { label: 'View Payments', group: 'Accounts' },
  'payments:manage': { label: 'Manage Payments', group: 'Accounts' },
  'suppliers:view': { label: 'View Suppliers', group: 'Purchase' },
  'suppliers:manage': { label: 'Manage Suppliers', group: 'Purchase' },
  'reports:view': { label: 'View Reports', group: 'Reports' },
  'shopify:view': { label: 'View Shopify', group: 'Shopify' },
  'shopify:manage': { label: 'Manage Shopify', group: 'Shopify' },
  'metal-rates:view': { label: 'View Rates', group: 'System' },
  'metal-rates:manage': { label: 'Manage Rates', group: 'System' },
  'users:manage': { label: 'Manage Users', group: 'System' },
}

const roleTone = { SUPER_ADMIN: 'purple', MANAGER: 'blue', EMPLOYEE: 'green' }

export default function Roles() {
  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data.data),
  })

  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Configure role-based access control" />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading roles...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(roles || []).map((role) => {
            const permissions = Array.isArray(role.permissions) ? role.permissions : []
            const isWildcard = permissions.includes('*')

            return (
              <Card key={role.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-royal-100 flex items-center justify-center">
                      <Shield size={14} className="text-royal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-royal-950 text-sm">{role.name.replace(/_/g, ' ')}</h3>
                      <p className="text-[11px] text-gray-400">{role._count?.users || 0} user{role._count?.users !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <Badge tone={roleTone[role.name] || 'gray'}>{role.name.replace(/_/g, ' ')}</Badge>
                </div>
                {role.description && <p className="text-xs text-gray-500 mb-3">{role.description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {isWildcard ? (
                    <Badge tone="green">Full Access — All Permissions</Badge>
                  ) : (
                    Object.entries(PERMISSION_LABELS).map(([key, { label }]) => (
                      <Badge key={key} tone={permissions.includes(key) ? 'green' : 'gray'}>
                        {label}
                      </Badge>
                    ))
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
