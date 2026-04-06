import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../../services/api'
import { AuditLog, User } from '../../types'
import { formatDate } from '../../lib/utils'
import LoadingSpinner from '../LoadingSpinner'

const actionCategories = {
  'Аутентификация': ['LOGIN', 'LOGOUT', 'REGISTER'],
  'Скрипты': ['SCRIPT_CREATE', 'SCRIPT_DELETE', 'SCRIPT_START', 'SCRIPT_STOP', 'SCRIPT_RESTART', 'SCRIPT_DEPLOY', 'SCRIPT_EXPIRED', 'SCRIPT_ISSUE', 'SCRIPT_REVOKE', 'SCRIPT_EXTEND', 'SCRIPT_ACCESS_GRANT', 'SCRIPT_ACCESS_REVOKE', 'SCRIPT_SETTINGS_UPDATE'],
  'Серверы': ['SERVER_ADD', 'SERVER_UPDATE', 'SERVER_DELETE', 'SERVER_TEST_CONNECTION', 'SERVER_KEY_ADD', 'SERVER_KEY_DELETE', 'SERVER_KEY_UPDATE'],
  'Пользователи': ['USER_CREATE', 'USER_BLOCK', 'USER_UNBLOCK', 'USER_ROLE_CHANGE', 'USER_PASSWORD_CHANGE'],
  'Новости': ['NEWS_CREATE', 'NEWS_UPDATE', 'NEWS_DELETE'],
  'Планировщик': ['SCHEDULED_TASK_CREATE', 'SCHEDULED_TASK_UPDATE', 'SCHEDULED_TASK_DELETE', 'SCHEDULED_TASK_RUN'],
  'Система': ['QUEUE_CLEAR'],
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const [selectedActionType, setSelectedActionType] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userSearchQuery, setUserSearchQuery] = useState<string>('')
  const [showActionFilter, setShowActionFilter] = useState(false)
  const [showUserFilter, setShowUserFilter] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [pagination.page, selectedActionType, selectedUserId])

  const loadUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await adminApi.getUsers(1, 1000)
      setUsers(response.data.data)
    } catch (error) {
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const response = await adminApi.getAuditLogs(
        pagination.page,
        pagination.limit,
        selectedActionType || undefined,
        selectedUserId || undefined
      )
      setLogs(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const getActionText = (actionType: string) => {
    const actions: Record<string, string> = {
      LOGIN: 'Вход в систему',
      LOGOUT: 'Выход из системы',
      REGISTER: 'Регистрация',
      SCRIPT_CREATE: 'Создание скрипта',
      SCRIPT_DELETE: 'Удаление скрипта',
      SCRIPT_START: 'Запуск скрипта',
      SCRIPT_STOP: 'Остановка скрипта',
      SCRIPT_RESTART: 'Перезапуск скрипта',
      SCRIPT_DEPLOY: 'Деплой скрипта',
      SCRIPT_EXPIRED: 'Истечение скрипта',
      SCRIPT_ISSUE: 'Выдача скрипта',
      SCRIPT_REVOKE: 'Отзыв скрипта',
      SCRIPT_EXTEND: 'Продление скрипта',
      SCRIPT_ACCESS_GRANT: 'Выдача доступа к скрипту',
      SCRIPT_ACCESS_REVOKE: 'Отзыв доступа к скрипту',
      SCRIPT_SETTINGS_UPDATE: 'Обновление настроек скрипта',
      SERVER_ADD: 'Добавление сервера',
      SERVER_UPDATE: 'Обновление сервера',
      SERVER_DELETE: 'Удаление сервера',
      SERVER_TEST_CONNECTION: 'Тест соединения с сервером',
      SERVER_KEY_ADD: 'Добавление SSH ключа',
      SERVER_KEY_DELETE: 'Удаление SSH ключа',
      SERVER_KEY_UPDATE: 'Обновление SSH ключа',
      USER_CREATE: 'Создание пользователя',
      USER_BLOCK: 'Блокировка пользователя',
      USER_UNBLOCK: 'Разблокировка пользователя',
      USER_ROLE_CHANGE: 'Изменение роли пользователя',
      USER_PASSWORD_CHANGE: 'Изменение пароля пользователя',
      NEWS_CREATE: 'Создание новости',
      NEWS_UPDATE: 'Обновление новости',
      NEWS_DELETE: 'Удаление новости',
      SCHEDULED_TASK_CREATE: 'Создание задачи планировщика',
      SCHEDULED_TASK_UPDATE: 'Обновление задачи планировщика',
      SCHEDULED_TASK_DELETE: 'Удаление задачи планировщика',
      SCHEDULED_TASK_RUN: 'Запуск задачи планировщика',
      QUEUE_CLEAR: 'Очистка очередей',
    }
    return actions[actionType] || actionType
  }

  const getActionColor = (actionType: string) => {
    if (actionType.includes('DELETE') || actionType.includes('REVOKE') || actionType.includes('BLOCK')) {
      return 'text-red-400 bg-red-500/20 border border-red-500/40'
    }
    if (actionType.includes('CREATE') || actionType.includes('ADD') || actionType.includes('ISSUE')) {
      return 'text-green-400 bg-green-500/20 border border-green-500/40'
    }
    if (actionType.includes('UPDATE') || actionType.includes('CHANGE') || actionType.includes('EXTEND')) {
      return 'text-blue-400 bg-blue-500/20 border border-blue-500/40'
    }
    if (actionType.includes('LOGIN') || actionType.includes('LOGOUT') || actionType.includes('REGISTER')) {
      return 'text-purple-400 bg-purple-500/20 border border-purple-500/40'
    }
    if (actionType.includes('START') || actionType.includes('STOP') || actionType.includes('RESTART') || actionType.includes('DEPLOY')) {
      return 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40'
    }
    if (actionType === 'QUEUE_CLEAR') {
      return 'text-orange-400 bg-orange-500/20 border border-orange-500/40'
    }
    return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
  }

  const formatDetailValue = (key: string, value: any): string => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (key === 'removed' && value.total !== undefined) {
        return `Всего: ${value.total} (деплойменты: ${value.deployment || 0}, скрипты: ${value.script || 0}, истечение: ${value.expiry || 0})`
      }
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return String(value)
  }

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users
    const query = userSearchQuery.toLowerCase()
    return users.filter(user =>
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }, [users, userSearchQuery])

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
              Журнал аудита
            </h3>
            <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  setShowActionFilter(!showActionFilter)
                  setShowUserFilter(false)
                }}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedActionType
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-[#1a1a1a] text-[#dfdfdf] border border-[#ffffff10] hover:border-[#ffffff20]'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {selectedActionType ? getActionText(selectedActionType) : 'Все действия'}
                {selectedActionType && (
                  <svg
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedActionType('')
                      setPagination(prev => ({ ...prev, page: 1 }))
                    }}
                    className="w-4 h-4 ml-2 hover:text-red-400 cursor-pointer"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>

              {showActionFilter && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActionFilter(false)}
                  />
                  <div className="absolute left-0 mt-2 w-80 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      <div className="mb-2 px-3 py-2 text-xs font-semibold text-[#f3f3f398] uppercase">
                        Категории действий
                      </div>
                      {Object.entries(actionCategories).map(([category, actions]) => (
                        <div key={category} className="mb-2">
                          <div className="px-3 py-1.5 text-xs font-medium text-[#dfdfdf] bg-[#151515] rounded">
                            {category}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {actions.map((action) => (
                              <button
                                key={action}
                                onClick={() => {
                                  setSelectedActionType(action)
                                  setShowActionFilter(false)
                                  setPagination(prev => ({ ...prev, page: 1 }))
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                                  selectedActionType === action
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'text-[#dfdfdf] hover:bg-[#151515]'
                                }`}
                              >
                                {getActionText(action)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowUserFilter(!showUserFilter)
                  setShowActionFilter(false)
                }}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedUserId
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                    : 'bg-[#1a1a1a] text-[#dfdfdf] border border-[#ffffff10] hover:border-[#ffffff20]'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {selectedUserId
                  ? users.find(u => u.id === selectedUserId)?.username || 'Пользователь'
                  : 'Все пользователи'}
                {selectedUserId && (
                  <svg
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedUserId('')
                      setPagination(prev => ({ ...prev, page: 1 }))
                    }}
                    className="w-4 h-4 ml-2 hover:text-red-400 cursor-pointer"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>

              {showUserFilter && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserFilter(false)}
                  />
                  <div className="absolute left-0 mt-2 w-80 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20 max-h-96 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-[#ffffff10]">
                      <input
                        type="text"
                        placeholder="Поиск пользователя..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 bg-[#151515] border border-[#ffffff10] rounded-lg text-sm text-[#dfdfdf] placeholder-[#f3f3f398] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {isLoadingUsers ? (
                        <div className="p-4 text-center text-[#f3f3f398]">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : filteredUsers.length > 0 ? (
                        <div className="p-2">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedUserId(user.id)
                                setShowUserFilter(false)
                                setUserSearchQuery('')
                                setPagination(prev => ({ ...prev, page: 1 }))
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                                selectedUserId === user.id
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'text-[#dfdfdf] hover:bg-[#151515]'
                              }`}
                            >
                              <div className="font-medium">{user.username}</div>
                              <div className="text-xs text-[#f3f3f398]">{user.email}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-[#f3f3f398] text-sm">
                          Пользователи не найдены
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ffffff10] rounded-lg overflow-hidden">
              <thead className="bg-[#1a1a1a] border-b border-[#ffffff10]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    Действие
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    Объект
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    Детали
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#151515] divide-y divide-[#ffffff10]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <LoadingSpinner size="sm" />
                    </td>
                  </tr>
                ) : logs && logs.length > 0 ? logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f3f3f398]">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-[#dfdfdf]">{log.actor.username}</div>
                        <div className="text-sm text-[#f3f3f398]">{log.actor.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.actionType)}`}>
                        {getActionText(log.actionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#dfdfdf]">
                      {log.targetScript ? (
                        <div>
                          <div className="font-medium text-[#dfdfdf]">{log.targetScript.name}</div>
                          <div className="text-[#f3f3f398]">{log.targetScript.id}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#f3f3f398]">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <div className="max-w-xs space-y-1">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key} className="break-words">
                              <span className="font-medium text-[#dfdfdf]">{key}:</span>{' '}
                              <span className="text-[#f3f3f398]">{formatDetailValue(key, value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-[#f3f3f398]">
                      Нет записей для отображения
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-[#f3f3f398]">
                Показано {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} из {pagination.total}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-medium text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] rounded-lg hover:bg-[#151515] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] rounded-lg hover:bg-[#151515] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Вперед
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
