import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { adminApi } from '../../services/api'
import { User } from '../../types'
import LoadingSpinner from '../LoadingSpinner'
import { showSuccessToast, showErrorToast } from '../../lib/toast'
import { Eye, X, Bot, Server, Ban, CheckCircle, Shield, Crown, User as UserIcon, ChevronDown, Key, Search, Calendar, Clock, Code, Hash, ExternalLink, Plus } from 'lucide-react'
import ChangePasswordModal from './ChangePasswordModal'
import { useTranslation } from '../../lib/i18n'

export default function AdminUsers() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showUserScripts, setShowUserScripts] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userScripts, setUserScripts] = useState<any[]>([])
  const [isLoadingScripts, setIsLoadingScripts] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null)
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN' | 'SUPER_ADMIN',
  })
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [pagination.page, searchTerm])


  useEffect(() => {
    if (showUserScripts) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showUserScripts])

  const loadUsers = async () => {
    try {
      const response = await adminApi.getUsers(
        pagination.page,
        pagination.limit,
        searchTerm.trim() || undefined,
      )
      setUsers(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {

      console.error('Ошибка загрузки пользователей:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleBlock = async (userId: string) => {
    try {
      await adminApi.toggleUserBlock(userId)
      showSuccessToast('Статус пользователя изменен')
      loadUsers()
    } catch (error: any) {

      console.error('Ошибка изменения статуса:', error)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await adminApi.changeUserRole(userId, newRole)
      showSuccessToast('Роль пользователя изменена')
      loadUsers()
    } catch (error: any) {

      console.error('Ошибка изменения роли:', error)
    }
  }

  const handleViewUserScripts = async (user: User) => {
    setSelectedUser(user)
    setShowUserScripts(true)
    setIsLoadingScripts(true)

    try {

      const response = await adminApi.getUserScripts(user.id)
      setUserScripts(response.data)
    } catch (error: any) {
      console.error('Ошибка загрузки скриптов:', error)

      console.error('Ошибка загрузки скриптов пользователя:', error)
      setUserScripts([])
    } finally {
      setIsLoadingScripts(false)
    }
  }

  const handleOpenChangePassword = (user: User) => {
    setSelectedUserForPassword(user)
    setShowChangePasswordModal(true)
  }

  const handlePasswordChangeSuccess = () => {
    loadUsers()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email.trim()) {
      showErrorToast('Email обязателен')
      return
    }

    if (!formData.username.trim()) {
      showErrorToast('Имя пользователя обязательно')
      return
    }

    if (!formData.password.trim() || formData.password.length < 8) {
      showErrorToast('Пароль должен содержать минимум 8 символов')
      return
    }

    setIsCreating(true)
    try {
      await adminApi.createUser(formData)
      showSuccessToast('Пользователь создан успешно')
      resetCreateForm()
      loadUsers()
    } catch (error: any) {

      console.error('Ошибка создания пользователя:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const resetCreateForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      role: 'USER',
    })
    setShowCreateForm(false)
    setIsRoleDropdownOpen(false)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'USER':
        return 'Пользователь'
      case 'ADMIN':
        return 'Администратор'
      case 'SUPER_ADMIN':
        return 'Супер-администратор'
      default:
        return role
    }
  }


  const filteredUsers = useMemo(() => users, [users])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
      {showCreateForm && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {t('admin.users.createTitle')}
              </h3>
              <button
                onClick={resetCreateForm}
                className="p-2 text-[#f3f3f398] hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('admin.users.emailLabel')}
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={t('admin.users.emailPlaceholder')}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('admin.users.usernameLabel')}
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="username"
                    id="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={t('admin.users.usernamePlaceholder')}
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_]+"
                  />
                </div>
                <p className="mt-1 text-xs text-[#f3f3f398]">
                  {t('admin.users.usernameHint')}
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('admin.users.passwordLabel')}
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={t('admin.users.passwordPlaceholder')}
                    required
                    minLength={8}
                  />
                </div>
                <p className="mt-1 text-xs text-[#f3f3f398]">
                  {t('admin.users.passwordHint')}
                </p>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  {t('admin.users.roleLabel')}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    className="inline-flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all justify-between text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] hover:bg-[#1f1f1f] min-h-[40px]"
                  >
                    <div className="flex items-center space-x-2">
                      {formData.role === 'USER' && <UserIcon className="h-4 w-4 text-[#a476ff]" />}
                      {formData.role === 'ADMIN' && <Shield className="h-4 w-4 text-[#a476ff]" />}
                      {formData.role === 'SUPER_ADMIN' && <Crown className="h-4 w-4 text-[#a476ff]" />}
                      <span>{getRoleLabel(formData.role)}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRoleDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsRoleDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20">
                        <div className="p-2">
                          {(['USER', 'ADMIN', 'SUPER_ADMIN'] as const).map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, role }))
                                setIsRoleDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                formData.role === role
                                  ? 'bg-[#151515] text-[#dfdfdf]'
                                  : 'text-[#dfdfdf] hover:bg-[#151515]'
                              }`}
                            >
                              {role === 'USER' && <UserIcon className="h-4 w-4" />}
                              {role === 'ADMIN' && <Shield className="h-4 w-4" />}
                              {role === 'SUPER_ADMIN' && <Crown className="h-4 w-4" />}
                              <span>{getRoleLabel(role)}</span>
                              {formData.role === role && (
                                <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="btn btn-secondary btn-sm"
                  disabled={isCreating}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">{t('admin.users.creating')}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="ml-2">{t('admin.users.createButton')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
              {t('admin.users.title')}
            </h3>
            <div className="flex items-center space-x-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f3f3f398]" />
              <input
                type="text"
                placeholder={t('admin.users.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
              </div>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary btn-sm flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('admin.users.createButton')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ffffff10] rounded-lg overflow-hidden">
              <thead className="bg-[#1a1a1a] border-b border-[#ffffff10]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.users.table.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.users.table.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.users.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.users.table.scripts')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.users.table.createdAt')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.users.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#151515] divide-y divide-[#ffffff10]">
                {filteredUsers && filteredUsers.length > 0 ? filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-[#dfdfdf]">{user.username}</div>
                        <div className="text-sm text-[#f3f3f398]">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() => {
                            if (user.role !== 'SUPER_ADMIN') {
                              setOpenRoleDropdown(openRoleDropdown === user.id ? null : user.id)
                            }
                          }}
                          disabled={user.role === 'SUPER_ADMIN'}
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[160px] justify-between ${
                            user.role === 'SUPER_ADMIN'
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-[#1a1a1a]'
                          } ${
                            user.role === 'USER'
                              ? 'text-[#f3f3f398] bg-[#1a1a1a] border border-[#ffffff10]'
                              : user.role === 'ADMIN'
                              ? 'text-blue-400 bg-blue-500/20 border border-blue-500/40'
                              : 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {user.role === 'USER' && <UserIcon className="h-4 w-4" />}
                            {user.role === 'ADMIN' && <Shield className="h-4 w-4" />}
                            {user.role === 'SUPER_ADMIN' && <Crown className="h-4 w-4" />}
                            <span>
                              {user.role === 'USER' && t('admin.users.role.user')}
                              {user.role === 'ADMIN' && t('admin.users.role.admin')}
                              {user.role === 'SUPER_ADMIN' && t('admin.users.role.superAdmin')}
                            </span>
                          </div>
                          {user.role !== 'SUPER_ADMIN' && (
                            <ChevronDown className={`h-4 w-4 transition-transform ${openRoleDropdown === user.id ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {openRoleDropdown === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenRoleDropdown(null)}
                            />
                            <div className="absolute left-0 mt-2 w-56 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20">
                              <div className="p-2">
                                <button
                                  onClick={() => {
                                    if (user.role !== 'USER') {
                                      handleChangeRole(user.id, 'USER')
                                    }
                                    setOpenRoleDropdown(null)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                    user.role === 'USER'
                                      ? 'bg-[#151515] text-[#dfdfdf]'
                                      : 'text-[#dfdfdf] hover:bg-[#151515]'
                                  }`}
                                >
                                  <UserIcon className="h-4 w-4" />
                                  <span>{t('admin.users.role.user')}</span>
                                  {user.role === 'USER' && (
                                    <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    if (user.role !== 'ADMIN') {
                                      handleChangeRole(user.id, 'ADMIN')
                                    }
                                    setOpenRoleDropdown(null)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                    user.role === 'ADMIN'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'text-[#dfdfdf] hover:bg-[#151515]'
                                  }`}
                                >
                                  <Shield className="h-4 w-4" />
                                  <span>{t('admin.users.role.admin')}</span>
                                  {user.role === 'ADMIN' && (
                                    <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    if (user.role !== 'SUPER_ADMIN') {
                                      handleChangeRole(user.id, 'SUPER_ADMIN')
                                    }
                                    setOpenRoleDropdown(null)
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                    user.role === 'SUPER_ADMIN'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'text-[#dfdfdf] hover:bg-[#151515]'
                                  }`}
                                >
                                  <Crown className="h-4 w-4" />
                                  <span>{t('admin.users.role.superAdmin')}</span>
                                  {user.role === 'SUPER_ADMIN' && (
                                    <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          user.isBlocked
                            ? 'text-red-400 bg-red-500/20 border-red-500/40'
                            : 'text-green-400 bg-green-500/20 border-green-500/40'
                        }`}>
                          {user.isBlocked ? t('admin.users.status.blocked') : t('admin.users.status.active')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#dfdfdf]">
                      <button
                        onClick={() => handleViewUserScripts(user)}
                        className="btn btn-secondary btn-sm flex items-center space-x-2"
                        title={t('admin.users.viewUserScriptsTooltip')}
                      >
                        <span className="font-medium">{user._count?.scripts || 0}</span>
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f3f3f398]">
                      {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenChangePassword(user)}
                          className="btn btn-secondary btn-sm flex items-center space-x-2"
                          title="Сменить пароль пользователя"
                        >
                          <Key className="h-4 w-4" />
                          <span>{t('admin.users.changePassword')}</span>
                        </button>
                        <button
                          onClick={() => handleToggleBlock(user.id)}
                          className={`btn btn-sm flex items-center space-x-2 ${
                            user.isBlocked
                              ? 'btn-success'
                              : 'btn-danger'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          disabled={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'}
                          title={
                            user.isBlocked
                              ? t('admin.users.unblockTooltip')
                              : t('admin.users.blockTooltip')
                          }
                        >
                          {user.isBlocked ? (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              <span>{t('admin.users.unblock')}</span>
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4" />
                              <span>{t('admin.users.block')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-[#f3f3f398]">
                      {searchTerm
                        ? t('admin.users.notFound')
                        : t('admin.users.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-[#f3f3f398]">
                {t('admin.pagination.showing', {
                  from: ((pagination.page - 1) * pagination.limit) + 1,
                  to: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  {t('common.back')}
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="btn btn-secondary btn-sm"
                >
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      </div>

      {showChangePasswordModal && selectedUserForPassword && createPortal(
        <ChangePasswordModal
          user={selectedUserForPassword}
          onClose={() => {
            setShowChangePasswordModal(false)
            setSelectedUserForPassword(null)
          }}
          onSuccess={handlePasswordChangeSuccess}
        />,
        document.body
      )}

      {showUserScripts && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] border border-[#ffffff10] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#ffffff10] bg-[#1a1a1a] rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-[#a476ff]/20 rounded-lg">
                  <Bot className="h-6 w-6 text-[#a476ff]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#dfdfdf]">
                    Скрипты пользователя
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-[#f3f3f398]">Пользователь:</span>
                    <span className="text-sm font-semibold text-[#dfdfdf]">
                      {selectedUser?.username}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowUserScripts(false)}
                className="text-[#f3f3f398] hover:text-[#dfdfdf] hover:bg-[#1f1f1f] rounded-lg p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {isLoadingScripts ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : userScripts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-[#a476ff] rounded-full blur-xl opacity-20"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-[#a476ff]/30 to-[#8c5eff]/20 border-2 border-[#a476ff]/50 rounded-full flex items-center justify-center">
                      <Bot className="h-10 w-10 text-[#a476ff]" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-[#dfdfdf] mb-2">Нет скриптов</h3>
                  <p className="text-sm text-[#f3f3f398]">
                    У пользователя <span className="font-medium text-[#dfdfdf]">{selectedUser?.username}</span> нет созданных скриптов
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userScripts.map((script) => (
                    <div key={script.id} className="relative border border-[#ffffff10] rounded-xl p-5 bg-[#1a1a1a]">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="relative">
                            <div className="absolute inset-0 bg-[#a476ff] rounded-lg blur-md opacity-20"></div>
                            <div className="relative w-10 h-10 bg-gradient-to-br from-[#a476ff]/30 to-[#8c5eff]/20 border border-[#a476ff]/50 rounded-lg flex items-center justify-center">
                              <Code className="h-5 w-5 text-[#a476ff]" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-semibold text-[#dfdfdf] mb-1">{script.name}</h4>
                            <p className="text-sm text-[#f3f3f398] line-clamp-2">{script.description || 'Без описания'}</p>
                          </div>
                        </div>
                        <Link
                          to={`/scripts/${script.id}`}
                          onClick={() => setShowUserScripts(false)}
                          className="btn btn-primary btn-sm flex items-center space-x-2 ml-4 flex-shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Перейти к скрипту</span>
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#151515] border border-[#ffffff10]">
                          <Server className="h-4 w-4 text-[#a476ff] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#f3f3f398] mb-0.5">Сервер</div>
                            <div className="text-sm font-medium text-[#dfdfdf] truncate">{script.server?.name || 'Не назначен'}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#151515] border border-[#ffffff10]">
                          <Code className="h-4 w-4 text-[#a476ff] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#f3f3f398] mb-0.5">Тип</div>
                            <div className="text-sm font-medium text-[#dfdfdf] truncate">
                              {script.type === 'CUSTOM' ? 'Пользовательский' :
                               script.type === 'CYBER_LEAGUE' ? 'Majestic Cyber League' :
                               script.type === 'WEEKLY_CUP' ? 'Weekly Cup / WarZone' :
                               script.type === 'ALLIANCE_BOT' ? 'Союзный бот' :
                               script.type || 'Не указан'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#151515] border border-[#ffffff10]">
                          <Calendar className="h-4 w-4 text-[#a476ff] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#f3f3f398] mb-0.5">Создан</div>
                            <div className="text-sm font-medium text-[#dfdfdf]">
                              {new Date(script.createdAt).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#151515] border border-[#ffffff10]">
                          <Clock className="h-4 w-4 text-[#a476ff] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-[#f3f3f398] mb-0.5">Истекает</div>
                            <div className="text-sm font-medium text-[#dfdfdf]">
                              {script.expiryDate ? new Date(script.expiryDate).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'Бессрочно'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#ffffff10]">
                        <div className="flex items-center space-x-2 text-xs text-[#f3f3f398]">
                          <Hash className="h-3.5 w-3.5 text-[#a476ff]" />
                          <span className="font-mono">{script.id}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
