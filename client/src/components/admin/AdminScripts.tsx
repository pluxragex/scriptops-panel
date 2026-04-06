import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { adminApi, scriptsApi } from '../../services/api'
import { Script, CreateScriptData, Server } from '../../types'
import { getStatusColor, getStatusText, formatDate, getExpiryStatus, isScriptExpired, isScriptFrozen } from '../../lib/utils'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'
import { Plus, Save, X, Bot, Calendar, Clock, Search, User, Play, Square, RotateCcw, Eye, Crown, Filter, RefreshCw, Sparkles, ChevronDown, CheckCircle, Server as ServerIcon, Pencil } from 'lucide-react'
import ScriptLogsModal from './ScriptLogsModal'
import { useTranslation } from '../../lib/i18n'

type ScriptTypeFilter = 'ALL' | 'CUSTOM' | 'CYBER_LEAGUE' | 'WEEKLY_CUP' | 'ALLIANCE_BOT'

export default function AdminScripts() {
  const { t } = useTranslation()
  const [scripts, setScripts] = useState<Script[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<ScriptTypeFilter>('ALL')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [servers, setServers] = useState<Server[]>([])
  const [isLoadingServers, setIsLoadingServers] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreateScriptData>({
    name: '',
    description: '',
    type: 'CUSTOM',
    serverId: '',
    autoUpdate: false,
  })
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerSearchResults, setOwnerSearchResults] = useState<any[]>([])
  const [selectedOwner, setSelectedOwner] = useState<any>(null)
  const [isSearchingOwners, setIsSearchingOwners] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)
  const [extendType, setExtendType] = useState<'days' | 'date' | 'unlimited'>('days')
  const [extendDays, setExtendDays] = useState(30)
  const [extendDate, setExtendDate] = useState('')
  const [isExtending, setIsExtending] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [selectedScriptForLogs, setSelectedScriptForLogs] = useState<Script | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [autoUpdateLoading, setAutoUpdateLoading] = useState<string | null>(null)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false)
  const [editingScriptName, setEditingScriptName] = useState<string | null>(null)
  const [editingScriptNameValue, setEditingScriptNameValue] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const savingScriptNameRef = useRef<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingOwnerId, setEditingOwnerId] = useState<string | null>(null)
  const [ownerSearchForScript, setOwnerSearchForScript] = useState<{ [key: string]: string }>({})
  const [ownerSearchResultsForScript, setOwnerSearchResultsForScript] = useState<{ [key: string]: any[] }>({})
  const [isSearchingOwnerForScript, setIsSearchingOwnerForScript] = useState<{ [key: string]: boolean }>({})
  const [isChangingOwner, setIsChangingOwner] = useState<string | null>(null)
  const [serverScriptsStats, setServerScriptsStats] = useState<{ [key: string]: { total: number; byType: { CUSTOM: number; CYBER_LEAGUE: number; WEEKLY_CUP: number; ALLIANCE_BOT: number } } } | null>(null)
  const [isLoadingServerStats, setIsLoadingServerStats] = useState(false)

  useEffect(() => {
    loadScripts()
  }, [pagination.page, searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingOwnerId) {
        const target = event.target as HTMLElement
        if (!target.closest(`[data-owner-edit="${editingOwnerId}"]`)) {
          setEditingOwnerId(null)
          setOwnerSearchForScript(prev => {
            const newState = { ...prev }
            delete newState[editingOwnerId]
            return newState
          })
          setOwnerSearchResultsForScript(prev => {
            const newState = { ...prev }
            delete newState[editingOwnerId]
            return newState
          })
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingOwnerId])

  const loadScripts = async () => {
    try {
      const response = await adminApi.getScripts(
        pagination.page,
        pagination.limit,
        searchTerm.trim() || undefined,
      )
      setScripts(response.data.data)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Ошибка загрузки скриптов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeScript = async (scriptId: string) => {
    if (window.confirm('Вы уверены, что хотите отозвать этот скрипт?')) {
      try {
        await adminApi.revokeScript(scriptId)
        showSuccessToast('Скрипт отозван')
        setScripts(prev => prev.filter(script => script.id !== scriptId))
      } catch (error: any) {
        console.error('Ошибка отзыва скрипта:', error)
      }
    }
  }

  const openExtendModal = (script: Script) => {
    setSelectedScript(script)
    setExtendType('days')
    setExtendDays(30)
    setExtendDate('')
    setShowExtendModal(true)
  }


  const handleExtendScript = async () => {
    if (!selectedScript) return

    let days: number | null = null

    if (extendType === 'days') {
      days = extendDays
    } else if (extendType === 'date') {
      if (!extendDate) {
        showErrorToast('Выберите дату окончания')
        return
      }
      const targetDate = new Date(extendDate)
      const currentDate = selectedScript.expiryDate ? new Date(selectedScript.expiryDate) : new Date()
      days = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))

      if (days <= 0) {
        showErrorToast('Дата окончания должна быть в будущем')
        return
      }
    } else if (extendType === 'unlimited') {
      days = null
    }

    setIsExtending(true)
    try {
      if (days === null) {
        await adminApi.extendScript(selectedScript.id, { days: null })
        showSuccessToast('Скрипт выдан на бессрочно')
      } else {
        await adminApi.extendScript(selectedScript.id, { days })
        showSuccessToast(`Срок скрипта продлен на ${days} дней`)
      }
      setShowExtendModal(false)
      loadScripts()
    } catch (error: any) {
      console.error('Ошибка продления срока:', error)
    } finally {
      setIsExtending(false)
    }
  }

  const handleScriptAction = async (scriptId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoading(scriptId)
    try {
      switch (action) {
        case 'start':
          await scriptsApi.startScript(scriptId)
          showSuccessToast('Скрипт запущен')
          setScripts(prev => prev.map(script =>
            script.id === scriptId ? { ...script, status: 'RUNNING' } : script
          ))
          break
        case 'stop':
          await scriptsApi.stopScript(scriptId)
          showSuccessToast('Скрипт остановлен')
          setScripts(prev => prev.map(script =>
            script.id === scriptId ? { ...script, status: 'STOPPED' } : script
          ))
          break
        case 'restart':
          await scriptsApi.restartScript(scriptId)
          showSuccessToast('Скрипт перезапущен')
          setScripts(prev => prev.map(script =>
            script.id === scriptId ? { ...script, status: 'RUNNING' } : script
          ))
          break
      }
    } catch (error: any) {
      console.error(`Ошибка ${action === 'start' ? 'запуска' : action === 'stop' ? 'остановки' : 'перезапуска'} скрипта:`, error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleShowLogs = (script: Script) => {
    setSelectedScriptForLogs(script)
    setShowLogsModal(true)
  }

  const handleToggleAutoUpdate = async (scriptId: string, currentValue: boolean) => {
    setAutoUpdateLoading(scriptId)
    try {
      await scriptsApi.toggleAutoUpdate(scriptId, !currentValue)
      showSuccessToast(`Автообновление ${!currentValue ? 'включено' : 'выключено'}`)
      setScripts(prev => prev.map(script =>
        script.id === scriptId ? { ...script, autoUpdate: !currentValue } : script
      ))
    } catch (error: any) {
      console.error('Ошибка переключения автообновления:', error)
    } finally {
      setAutoUpdateLoading(null)
    }
  }

  const handleStartEditName = (script: Script) => {
    setEditingScriptName(script.id)
    setEditingScriptNameValue(script.name)
  }

  const handleCancelEditName = () => {
    setEditingScriptName(null)
    setEditingScriptNameValue('')
  }

  const handleSaveScriptName = async (scriptId: string) => {
    if (!editingScriptNameValue.trim()) {
      showErrorToast('Имя скрипта не может быть пустым')
      return
    }

    const script = scripts.find(s => s.id === scriptId)
    if (script && script.name === editingScriptNameValue.trim()) {
      handleCancelEditName()
      return
    }

    if (isRenaming) {
      return
    }

    savingScriptNameRef.current = scriptId
    setIsRenaming(true)
    try {
      const response = await adminApi.updateScriptName(scriptId, editingScriptNameValue.trim())
      showSuccessToast('Имя скрипта обновлено')
      setScripts(prev => prev.map(script =>
        script.id === scriptId ? { ...script, name: response.data.name } : script
      ))
      setEditingScriptName(null)
      setEditingScriptNameValue('')
    } catch (error: any) {
      console.error('Ошибка обновления имени скрипта:', error)
    } finally {
      setIsRenaming(false)
      savingScriptNameRef.current = null
    }
  }

  const handleNameInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, scriptId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      savingScriptNameRef.current = scriptId
      e.currentTarget.blur()
      setTimeout(() => {
        handleSaveScriptName(scriptId)
      }, 10)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEditName()
    }
  }

  const loadServers = async () => {
    setIsLoadingServers(true)
    try {
      const response = await adminApi.getServers()
      setServers(response.data)
    } catch (error) {
      console.error('Ошибка загрузки серверов:', error)
    } finally {
      setIsLoadingServers(false)
    }
  }

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showErrorToast('Название скрипта обязательно')
      return
    }

    if (!formData.serverId) {
      showErrorToast('Выберите сервер')
      return
    }

    if (!selectedOwner) {
      showErrorToast('Пожалуйста, выберите владельца скрипта')
      return
    }

    setIsCreating(true)
    try {
      const scriptData = {
        ...formData,
        ownerId: selectedOwner.id
      }
      await scriptsApi.createScript(scriptData)
      showSuccessToast('Скрипт создан успешно')
      resetCreateForm()
      loadScripts()
    } catch (error: any) {
      console.error('Ошибка создания скрипта:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const searchOwners = async (query: string) => {
    if (query.length < 2) {
      setOwnerSearchResults([])
      return
    }

    setIsSearchingOwners(true)
    try {
      const response = await scriptsApi.searchUsers(query)
      setOwnerSearchResults(response.data)
    } catch (error: any) {
      console.error('Ошибка поиска пользователей:', error)
    } finally {
      setIsSearchingOwners(false)
    }
  }

  const handleOwnerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setOwnerSearch(query)
    searchOwners(query)
  }

  const handleOwnerSelect = (user: any) => {
    setSelectedOwner(user)
    setOwnerSearch(user.username)
    setOwnerSearchResults([])
  }

  const searchOwnersForScript = async (scriptId: string, query: string) => {
    if (query.length < 2) {
      setOwnerSearchResultsForScript(prev => ({ ...prev, [scriptId]: [] }))
      return
    }

    setIsSearchingOwnerForScript(prev => ({ ...prev, [scriptId]: true }))
    try {
      const response = await scriptsApi.searchUsers(query)
      setOwnerSearchResultsForScript(prev => ({ ...prev, [scriptId]: response.data }))
    } catch (error) {
      console.error('Ошибка поиска пользователей:', error)
      setOwnerSearchResultsForScript(prev => ({ ...prev, [scriptId]: [] }))
    } finally {
      setIsSearchingOwnerForScript(prev => ({ ...prev, [scriptId]: false }))
    }
  }

  const handleOwnerSearchChangeForScript = (scriptId: string, query: string) => {
    setOwnerSearchForScript(prev => ({ ...prev, [scriptId]: query }))
    searchOwnersForScript(scriptId, query)
  }

  const handleOwnerSelectForScript = async (scriptId: string, user: any) => {
    setIsChangingOwner(scriptId)
    try {
      await adminApi.updateScriptOwner(scriptId, user.id)
      showSuccessToast(`Владелец скрипта изменен на ${user.username}`)
      setEditingOwnerId(null)
      setOwnerSearchForScript(prev => {
        const newState = { ...prev }
        delete newState[scriptId]
        return newState
      })
      setOwnerSearchResultsForScript(prev => {
        const newState = { ...prev }
        delete newState[scriptId]
        return newState
      })
      await loadScripts()
    } catch (error) {
      console.error('Ошибка смены владельца:', error)
    } finally {
      setIsChangingOwner(null)
    }
  }

  const closeOwnerEdit = (scriptId: string) => {
    setEditingOwnerId(null)
    setOwnerSearchForScript(prev => {
      const newState = { ...prev }
      delete newState[scriptId]
      return newState
    })
    setOwnerSearchResultsForScript(prev => {
      const newState = { ...prev }
      delete newState[scriptId]
      return newState
    })
  }

  const resetCreateForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'CUSTOM',
      serverId: '',
      autoUpdate: false,
    })
    setOwnerSearch('')
    setOwnerSearchResults([])
    setSelectedOwner(null)
    setServerScriptsStats(null)
    setShowCreateForm(false)
    setIsTypeDropdownOpen(false)
    setIsServerDropdownOpen(false)
  }

  const openCreateForm = () => {
    setShowCreateForm(true)
    if (servers.length === 0) {
      loadServers()
    }
  }

  const filteredScripts = useMemo(() => {
    let filtered = scripts

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(script => script.type === typeFilter)
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(script =>
        script.name.toLowerCase().includes(searchLower) ||
        script.owner?.username?.toLowerCase().includes(searchLower) ||
        script.owner?.email?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [scripts, typeFilter, searchTerm])

  const getScriptTypeLabel = (type: string) => {
    switch (type) {
      case 'CUSTOM':
        return t('scripts.custom')
      case 'CYBER_LEAGUE':
        return t('scripts.cyberLeague')
      case 'WEEKLY_CUP':
        return t('scripts.weeklyCup')
      case 'ALLIANCE_BOT':
        return t('scripts.allianceBot')
      default:
        return type
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
    <>
      <div className="space-y-6">
      {showCreateForm && (
        <div className="bg-[#151515] shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {t('admin.scripts.createTitle')}
              </h3>
              <button
                onClick={resetCreateForm}
                className="p-2 text-[#f3f3f398] hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScript} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('admin.scripts.nameLabel')}
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={t('admin.scripts.namePlaceholder')}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('admin.scripts.descriptionLabel')}
                </label>
                <div className="mt-1">
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="input"
                    placeholder={t('admin.scripts.descriptionPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  {t('admin.scripts.typeLabel')}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                    className="inline-flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all justify-between text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] hover:bg-[#1f1f1f] min-h-[40px]"
                  >
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4 text-[#a476ff]" />
                      <span>{getScriptTypeLabel(formData.type)}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTypeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsTypeDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20">
                        <div className="p-2">
                          {(['CUSTOM', 'CYBER_LEAGUE', 'WEEKLY_CUP', 'ALLIANCE_BOT'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, type }))
                                setIsTypeDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                formData.type === type
                                  ? 'bg-[#151515] text-[#dfdfdf]'
                                  : 'text-[#dfdfdf] hover:bg-[#151515]'
                              }`}
                            >
                              <Bot className="h-4 w-4 text-[#a476ff]" />
                              <span>{getScriptTypeLabel(type)}</span>
                              {formData.type === type && (
                                <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#f3f3f398]">
                  {formData.type === 'CUSTOM' && t('admin.scripts.typeHint.custom')}
                  {formData.type === 'CYBER_LEAGUE' && t('admin.scripts.typeHint.cyberLeague')}
                  {formData.type === 'WEEKLY_CUP' && t('admin.scripts.typeHint.weeklyCup')}
                  {formData.type === 'ALLIANCE_BOT' && t('admin.scripts.typeHint.allianceBot')}
                </p>
              </div>

              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('admin.scripts.ownerLabel')}
                </label>
                <div className="mt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f3f3f398] dark:text-slate-500" />
                    <input
                      type="text"
                      value={ownerSearch}
                      onChange={handleOwnerSearchChange}
                      className="input pl-10"
                      placeholder={t('admin.scripts.ownerSearchPlaceholder')}
                      required
                    />
                  </div>

                  {ownerSearchResults.length > 0 && (
                    <div className="mt-2 border border-[#ffffff10] rounded-lg max-h-48 overflow-y-auto bg-[#151515]">
                      {ownerSearchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleOwnerSelect(user)}
                          className="p-3 hover:bg-[#ffffff10] cursor-pointer border-b border-[#ffffff10] last:border-b-0"
                        >
                          <div className="font-medium text-[#dfdfdf]">{user.username}</div>
                          <div className="text-sm text-[#f3f3f398]">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isSearchingOwners && (
                    <div className="mt-2 text-center py-2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>

                {selectedOwner && (
                  <div className="mt-2 p-3 bg-[#a476ff20] border border-[#a476ff40] rounded-lg">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-[#a476ff] mr-2" />
                      <div>
                        <div className="font-medium text-[#dfdfdf]">Выбранный владелец:</div>
                        <div className="text-sm text-[#a476ff]">{selectedOwner.username} ({selectedOwner.email})</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="serverId" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  {t('admin.scripts.serverLabel')}
                </label>
                <div className="relative">
                  {isLoadingServers ? (
                    <div className="flex items-center px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#ffffff10] min-h-[40px]">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-[#f3f3f398]">
                        {t('admin.scripts.loadingServers')}
                      </span>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                        disabled={servers.length === 0}
                        className="inline-flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all justify-between text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] hover:bg-[#1f1f1f] min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center space-x-2">
                          <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                          <span>
                            {formData.serverId
                              ? servers.find(s => s.id === formData.serverId)
                                ? `${servers.find(s => s.id === formData.serverId)?.name} (${servers.find(s => s.id === formData.serverId)?.host})`
                                : 'Выберите сервер'
                              : 'Выберите сервер'}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isServerDropdownOpen && servers.length > 0 && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsServerDropdownOpen(false)}
                          />
                          <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                            <div className="p-2">
                              {servers.map((server) => (
                                <button
                                  key={server.id}
                                  type="button"
                                  onClick={async () => {
                                    setFormData(prev => ({ ...prev, serverId: server.id }))
                                    setIsServerDropdownOpen(false)
                                    setIsLoadingServerStats(true)
                                    try {
                                      const response = await adminApi.getServerScriptsStats(server.id)
                                      setServerScriptsStats(prev => ({ ...prev, [server.id]: response.data }))
                                    } catch (error) {
                                      console.error('Ошибка загрузки статистики сервера:', error)
                                    } finally {
                                      setIsLoadingServerStats(false)
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                    formData.serverId === server.id
                                      ? 'bg-[#151515] text-[#dfdfdf]'
                                      : 'text-[#dfdfdf] hover:bg-[#151515]'
                                  }`}
                                >
                                  <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                                  <div className="flex-1">
                                    <div className="font-medium">{server.name}</div>
                                    <div className="text-xs text-[#f3f3f398]">{server.host}:{server.port}</div>
                                  </div>
                                  {formData.serverId === server.id && (
                                    <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                {servers.length === 0 && !isLoadingServers && (
                  <p className="mt-2 text-sm text-red-400">
                    {t('admin.scripts.noServers')}
                  </p>
                )}
                {formData.serverId && serverScriptsStats && serverScriptsStats[formData.serverId] && (
                  <div className="mt-3 p-3 bg-[#151515] border border-[#ffffff10] rounded-lg">
                    <div className="text-xs font-medium text-[#a476ff] mb-2">Статистика скриптов на сервере:</div>
                    <div className="space-y-1">
                      <div className="text-sm text-[#dfdfdf]">
                        {t('admin.scripts.serverStats.total')}{' '}
                        <span className="font-medium text-[#a476ff]">
                          {serverScriptsStats[formData.serverId].total}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {serverScriptsStats[formData.serverId].byType.CUSTOM > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-[#f3f3f398] bg-[#1a1a1a] border border-[#ffffff10]">
                            Пользовательские: {serverScriptsStats[formData.serverId].byType.CUSTOM}
                          </span>
                        )}
                        {serverScriptsStats[formData.serverId].byType.CYBER_LEAGUE > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-blue-400 bg-blue-500/20 border border-blue-500/40">
                            Cyber League: {serverScriptsStats[formData.serverId].byType.CYBER_LEAGUE}
                          </span>
                        )}
                        {serverScriptsStats[formData.serverId].byType.WEEKLY_CUP > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-green-400 bg-green-500/20 border border-green-500/40">
                            Weekly Cup: {serverScriptsStats[formData.serverId].byType.WEEKLY_CUP}
                          </span>
                        )}
                        {serverScriptsStats[formData.serverId].byType.ALLIANCE_BOT > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-purple-400 bg-purple-500/20 border border-purple-500/40">
                            Союзный бот: {serverScriptsStats[formData.serverId].byType.ALLIANCE_BOT}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {isLoadingServerStats && (
                  <div className="mt-3 flex items-center space-x-2 text-sm text-[#f3f3f398]">
                    <LoadingSpinner size="sm" />
                    <span>{t('admin.scripts.loadingServerStats')}</span>
                  </div>
                )}
              </div>

              {formData.type !== 'CUSTOM' && (
                <div className="relative">
                  <div className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                    formData.autoUpdate
                      ? 'border-[#a476ff] bg-[#a476ff10]'
                      : 'border-[#ffffff10] bg-[#1a1a1a] hover:border-[#ffffff20]'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          formData.autoUpdate
                            ? 'bg-[#a476ff20] text-[#a476ff]'
                            : 'bg-[#ffffff10] text-[#f3f3f398]'
                        }`}>
                          <RefreshCw className={`h-5 w-5 ${formData.autoUpdate ? 'animate-spin-slow' : ''}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold text-[#dfdfdf]">
                              {t('admin.scripts.autoUpdateTitle')}
                            </h4>
                            {formData.autoUpdate && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#a476ff20] text-[#a476ff] border border-[#a476ff40]">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {t('admin.scripts.autoUpdateActive')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#f3f3f398] leading-relaxed">
                            {t('admin.scripts.autoUpdateDescription')}{' '}
                            <span className="font-medium text-[#a476ff]">
                              {formData.type === 'CYBER_LEAGUE'
                                ? 'MCL_Template'
                                : formData.type === 'WEEKLY_CUP'
                                  ? 'Weekly_Template'
                                  : 'Alliance_Template'}
                            </span>
                            . {t('admin.scripts.autoUpdateDependencies')}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                        <input
                          type="checkbox"
                          name="autoUpdate"
                          checked={formData.autoUpdate || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, autoUpdate: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-[#ffffff10] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#a476ff40] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#a476ff]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="btn btn-secondary btn-xs"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreating || servers.length === 0}
                  className="btn btn-primary btn-xs"
                >
                  {isCreating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-1">{t('admin.scripts.creating')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t('common.create')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {t('admin.scripts.title')}
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f3f3f398]" />
                <input
                  type="text"
                  placeholder={t('admin.scripts.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            <button
              onClick={openCreateForm}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
                {t('admin.scripts.createButton')}
            </button>
            </div>
          </div>

          {scripts.length > 0 && (
            <div className="mb-4 bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl p-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-[#a476ff]" />
                    <span className="text-sm font-medium text-[#dfdfdf]">
                      {t('scripts.filter')}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'CUSTOM', 'CYBER_LEAGUE', 'WEEKLY_CUP', 'ALLIANCE_BOT'] as ScriptTypeFilter[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        typeFilter === type
                          ? 'bg-[#a476ff] text-white border border-[#a476ff]'
                          : 'bg-[#151515] text-[#dfdfdf] border border-[#ffffff10] hover:border-[#ffffff20] hover:bg-[#1f1f1f]'
                      }`}
                    >
                      {type === 'ALL' ? t('scripts.all') : getScriptTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ffffff10] rounded-lg overflow-hidden">
              <thead className="bg-[#1a1a1a] border-b border-[#ffffff10]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.scripts.table.script')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.scripts.table.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.scripts.table.owner')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.scripts.table.server')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('scriptDetail.created')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('scriptDetail.expires')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('admin.scripts.table.autoUpdate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                    {t('scriptDetail.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#151515] divide-y divide-[#ffffff10]">
                {filteredScripts && filteredScripts.length > 0 ? filteredScripts.map((script) => (
                  <tr key={script.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {editingScriptName === script.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingScriptNameValue}
                              onChange={(e) => setEditingScriptNameValue(e.target.value)}
                              onKeyDown={(e) => handleNameInputKeyDown(e, script.id)}
                              onBlur={() => {

                                if (savingScriptNameRef.current !== script.id && !isRenaming) {
                                  handleSaveScriptName(script.id)
                                }
                              }}
                              className="input text-sm font-medium flex-1 min-w-[200px]"
                              autoFocus
                              disabled={isRenaming}
                            />
                            {isRenaming && (
                              <LoadingSpinner size="sm" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group">
                        <div className="text-sm font-medium text-[#dfdfdf]">{script.name}</div>
                            <button
                              onClick={() => handleStartEditName(script)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#ffffff10] rounded"
                              title="Изменить имя скрипта"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#a476ff] hover:text-[#b890ff]" />
                            </button>
                          </div>
                        )}
                        <div className="text-sm text-[#f3f3f398]">{script.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        script.type === 'CUSTOM'
                          ? 'text-[#f3f3f398] bg-[#1a1a1a] border-[#ffffff10]' :
                        script.type === 'CYBER_LEAGUE'
                          ? 'text-blue-400 bg-blue-500/20 border-blue-500/40' :
                        script.type === 'WEEKLY_CUP'
                          ? 'text-green-400 bg-green-500/20 border-green-500/40' :
                          'text-purple-400 bg-purple-500/20 border-purple-500/40'
                      }`}>
                        {getScriptTypeLabel(script.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative" data-owner-edit={script.id}>
                        {editingOwnerId === script.id ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="text"
                                value={ownerSearchForScript[script.id] || ''}
                                onChange={(e) => handleOwnerSearchChangeForScript(script.id, e.target.value)}
                                onBlur={() => {


                                  setTimeout(() => {
                                    if (!isChangingOwner || isChangingOwner !== script.id) {
                                      closeOwnerEdit(script.id)
                                    }
                                  }, 200)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    closeOwnerEdit(script.id)
                                  }
                                }}
                                placeholder="Поиск пользователя..."
                                className="input text-sm w-full min-w-[200px]"
                                autoFocus
                              />
                              {isSearchingOwnerForScript[script.id] && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  <LoadingSpinner size="sm" />
                                </div>
                              )}
                            </div>
                            {ownerSearchResultsForScript[script.id] && ownerSearchResultsForScript[script.id].length > 0 && (
                              <div className="absolute z-20 mt-1 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {ownerSearchResultsForScript[script.id].map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleOwnerSelectForScript(script.id, user)}
                                    onMouseDown={(e) => {

                                      e.preventDefault()
                                    }}
                                    disabled={isChangingOwner === script.id}
                                    className="w-full text-left px-3 py-2 text-sm rounded transition-colors hover:bg-[#151515] flex items-center space-x-2 disabled:opacity-50"
                                  >
                                    <User className="h-4 w-4 text-[#a476ff]" />
                                    <div className="flex-1">
                                      <div className="font-medium text-[#dfdfdf]">{user.username}</div>
                                      <div className="text-xs text-[#f3f3f398]">{user.email}</div>
                                    </div>
                                    {isChangingOwner === script.id && (
                                      <LoadingSpinner size="sm" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="group">
                            <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-[#dfdfdf]">{script.owner?.username}</div>
                              <button
                                onClick={() => setEditingOwnerId(script.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#ffffff10] rounded"
                                title="Изменить владельца"
                              >
                                <Pencil className="h-3.5 w-3.5 text-[#a476ff] hover:text-[#b890ff]" />
                              </button>
                            </div>
                        <div className="text-sm text-[#f3f3f398]">{script.owner?.email}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#dfdfdf]">{script.server.name}</div>
                      <div className="text-sm text-[#f3f3f398]">{script.server.host}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(script.status)}`}>
                          {getStatusText(script.status)}
                        </span>
                        {isScriptFrozen(script.frozenAt, script.frozenUntil) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-400 bg-blue-500/20 border border-blue-500/40">
                            {t('scriptCard.frozen')}
                          </span>
                        )}
                        {script.expiryDate && (getExpiryStatus(script.expiryDate) === 'expired' || getExpiryStatus(script.expiryDate) === 'expiring-soon') && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getExpiryStatus(script.expiryDate) === 'expired' ? 'text-red-400 bg-red-500/20 border border-red-500/40' :
                            'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40'
                          }`}>
                            {isScriptExpired(script.expiryDate)
                              ? t('scriptDetail.expired')
                              : t('scripts.expiringSoon')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f3f3f398]">
                      {formatDate(script.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f3f3f398]">
                      {script.expiryDate ? formatDate(script.expiryDate) : t('scriptCard.frozenForever')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {script.type !== 'CUSTOM' ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={script.autoUpdate || false}
                            onChange={() => handleToggleAutoUpdate(script.id, script.autoUpdate || false)}
                            disabled={autoUpdateLoading === script.id}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#ffffff10] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#a476ff40] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a476ff]"></div>
                          {autoUpdateLoading === script.id && (
                            <LoadingSpinner size="sm" className="ml-2" />
                          )}
                        </label>
                      ) : (
                        <span className="text-xs text-[#f3f3f398]">
                          {t('admin.scripts.autoUpdateUnavailable')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleScriptAction(script.id, 'start')}
                          disabled={actionLoading === script.id || script.status === 'RUNNING' || script.status === 'EXPIRED' || isScriptExpired(script.expiryDate)}
                          className="btn btn-success btn-sm disabled:opacity-50"
                          title={
                            script.status === 'EXPIRED' || isScriptExpired(script.expiryDate)
                              ? t('scriptDetail.expired')
                              : t('scriptDetail.start')
                          }
                        >
                          <Play className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleScriptAction(script.id, 'stop')}
                          disabled={actionLoading === script.id || script.status === 'STOPPED'}
                          className="btn btn-danger btn-sm disabled:opacity-50"
                          title={t('scriptDetail.stop')}
                        >
                          <Square className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleScriptAction(script.id, 'restart')}
                          disabled={actionLoading === script.id || script.status === 'EXPIRED' || isScriptExpired(script.expiryDate)}
                          className="btn btn-primary btn-sm disabled:opacity-50"
                          title={
                            script.status === 'EXPIRED' || isScriptExpired(script.expiryDate)
                              ? t('scriptDetail.expired')
                              : t('scriptDetail.restart')
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleShowLogs(script)}
                          className="btn btn-secondary btn-sm"
                          title={t('scriptDetail.showLogs')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => openExtendModal(script)}
                          className="btn btn-secondary btn-sm"
                          title={t('admin.scripts.extendTooltip')}
                        >
                          <Calendar className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleRevokeScript(script.id)}
                          className="btn btn-danger btn-sm"
                          title={t('admin.scripts.revokeTooltip')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : scripts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Bot className="mx-auto h-12 w-12 text-[#f3f3f398]" />
                        <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Нет скриптов</h3>
                        <p className="mt-1 text-sm text-[#f3f3f398]">
                          {t('dashboard.createFirst')}
                        </p>
                        <div className="mt-6">
                          <button
                            onClick={openCreateForm}
                            className="btn btn-primary"
                          >
                            <Plus className="h-4 w-4" />
                            {t('admin.scripts.createButton')}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Bot className="mx-auto h-12 w-12 text-[#f3f3f398]" />
                        <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">
                          {t('scripts.noScriptsType')}
                        </h3>
                        <p className="mt-1 text-sm text-[#f3f3f398]">
                          {t('scripts.tryOther')}
                        </p>
                      </div>
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
                {typeFilter !== 'ALL' && (
                  <span className="ml-2 text-[#a476ff]">
                    {t('admin.scripts.filteredCount', {
                      count: filteredScripts.length,
                    })}
                  </span>
                )}
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

      {showExtendModal && selectedScript && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#151515] rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-[#ffffff10]">
              <div className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-[#a476ff]" />
                <h3 className="text-lg font-semibold text-[#dfdfdf]">
                  Продление скрипта
                </h3>
              </div>
              <button
                onClick={() => setShowExtendModal(false)}
                className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 border-b border-[#ffffff10] bg-[#1a1a1a]">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-[#f3f3f398]" />
                  <span className="text-sm font-medium text-[#dfdfdf]">Скрипт:</span>
                  <span className="text-sm text-[#dfdfdf]">{selectedScript.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[#f3f3f398]" />
                  <span className="text-sm font-medium text-[#dfdfdf]">Истекает:</span>
                  <span className="text-sm text-[#dfdfdf]">
                    {selectedScript.expiryDate ? formatDate(selectedScript.expiryDate) : 'Бессрочно'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#dfdfdf] mb-3">
                    Способ продления
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      extendType === 'days'
                        ? 'border-[#a476ff] bg-[#a476ff20]'
                        : 'border-[#ffffff10] hover:border-[#ffffff20]'
                    }`}>
                      <input
                        type="radio"
                        value="days"
                        checked={extendType === 'days'}
                        onChange={(e) => setExtendType(e.target.value as 'days')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        extendType === 'days'
                          ? 'border-[#a476ff] bg-[#a476ff]'
                          : 'border-[#ffffff10]'
                      }`}>
                        {extendType === 'days' && <div className="w-2 h-2 rounded-full bg-[#101010]"></div>}
                      </div>
                      <Clock className="h-4 w-4 mr-2 text-[#f3f3f398]" />
                      <span className="text-sm font-medium text-[#dfdfdf]">На количество дней</span>
                    </label>
                    <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      extendType === 'date'
                        ? 'border-[#a476ff] bg-[#a476ff20]'
                        : 'border-[#ffffff10] hover:border-[#ffffff20]'
                    }`}>
                      <input
                        type="radio"
                        value="date"
                        checked={extendType === 'date'}
                        onChange={(e) => setExtendType(e.target.value as 'date')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        extendType === 'date'
                          ? 'border-[#a476ff] bg-[#a476ff]'
                          : 'border-[#ffffff10]'
                      }`}>
                        {extendType === 'date' && <div className="w-2 h-2 rounded-full bg-[#101010]"></div>}
                      </div>
                      <Calendar className="h-4 w-4 mr-2 text-[#f3f3f398]" />
                      <span className="text-sm font-medium text-[#dfdfdf]">До конкретной даты</span>
                    </label>
                    <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      extendType === 'unlimited'
                        ? 'border-[#a476ff] bg-[#a476ff20]'
                        : 'border-[#ffffff10] hover:border-[#ffffff20]'
                    }`}>
                      <input
                        type="radio"
                        value="unlimited"
                        checked={extendType === 'unlimited'}
                        onChange={(e) => setExtendType(e.target.value as 'unlimited')}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                        extendType === 'unlimited'
                          ? 'border-[#a476ff] bg-[#a476ff]'
                          : 'border-[#ffffff10]'
                      }`}>
                        {extendType === 'unlimited' && <div className="w-2 h-2 rounded-full bg-[#101010]"></div>}
                      </div>
                      <Crown className="h-4 w-4 mr-2 text-[#a476ff]" />
                      <span className="text-sm font-medium text-[#dfdfdf]">Бессрочно</span>
                    </label>
                  </div>
                </div>

                {extendType === 'days' && (
                  <div className="space-y-3">
                    <label htmlFor="extendDays" className="block text-sm font-medium text-[#dfdfdf]">
                      Количество дней
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="extendDays"
                        value={extendDays}
                        onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                        className="input w-full"
                        min="1"
                        max="3650"
                        placeholder="30"
                      />
                    </div>
                    <div className="p-3 bg-[#a476ff20] rounded-lg border border-[#a476ff40]">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-[#a476ff]" />
                        <span className="text-sm font-medium text-[#dfdfdf]">Новое окончание:</span>
                        <span className="text-sm text-[#a476ff]">
                          {(() => {
                            const currentDate = selectedScript.expiryDate ? new Date(selectedScript.expiryDate) : new Date()
                            const newDate = new Date(currentDate.getTime() + extendDays * 24 * 60 * 60 * 1000)
                            return newDate.toLocaleDateString('ru-RU')
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {extendType === 'date' && (
                  <div className="space-y-3">
                    <label htmlFor="extendDate" className="block text-sm font-medium text-[#dfdfdf]">
                      Дата окончания
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="extendDate"
                        value={extendDate}
                        onChange={(e) => setExtendDate(e.target.value)}
                        className="input w-full"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    {extendDate && (
                      <div className="p-3 bg-[#a476ff20] rounded-lg border border-[#a476ff40]">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-[#a476ff]" />
                          <span className="text-sm font-medium text-[#dfdfdf]">Продление на:</span>
                          <span className="text-sm text-[#a476ff]">
                            {(() => {
                              const targetDate = new Date(extendDate)
                              const currentDate = selectedScript.expiryDate ? new Date(selectedScript.expiryDate) : new Date()
                              const days = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
                              return `${days} дней`
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-[#ffffff10] bg-[#1a1a1a]">
              <button
                onClick={() => setShowExtendModal(false)}
                className="btn btn-secondary btn-sm"
                disabled={isExtending}
              >
                Отмена
              </button>
              <button
                onClick={handleExtendScript}
                disabled={isExtending || (extendType === 'days' && extendDays <= 0) || (extendType === 'date' && !extendDate)}
                className="btn btn-primary btn-sm"
              >
                {isExtending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Продление...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span className="ml-2">Продлить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showLogsModal && selectedScriptForLogs && createPortal(
        <ScriptLogsModal
          script={selectedScriptForLogs}
          onClose={() => {
            setShowLogsModal(false)
            setSelectedScriptForLogs(null)
          }}
        />,
        document.body
      )}
    </>
  )
}
