import { Shield, Plus, Pencil } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PURCHASE', 'INVENTORY', 'ACCOUNTS', 'CUSTOMER_SUPPORT', 'REPORTS', 'SHOPIFY_MANAGER']
const ALL_PERMISSIONS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export']

const rolePermissions = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export'],
  MANAGER: ['View', 'Create', 'Edit', 'Approve', 'Export'],
  SALES: ['View', 'Create', 'Export'],
  PURCHASE: ['View', 'Create', 'Edit', 'Export'],
  INVENTORY: ['View', 'Create', 'Edit'],
  ACCOUNTS: ['View', 'Create', 'Edit', 'Export'],
  CUSTOMER_SUPPORT: ['View'],
  REPORTS: ['View', 'Export'],
  SHOPIFY_MANAGER: ['View', 'Create', 'Edit', 'Approve'],
}

export default function Roles() {
  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Configure role-based access control" actions={<Button size="sm"><Plus size={14} /> Add Role</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ALL_ROLES.map((role) => (
          <Card key={role}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-royal-100 flex items-center justify-center">
                  <Shield size={14} className="text-royal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-royal-950 text-sm">{role.replace(/_/g, ' ')}</h3>
                </div>
              </div>
              <button className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer"><Pencil size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PERMISSIONS.map((perm) => (
                <Badge key={perm} tone={rolePermissions[role]?.includes(perm) ? 'green' : 'gray'}>
                  {perm}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
