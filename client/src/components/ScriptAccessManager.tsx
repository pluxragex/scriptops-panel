import { useState, useEffect } from 'react'
import { Users, Search, UserPlus, Trash2, Shield, Play, Square, RotateCcw, Eye, Edit2, Save, X, Settings, Mail, Calendar } from 'lucide-react'
import { scriptsApi } from '../services/api'
import { User } from '../types'
import LoadingSpinner from './LoadingSpinner'
import toast from 'react-hot-toast'

interface ScriptAccessManagerProps {
  scriptId: string
  scriptName: string
}

interface ScriptAccess {
  id: string
  userId: string
  canView: boolean
  canStart: boolean
  canStop: boolean
  canRestart: boolean
  canViewLogs: boolean
  canManageSettings: boolean
  createdAt: string
  user: {
    id: string
    username: string
    email: string
  }
}

export default function ScriptAccessManager({ scriptId, scriptName }: ScriptAccessManagerProps) {
  const [accessList, setAccessList] = useState<ScriptAccess[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState({
    canView: true,
    canStart: false,
    canStop: false,
    canRestart: false,
    canViewLogs: false,
    canManageSettings: false
  })
  const [editingAccess, setEditingAccess] = useState<string | null>(null)
  const [editPermissions, setEditPermissions] = useState({
    canView: true,
    canStart: false,
    canStop: false,
    canRestart: false,
    canViewLogs: false,
    canManageSettings: false
  })

  useEffect(() => {
    loadAccessList()
  }, [scriptId])

  const loadAccessList = async () => {
    try {
      const response = await scriptsApi.getScriptAccessList(scriptId)

      if (Array.isArray(response.data)) {
        setAccessList(response.data)
      } else {
        console.error('Ожидался массив, получено:', response.data)
        setAccessList([])
      }
    } catch (error: any) {
      console.error('Ошибка загрузки списка доступов:', error)
      toast.error('Ошибка загрузки списка доступов')
      setAccessList([])
    } finally {
      setIsLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await scriptsApi.searchUsers(query)
      setSearchResults(response.data)
    } catch (error: any) {
      console.error('Ошибка поиска пользователей:', error)
      toast.error('Ошибка поиска пользователей: ' + (error.response?.data?.message || error.message))
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    searchUsers(query)
  }

  const handleGrantAccess = async () => {
    if (!selectedUser) return

    try {
      await scriptsApi.grantScriptAccess(scriptId, {
        userId: selectedUser.id,
        permissions
      })
      toast.success(`Доступ выдан пользователю ${selectedUser.username}`)
      setShowGrantForm(false)
      setSelectedUser(null)
      setSearchQuery('')
      setSearchResults([])
      loadAccessList()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка выдачи доступа')
    }
  }

  const handleRevokeAccess = async (userId: string, username: string) => {
    if (window.confirm(`Отозвать доступ у пользователя ${username}?`)) {
      try {
        await scriptsApi.revokeScriptAccess(scriptId, userId)
        toast.success(`Доступ отозван у пользователя ${username}`)
        loadAccessList()
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Ошибка отзыва доступа')
      }
    }
  }

  const handleEditAccess = (access: ScriptAccess) => {
    setEditingAccess(access.id)
    setEditPermissions({
      canView: access.canView,
      canStart: access.canStart,
      canStop: access.canStop,
      canRestart: access.canRestart,
      canViewLogs: access.canViewLogs,
      canManageSettings: access.canManageSettings
    })
  }

  const handleUpdateAccess = async (userId: string, username: string) => {
    try {
      await scriptsApi.grantScriptAccess(scriptId, {
        userId,
        permissions: editPermissions
      })
      toast.success(`Права обновлены для пользователя ${username}`)
      setEditingAccess(null)
      loadAccessList()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления прав')
    }
  }

  const handleCancelEdit = () => {
    setEditingAccess(null)
    setEditPermissions({
      canView: true,
      canStart: false,
      canStop: false,
      canRestart: false,
      canViewLogs: false,
      canManageSettings: false
    })
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'canView': return <Eye className="h-4 w-4" />
      case 'canStart': return <Play className="h-4 w-4" />
      case 'canStop': return <Square className="h-4 w-4" />
      case 'canRestart': return <RotateCcw className="h-4 w-4" />
      case 'canViewLogs': return <Shield className="h-4 w-4" />
      case 'canManageSettings': return <Settings className="h-4 w-4" />
      default: return null
    }
  }

  const getPermissionText = (permission: string) => {
    switch (permission) {
      case 'canView': return 'Просмотр'
      case 'canStart': return 'Запуск'
      case 'canStop': return 'Остановка'
      case 'canRestart': return 'Перезапуск'
      case 'canViewLogs': return 'Логи'
      case 'canManageSettings': return 'Настройки скрипта'
      default: return permission
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-[#dfdfdf]">Управление доступом</h3>
          <p className="text-sm text-[#f3f3f398]">Скрипт: {scriptName}</p>
        </div>
        <button
          onClick={() => setShowGrantForm(true)}
          className="btn btn-primary btn-sm flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Выдать доступ</span>
        </button>
      </div>

      {showGrantForm && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-4 border-b border-[#ffffff10]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserPlus className="h-5 w-5 text-[#a476ff]" />
                <h4 className="text-lg font-medium text-[#dfdfdf]">Выдать доступ пользователю</h4>
              </div>
              <button
                onClick={() => {
                  setShowGrantForm(false)
                  setSelectedUser(null)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#dfdfdf] mb-3">
                Поиск пользователей
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f3f3f398] dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Введите имя пользователя или email..."
                  className="input pl-10 w-full"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="mt-3 border border-[#ffffff10] rounded-lg max-h-48 overflow-y-auto bg-[#1a1a1a]">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user)
                        setSearchQuery(user.username)
                        setSearchResults([])
                      }}
                      className="p-3 hover:bg-[#1f1f1f] cursor-pointer border-b border-[#ffffff10] last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-[#dfdfdf]">{user.username}</div>
                      <div className="text-sm text-[#f3f3f398]">{user.email}</div>
                    </div>
                  ))}
                </div>
              )}

              {isSearching && (
                <div className="mt-3 text-center py-3">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="p-4 bg-[#a476ff]/10 border border-[#a476ff]/40 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-[#a476ff]" />
                  <span className="font-medium text-[#dfdfdf]">Выбранный пользователь:</span>
                </div>
                <div className="text-sm text-[#a476ff] mt-1">
                  {selectedUser.username} ({selectedUser.email})
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#dfdfdf] mb-3">
                Права доступа
              </label>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(permissions).map(([key, value]) => (
                  <label key={key} className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    value
                      ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                      : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setPermissions(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                      value
                        ? 'border-[#a476ff] bg-[#a476ff]'
                        : 'border-[#ffffff20]'
                    }`}>
                      {value && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <span className="flex items-center text-sm font-medium text-[#dfdfdf]">
                      {getPermissionIcon(key)}
                      <span className="ml-2">{getPermissionText(key)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#ffffff10]">
              <button
                onClick={() => {
                  setShowGrantForm(false)
                  setSelectedUser(null)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="btn btn-secondary btn-sm"
              >
                Отмена
              </button>
              <button
                onClick={handleGrantAccess}
                disabled={!selectedUser}
                className="btn btn-primary btn-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span className="ml-2">Выдать доступ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-4 border-b border-[#ffffff10]">
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-[#a476ff]" />
            <h4 className="text-lg font-medium text-[#dfdfdf]">Пользователи с доступом</h4>
          </div>
        </div>
        <div className="p-6">
          {accessList.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-[#f3f3f398]" />
              <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Нет пользователей с доступом</h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                Выдайте доступ пользователям для управления скриптом
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(accessList) && accessList.map((access) => (
                <div key={access.id} className="group relative p-5 border border-[#ffffff10] rounded-xl bg-[#1a1a1a] hover:border-[#a476ff]/40 hover:bg-[#1f1f1f] transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#a476ff] rounded-full blur-md opacity-30"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-br from-[#a476ff] to-[#8c5eff] rounded-full flex items-center justify-center text-[#101010] font-bold text-base shadow-lg">
                          {access.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#1a1a1a] rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="font-semibold text-[#dfdfdf] text-base truncate">{access.user.username}</h5>
                        </div>
                        <div className="flex items-center space-x-1.5 text-sm text-[#f3f3f398] mb-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{access.user.email}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs text-[#f3f3f398]">
                          <Calendar className="h-3 w-3" />
                          <span>Доступ с {new Date(access.createdAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-2">
                      {editingAccess === access.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateAccess(access.userId, access.user.username)}
                            className="btn btn-primary btn-sm"
                            title="Сохранить изменения"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn btn-secondary btn-sm"
                            title="Отменить"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditAccess(access)}
                            className="btn btn-secondary btn-sm"
                            title="Изменить права"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRevokeAccess(access.userId, access.user.username)}
                            className="btn btn-danger btn-sm"
                            title="Отозвать доступ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingAccess === access.id ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[#dfdfdf] mb-3">Права доступа:</div>
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(editPermissions).map(([key, value]) => (
                          <label key={key} className={`flex items-center p-2 rounded-lg border-2 cursor-pointer transition-colors ${
                            value
                              ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                              : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#151515]'
                          }`}>
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={(e) => setEditPermissions(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }))}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                              value
                                ? 'border-[#a476ff] bg-[#a476ff]'
                                : 'border-[#ffffff20]'
                            }`}>
                              {value && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="flex items-center text-sm font-medium text-[#dfdfdf]">
                              {getPermissionIcon(key)}
                              <span className="ml-2">{getPermissionText(key)}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-[#f3f3f398] uppercase tracking-wide mb-2">
                        Права доступа:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(() => {

                          const activePermissions: string[] = []

                          if (access.canStart) activePermissions.push('canStart')
                          if (access.canStop) activePermissions.push('canStop')
                          if (access.canRestart) activePermissions.push('canRestart')
                          if (access.canViewLogs) activePermissions.push('canViewLogs')
                          if (access.canManageSettings) activePermissions.push('canManageSettings')

                          if (activePermissions.length > 0) {
                            return activePermissions.map((key) => (
                              <span
                                key={key}
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#a476ff]/20 text-[#a476ff] border border-[#a476ff]/40 hover:bg-[#a476ff]/30 transition-colors"
                              >
                                <span className="mr-1.5">{getPermissionIcon(key)}</span>
                                <span>{getPermissionText(key)}</span>
                              </span>
                            ))
                          } else {
                            return (
                              <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] text-[#f3f3f398] border border-[#ffffff10]">
                                <Shield className="h-3 w-3 mr-1.5" />
                                <span>Только просмотр</span>
                              </span>
                            )
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
