import { useState, useEffect } from 'react'
import { Plus, Server, Key, TestTube, Trash2, Edit2, ChevronDown, CheckCircle, User as UserIcon, FolderOpen, X } from 'lucide-react'
import { adminApi } from '../../services/api'
import { Server as ServerType } from '../../types'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'
import { useOptimizedList } from '../../hooks/useOptimizedList'
import SftpFileManager from './SftpFileManager'


export default function AdminServers() {
  const {
    items: servers,
    setItems: setServers,
    isLoading,
    setIsLoading,
    addItem: addServer,
    updateItem: updateServer,
    removeItem: removeServer
  } = useOptimizedList<ServerType>({ idField: 'id' })

  const {
    items: sshKeys,
    setItems: setSshKeys
  } = useOptimizedList<any>({ idField: 'id' })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingServer, setEditingServer] = useState<ServerType | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isKeyDropdownOpen, setIsKeyDropdownOpen] = useState(false)
  const [showSftpManager, setShowSftpManager] = useState(false)
  const [selectedServerForSftp, setSelectedServerForSftp] = useState<ServerType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    sshUser: 'root',
    keyId: '',
  })

  useEffect(() => {
    loadServers()
    loadSshKeys()
  }, [])

  const loadServers = async () => {
    try {
      const response = await adminApi.getServers()
      setServers(response.data)
    } catch (error) {

      console.error('Ошибка загрузки серверов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSshKeys = async () => {
    try {
      const response = await adminApi.getServerKeys()
      setSshKeys(response.data)
    } catch (error) {
      console.error('Ошибка загрузки SSH ключей:', error)
    }
  }

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.host.trim()) {
      showErrorToast('Название и хост сервера обязательны')
      return
    }

    setIsCreating(true)
    try {

      const serverData = {
        ...formData,
        port: parseInt(formData.port.toString()) || 22,
        keyId: formData.keyId.trim() || undefined
      }
      const response = await adminApi.createServer(serverData)
      showSuccessToast('Сервер создан успешно')

      addServer(response.data)
      setShowCreateForm(false)
      setFormData({ name: '', host: '', port: 22, sshUser: 'root', keyId: '' })
    } catch (error: any) {

      console.error('Ошибка создания сервера:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value
    }))
  }

  const handleDeleteServer = async (serverId: string, serverName: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить сервер "${serverName}"?`)) {
      try {
        await adminApi.deleteServer(serverId)
        showSuccessToast('Сервер удален успешно')

        removeServer(serverId)
      } catch (error: any) {

        console.error('Ошибка удаления сервера:', error)
      }
    }
  }

  const handleTestConnection = async (serverId: string) => {
    try {
      const response = await adminApi.testServerConnection(serverId)
      if (response.data.success) {
        showSuccessToast('Соединение успешно установлено')
      } else {
        showErrorToast('Не удалось установить соединение')
      }
    } catch (error: any) {

      console.error('Ошибка тестирования соединения:', error)
    }
  }

  const handleEditServer = (server: ServerType) => {
    setEditingServer(server)
    setFormData({
      name: server.name,
      host: server.host,
      port: server.port,
      sshUser: server.sshUser,
      keyId: server.keyId || '',
    })
    setShowCreateForm(true)
    setIsKeyDropdownOpen(false)
  }

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingServer) return

    if (!formData.name.trim() || !formData.host.trim()) {
      showErrorToast('Название и хост сервера обязательны')
      return
    }

    setIsUpdating(true)
    try {
      const serverData = {
        ...formData,
        port: parseInt(formData.port.toString()) || 22,
        keyId: formData.keyId.trim() || undefined
      }
      const response = await adminApi.updateServer(editingServer.id, serverData)
      showSuccessToast('Сервер обновлен успешно')

      updateServer(editingServer.id, response.data)
      setShowCreateForm(false)
      setEditingServer(null)
      setFormData({ name: '', host: '', port: 22, sshUser: 'root', keyId: '' })
    } catch (error: any) {

      console.error('Ошибка обновления сервера:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setShowCreateForm(false)
    setEditingServer(null)
    setFormData({ name: '', host: '', port: 22, sshUser: 'root', keyId: '' })
    setIsKeyDropdownOpen(false)
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
      {showCreateForm && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {editingServer ? 'Редактирование сервера' : 'Создание нового сервера'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-[#f3f3f398] hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingServer ? handleUpdateServer : handleCreateServer} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#dfdfdf] mb-3">
                    Название сервера *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input min-h-[40px]"
                    placeholder="Мой сервер"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="host" className="block text-sm font-medium text-[#dfdfdf] mb-3">
                    Хост/IP *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="host"
                      id="host"
                      value={formData.host}
                      onChange={handleInputChange}
                      className="input pl-10 min-h-[40px]"
                      placeholder="192.168.1.100"
                      required
                    />
                    <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#a476ff]" />
                  </div>
                </div>

                <div>
                  <label htmlFor="port" className="block text-sm font-medium text-[#dfdfdf] mb-3">
                    Порт
                  </label>
                  <input
                    type="number"
                    name="port"
                    id="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    className="input min-h-[40px]"
                    min="1"
                    max="65535"
                    placeholder="22"
                  />
                </div>

                <div>
                  <label htmlFor="sshUser" className="block text-sm font-medium text-[#dfdfdf] mb-3">
                    SSH пользователь
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="sshUser"
                      id="sshUser"
                      value={formData.sshUser}
                      onChange={handleInputChange}
                      className="input pl-10 min-h-[40px]"
                      placeholder="root"
                    />
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#a476ff]" />
                  </div>
                </div>

                <div>
                  <label htmlFor="keyId" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                    SSH ключ
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsKeyDropdownOpen(!isKeyDropdownOpen)}
                      className="inline-flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all justify-between text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] hover:bg-[#1f1f1f] min-h-[40px]"
                    >
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4 text-[#a476ff]" />
                        <span>
                          {formData.keyId
                            ? sshKeys.find(k => k.id === formData.keyId)?.label || 'Выберите SSH ключ...'
                            : 'Выберите SSH ключ (опционально)'}
                        </span>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isKeyDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isKeyDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsKeyDropdownOpen(false)}
                        />
                        <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                          <div className="p-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, keyId: '' }))
                                setIsKeyDropdownOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                !formData.keyId
                                  ? 'bg-[#151515] text-[#dfdfdf]'
                                  : 'text-[#dfdfdf] hover:bg-[#151515]'
                              }`}
                            >
                              <Key className="h-4 w-4 text-[#a476ff]" />
                              <span>Не использовать ключ</span>
                              {!formData.keyId && (
                                <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                              )}
                            </button>
                            {sshKeys.map((key) => (
                              <button
                                key={key.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, keyId: key.id }))
                                  setIsKeyDropdownOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                  formData.keyId === key.id
                                    ? 'bg-[#151515] text-[#dfdfdf]'
                                    : 'text-[#dfdfdf] hover:bg-[#151515]'
                                }`}
                              >
                                <Key className="h-4 w-4 text-[#a476ff]" />
                                <span>{key.label}</span>
                                {formData.keyId === key.id && (
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
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary btn-sm"
                  disabled={isCreating || isUpdating}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="btn btn-primary btn-sm"
                >
                  {(isCreating || isUpdating) ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">{editingServer ? 'Обновление...' : 'Создание...'}</span>
                    </>
                  ) : (
                    <>
                      {editingServer ? (
                        <>
                          <span>Обновить</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span className="ml-2">Создать сервер</span>
                        </>
                      )}
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
            <div>
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                Управление серверами
              </h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                Настройка серверов для размещения скриптов
              </p>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => {
                  setEditingServer(null)
                  setFormData({ name: '', host: '', port: 22, sshUser: 'root', keyId: '' })
                  setShowCreateForm(true)
                  setIsKeyDropdownOpen(false)
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4" />
                Добавить сервер
              </button>
            )}
          </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {servers && servers.map((server) => (
          <div key={server.id} className="card shadow-lg">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-[#dfdfdf]">{server.name}</h4>
              </div>
            </div>

            <div className="card-content">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-[#f3f3f398]">
                  <Server className="h-4 w-4 mr-2" />
                  <span>{server.host}:{server.port}</span>
                </div>
                <div className="flex items-center text-sm text-[#f3f3f398]">
                  <span className="font-medium">Пользователь:</span>
                  <span className="ml-2">{server.sshUser}</span>
                </div>
                <div className="flex items-center text-sm text-[#f3f3f398]">
                  <Key className="h-4 w-4 mr-2" />
                  <span>{server.key?.label || 'Ключ не настроен'}</span>
                </div>
                {server._count && (
                  <div className="flex items-center text-sm text-[#f3f3f398]">
                    <span className="font-medium">Скриптов:</span>
                    <span className="ml-2">{server._count.scripts}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card-footer">
              <div className="space-y-3">
                <div className="flex space-x-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedServerForSftp(server)
                      setShowSftpManager(true)
                    }}
                    className="btn btn-primary btn-sm"
                    title="Открыть файловый менеджер"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">SFTP</span>
                  </button>
                  <button
                    onClick={() => handleEditServer(server)}
                    className="btn btn-secondary btn-sm"
                    title="Изменить сервер"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTestConnection(server.id)}
                    className="btn btn-secondary btn-sm"
                    title="Тестировать соединение"
                  >
                    <TestTube className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteServer(server.id, server.name)}
                    className="btn btn-danger btn-sm"
                    title="Удалить сервер"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-[#f3f3f398] text-left">
                  Создан: {new Date(server.createdAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {servers.length === 0 && (
        <div className="text-center py-12">
          <Server className="mx-auto h-12 w-12 text-[#f3f3f398]" />
          <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Нет серверов</h3>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            Добавьте первый сервер для размещения скриптов.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setEditingServer(null)
                setFormData({ name: '', host: '', port: 22, sshUser: 'root', keyId: '' })
                setShowCreateForm(true)
                setIsKeyDropdownOpen(false)
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              Добавить сервер
            </button>
          </div>
        </div>
      )}

          {servers.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#ffffff10]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-[#dfdfdf]">
                    Всего серверов: {servers.length}
                  </h3>
                  <p className="mt-1 text-sm text-[#f3f3f398]">
                    Управление серверами для размещения скриптов
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSftpManager && selectedServerForSftp && (
        <SftpFileManager
          serverId={selectedServerForSftp.id}
          serverName={selectedServerForSftp.name}
          onClose={() => {
            setShowSftpManager(false)
            setSelectedServerForSftp(null)
          }}
        />
      )}
    </div>
  )
}
