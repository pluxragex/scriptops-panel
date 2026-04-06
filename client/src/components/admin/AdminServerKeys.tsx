import { useState, useEffect } from 'react'
import { Plus, Key, Trash2, Edit2, X } from 'lucide-react'
import { adminApi } from '../../services/api'

import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'
import { useOptimizedList } from '../../hooks/useOptimizedList'

export default function AdminServerKeys() {
  const {
    items: keys,
    setItems: setKeys,
    isLoading,
    setIsLoading,
    addItem: addKey,
    updateItem: updateKey,
    removeItem: removeKey
  } = useOptimizedList<any>({ idField: 'id' })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingKey, setEditingKey] = useState<any>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [formData, setFormData] = useState({
    label: '',
    privateKey: '',
    publicKey: '',
  })

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      const response = await adminApi.getServerKeys()
      setKeys(response.data)
    } catch (error) {

      console.error('Ошибка загрузки SSH ключей:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.label.trim() || !formData.privateKey.trim()) {
      showErrorToast('Название и приватный ключ обязательны')
      return
    }

    setIsCreating(true)
    try {
      const response = await adminApi.createServerKey(formData)
      showSuccessToast('SSH ключ создан успешно')

      addKey(response.data)
      setShowCreateForm(false)
      setFormData({ label: '', privateKey: '', publicKey: '' })
    } catch (error: any) {

      console.error('Ошибка создания SSH ключа:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDeleteKey = async (keyId: string, keyLabel: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить SSH ключ "${keyLabel}"?`)) {
      try {
        await adminApi.deleteServerKey(keyId)
        showSuccessToast('SSH ключ удален успешно')

        removeKey(keyId)
      } catch (error: any) {

        console.error('Ошибка удаления SSH ключа:', error)
      }
    }
  }

  const handleEditKey = (key: any) => {
    setEditingKey(key)
    setFormData({
      label: key.label,
      privateKey: key.privateKey || '',
      publicKey: key.publicKey || '',
    })
    setShowCreateForm(true)
  }

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingKey) return

    if (!formData.label.trim() || !formData.privateKey.trim()) {
      showErrorToast('Название и приватный ключ обязательны')
      return
    }

    setIsUpdating(true)
    try {
      const response = await adminApi.updateServerKey(editingKey.id, formData)
      showSuccessToast('SSH ключ обновлен успешно')

      updateKey(editingKey.id, response.data)
      setShowCreateForm(false)
      setEditingKey(null)
      setFormData({ label: '', privateKey: '', publicKey: '' })
    } catch (error: any) {

      console.error('Ошибка обновления SSH ключа:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setShowCreateForm(false)
    setEditingKey(null)
    setFormData({ label: '', privateKey: '', publicKey: '' })
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
                {editingKey ? 'Редактирование SSH ключа' : 'Создание нового SSH ключа'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-[#f3f3f398] hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingKey ? handleUpdateKey : handleCreateKey} className="space-y-4">
              <div>
                <label htmlFor="label" className="block text-sm font-medium text-[#dfdfdf] mb-3">
                  Название ключа *
                </label>
                <input
                  type="text"
                  name="label"
                  id="label"
                  value={formData.label}
                  onChange={handleInputChange}
                  className="input min-h-[40px]"
                  placeholder="Мой SSH ключ"
                  required
                />
              </div>

              <div>
                <label htmlFor="privateKey" className="block text-sm font-medium text-[#dfdfdf] mb-3 flex items-center space-x-2">
                  <Key className="h-4 w-4 text-[#a476ff]" />
                  <span>Приватный ключ *</span>
                </label>
                <textarea
                  name="privateKey"
                  id="privateKey"
                  rows={8}
                  value={formData.privateKey}
                  onChange={handleInputChange}
                  className="input font-mono text-sm"
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                  required
                />
                <p className="mt-2 text-sm text-[#f3f3f398]">
                  Вставьте содержимое приватного ключа (начинается с -----BEGIN)
                </p>
              </div>

              <div>
                <label htmlFor="publicKey" className="block text-sm font-medium text-[#dfdfdf] mb-3 flex items-center space-x-2">
                  <Key className="h-4 w-4 text-[#a476ff]" />
                  <span>Публичный ключ (опционально)</span>
                </label>
                <textarea
                  name="publicKey"
                  id="publicKey"
                  rows={3}
                  value={formData.publicKey}
                  onChange={handleInputChange}
                  className="input font-mono text-sm"
                  placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC..."
                />
                <p className="mt-2 text-sm text-[#f3f3f398]">
                  Публичный ключ (обычно начинается с ssh-rsa, ssh-ed25519 и т.д.)
                </p>
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
                      <span className="ml-2">{editingKey ? 'Обновление...' : 'Создание...'}</span>
                    </>
                  ) : (
                    <>
                      {editingKey ? (
                        <>
                          <span>Обновить</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span className="ml-2">Создать ключ</span>
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
                SSH ключи серверов
              </h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                Управление SSH ключами для подключения к серверам
              </p>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => {
                  setEditingKey(null)
                  setFormData({ label: '', privateKey: '', publicKey: '' })
                  setShowCreateForm(true)
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4" />
                Добавить ключ
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {keys && keys.map((key) => (
          <div key={key.id} className="card shadow-lg">
            <div className="card-header">
              <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-[#f3f3f398] mr-2" />
                <h4 className="text-lg font-medium text-[#dfdfdf]">{key.label}</h4>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditKey(key)}
                    className="btn btn-secondary btn-xs"
                    title="Изменить SSH ключ"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id, key.label)}
                    className="btn btn-danger btn-xs"
                    title="Удалить SSH ключ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="card-content">
              <div className="space-y-2">
                <div className="text-sm text-[#f3f3f398]">
                  <span className="font-medium">ID:</span> {key.id}
                </div>
                {key.publicKey && (
                  <div className="text-sm text-[#f3f3f398]">
                    <span className="font-medium">Публичный ключ:</span>
                    <div className="mt-1 font-mono text-xs bg-[#ffffff10] p-2 rounded break-all">
                      {key.publicKey}
                    </div>
                  </div>
                )}
                {key._count && (
                  <div className="text-sm text-[#f3f3f398]">
                    <span className="font-medium">Используется на серверах:</span> {key._count.servers}
                  </div>
                )}
              </div>
            </div>

            <div className="card-footer">
                <div className="text-xs text-[#f3f3f398] text-left">
                  Создан: {new Date(key.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {keys.length === 0 && (
        <div className="text-center py-12">
          <Key className="mx-auto h-12 w-12 text-[#f3f3f398]" />
          <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Нет SSH ключей</h3>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            Добавьте первый SSH ключ для подключения к серверам.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setEditingKey(null)
                setFormData({ label: '', privateKey: '', publicKey: '' })
                setShowCreateForm(true)
              }}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4" />
              Добавить ключ
            </button>
          </div>
        </div>
      )}

          {keys.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#ffffff10]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-[#dfdfdf]">
                    Всего SSH ключей: {keys.length}
                  </h3>
                  <p className="mt-1 text-sm text-[#f3f3f398]">
                    Управление SSH ключами для подключения к серверам
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
