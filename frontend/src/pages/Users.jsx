import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Plus, Pencil, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { usersApi } from '../api/users'
import { formatDateTime } from '../utils/format'

const DEMO_USERS = [
  { id: 1, name: 'Rajesh Gupta', email: 'rajesh@opalline.in', role: { name: 'ADMIN' }, lastLogin: '2026-08-10T09:00:00', isActive: true },
  { id: 2, name: 'Priya Mehta', email: 'priya@opalline.in', role: { name: 'MANAGER' }, lastLogin: '2026-08-10T08:30:00', isActive: true },
  { id: 3, name: 'Amit Sharma', email: 'amit@opalline.in', role: { name: 'SALES' }, lastLogin: '2026-08-09T17:45:00', isActive: true },
  { id: 4, name: 'Neha Kulkarni', email: 'neha@opalline.in', role: { name: 'ACCOUNTS' }, lastLogin: '2026-08-10T08:00:00', isActive: true },
  { id: 5, name: 'Suresh Patil', email: 'suresh@opalline.in', role: { name: 'INVENTORY' }, lastLogin: '2026-08-08T16:20:00', isActive: true },
  { id: 6, name: 'Deepak Joshi', email: 'deepak@opalline.in', role: { name: 'SHOPIFY_MANAGER' }, lastLogin: '2026-08-09T14:10:00', isActive: false },
]

const roleTone = {
  ADMIN: 'purple', MANAGER: 'blue', SALES: 'green', ACCOUNTS: 'indigo',
  INVENTORY: 'orange', PURCHASE: 'blue', CUSTOMER_SUPPORT: 'gold',
  REPORTS: 'gray', SHOPIFY_MANAGER: 'blue', SUPER_ADMIN: 'purple',
}

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PURCHASE', 'INVENTORY', 'ACCOUNTS', 'CUSTOMER_SUPPORT', 'REPORTS', 'SHOPIFY_MANAGER']
const ALL_PERMISSIONS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export']

export default function Users() {
  const [tab, setTab] = useState('users')
  const [search, setSearch] = useState('')
  const [userModal, setUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const { data: apiUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.data),
  })

  const users = apiUsers?.length ? apiUsers : DEMO_USERS

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase()
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage team access and role-based permissions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTab('roles')}><Shield size={14} /> Manage Roles</Button>
            <Button size="sm" onClick={() => { setSelectedUser(null); setUserModal(true) }}><Plus size={14} /> Add User</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {['users', 'roles'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${tab === t ? 'border-royal-700 text-royal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'users' ? 'Users' : 'Roles & Permissions'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-64">
              <Search size={14} className="text-gray-400" />
              <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
            </div>
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-royal-50/80 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Email</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Role</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Last Login</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-royal-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-600 to-royal-800 text-white flex items-center justify-center text-[10px] font-bold">{u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
                          <span className="font-medium text-royal-950">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-center"><Badge tone={roleTone[u.role?.name] || 'gray'}>{u.role?.name}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(u.lastLogin)}</td>
                      <td className="px-4 py-3 text-center"><Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="Edit"><Pencil size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ALL_ROLES.map((role) => (
            <Card key={role} title={role.replace(/_/g, ' ')} icon={Shield}>
              <div className="space-y-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={['View', 'Create', 'Edit'].includes(perm) && ['ADMIN', 'MANAGER'].includes(role)}
                      className="rounded border-gray-300 text-royal-600 focus:ring-royal-500"
                    />
                    <span className="text-gray-700">{perm}</span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={userModal} title={selectedUser ? 'Edit User' : 'Add User'} onClose={() => setUserModal(false)} footer={
        <>
          <Button variant="ghost" onClick={() => setUserModal(false)}>Cancel</Button>
          <Button onClick={() => setUserModal(false)}>{selectedUser ? 'Update' : 'Create'}</Button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" defaultValue={selectedUser?.name || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" defaultValue={selectedUser?.email || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select defaultValue={selectedUser?.role?.name || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500">
              <option value="">Select role</option>
              {ALL_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
