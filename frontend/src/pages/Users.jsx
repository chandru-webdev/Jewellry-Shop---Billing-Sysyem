import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Pencil, Search, Key, UserX, UserCheck, Copy, X, Loader2, ChevronDown } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { usersApi, rolesApi } from '../api/users'
import { formatDateTime } from '../utils/format'

const roleTone = { SUPER_ADMIN: 'purple', MANAGER: 'blue', EMPLOYEE: 'green' }

export default function Users() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userModal, setUserModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [resetModal, setResetModal] = useState(false)
  const [resetResult, setResetResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', roleId: '', password: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const { data: apiUsers, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.data),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list().then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUserModal(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUserModal(false)
      resetForm()
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersApi.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => usersApi.resetPassword(id),
    onSuccess: (res) => {
      setResetResult(res.data.data)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const users = apiUsers || []

  const filtered = users.filter((u) => {
    if (search) {
      const q = search.toLowerCase()
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
    }
    if (roleFilter && u.role?.name !== roleFilter) return false
    if (statusFilter === 'active' && !u.isActive) return false
    if (statusFilter === 'inactive' && u.isActive) return false
    return true
  })

  function resetForm() {
    setFormData({ name: '', email: '', roleId: '', password: '' })
    setSelectedUser(null)
    setFormError('')
  }

  function openCreate() {
    resetForm()
    setUserModal(true)
  }

  function openEdit(user) {
    setSelectedUser(user)
    setFormData({ name: user.name, email: user.email, roleId: String(user.roleId || user.role?.id || ''), password: '' })
    setUserModal(true)
  }

  function openReset(user) {
    setSelectedUser(user)
    setResetResult(null)
    setCopied(false)
    setResetModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)
    try {
      if (selectedUser) {
        const payload = { name: formData.name, email: formData.email }
        if (formData.roleId) payload.roleId = Number(formData.roleId)
        await updateMutation.mutateAsync({ id: selectedUser.id, data: payload })
      } else {
        const payload = { name: formData.name, email: formData.email, roleId: Number(formData.roleId) }
        if (formData.password) payload.password = formData.password
        await createMutation.mutateAsync(payload)
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return
    await resetPasswordMutation.mutateAsync(selectedUser.id)
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage team access and role-based permissions"
        actions={
          <Button size="sm" onClick={openCreate}><Plus size={14} /> Add User</Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white dark:bg-[#1a1025] border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 w-64">
          <Search size={14} className="text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 bg-white dark:bg-[#1a1025] focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Roles</option>
          {(roles || []).map((r) => <option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 bg-white dark:bg-[#1a1025] focus:outline-none focus:ring-2 focus:ring-royal-500">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-royal-50/80 border-b border-gray-200 dark:border-white/[0.08]">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Email</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Last Login</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 dark:text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"><Loader2 size={20} className="animate-spin mx-auto mb-2" />Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">No users found</td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-royal-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-royal-600 to-royal-800 text-white flex items-center justify-center text-[10px] font-bold">{u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
                        <div>
                          <span className="font-medium text-royal-950 dark:text-white">{u.name}</span>
                          {u.mustChangePassword && <span className="ml-1.5 text-[10px] text-amber-500 font-medium">(temp pw)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 dark:text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-center"><Badge tone={roleTone[u.role?.name] || 'gray'}>{u.role?.name?.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">{u.lastLogin ? formatDateTime(u.lastLogin) : <span className="text-gray-300">Never</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-royal-600 hover:bg-royal-100 rounded-lg cursor-pointer" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => openReset(u)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer" title="Reset Password"><Key size={14} /></button>
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                          className={`p-1.5 rounded-lg cursor-pointer ${u.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          title={u.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit User Modal */}
      <Modal
        open={userModal}
        title={selectedUser ? 'Edit User' : 'Add User'}
        onClose={() => { setUserModal(false); resetForm() }}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setUserModal(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>
              {formLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              {selectedUser ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 border border-red-200">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select value={formData.roleId} onChange={(e) => setFormData({ ...formData, roleId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" required>
              <option value="">Select role</option>
              {(roles || []).map((r) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password <span className="text-gray-400 dark:text-gray-500 font-normal">(leave blank for auto-generated temporary password)</span>
              </label>
              <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Optional — will generate temp password if empty" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500" />
            </div>
          )}
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetModal}
        title="Reset Password"
        onClose={() => { setResetModal(false); setResetResult(null) }}
        footer={
          resetResult ? (
            <Button variant="ghost" onClick={() => { setResetModal(false); setResetResult(null) }}>Close</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => { setResetModal(false); setResetResult(null) }}>Cancel</Button>
              <Button onClick={handleResetPassword} disabled={resetPasswordMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
                {resetPasswordMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                Generate New Password
              </Button>
            </>
          )
        }
      >
        {!resetResult ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
            This will generate a new temporary password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
            The user will be required to change their password on next login.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">New temporary password for <strong>{resetResult.email}</strong>:</p>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <code className="flex-1 text-sm font-mono font-bold text-amber-800">{resetResult.tempPassword}</code>
              <button onClick={() => copyToClipboard(resetResult.tempPassword)} className="p-1.5 text-amber-600 hover:bg-amber-100 rounded cursor-pointer" title="Copy">
                {copied ? <span className="text-xs text-emerald-600">Copied!</span> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Share this password securely with the user. They will be asked to change it on first login.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
