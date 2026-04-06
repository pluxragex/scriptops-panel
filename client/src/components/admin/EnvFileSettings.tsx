import { useState, useEffect } from 'react'
import { Save, Download, Upload, FileText } from 'lucide-react'
import { scriptsApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'

interface EnvFileSettingsProps {
  scriptId: string
  onClose?: () => void
}

export default function EnvFileSettings({ scriptId, onClose }: EnvFileSettingsProps) {
  const [envContent, setEnvContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadEnvFile()
  }, [scriptId])

  const loadEnvFile = async () => {
    try {
      const response = await scriptsApi.getScriptEnvFile(scriptId)
      setEnvContent(response.data.content)
    } catch (error) {
      console.error('Ошибка загрузки .env файла:', error)
      showErrorToast('Ошибка загрузки .env файла')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await scriptsApi.updateScriptEnvFile(scriptId, envContent)
      showSuccessToast('.env файл сохранен')
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Ошибка сохранения .env файла')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([envContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.env'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setEnvContent(content)
      }
      reader.readAsText(file)
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
        <h3 className="text-lg font-medium text-[#dfdfdf]">
          Настройки .env файла
        </h3>
        <div className="flex space-x-2">
          <label className="btn btn-secondary btn-sm cursor-pointer">
            <Upload className="h-4 w-4" />
            Загрузить файл
            <input
              type="file"
              accept=".env,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={handleDownload}
            className="btn btn-secondary btn-sm"
          >
            <Download className="h-4 w-4" />
            Скачать
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#dfdfdf] mb-2">
            Содержимое .env файла
          </label>
          <textarea
            value={envContent}
            onChange={(e) => setEnvContent(e.target.value)}
            className="w-full h-96 p-3 border border-[#ffffff10] rounded-md font-mono text-sm bg-[#151515] text-[#dfdfdf]"
            placeholder="# Токен Discord бота&#10;BOT_TOKEN=your_bot_token_here&#10;&#10;# ID сервера&#10;GUILD_ID=123456789012345678&#10;&#10;# Настройки базы данных&#10;DB_HOST=localhost&#10;DB_PORT=5432&#10;DB_NAME=my_database&#10;DB_USER=username&#10;DB_PASSWORD=your_password_here&#10;&#10;# Другие настройки&#10;DEBUG=true&#10;LOG_LEVEL=info"
          />
        </div>

        <div className="bg-[#a476ff20] border border-[#a476ff40] rounded-md p-4">
          <div className="flex">
            <FileText className="h-5 w-5 text-[#a476ff] mt-0.5" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-[#dfdfdf]">
                Настройка .env файла
              </h4>
              <div className="mt-2 text-sm text-[#f3f3f398]">
                <p>Файл .env используется для хранения переменных окружения вашего скрипта.</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Каждая строка должна содержать переменную в формате <code className="text-[#a476ff]">KEY=value</code></li>
                  <li>Строки, начинающиеся с <code className="text-[#a476ff]">#</code>, являются комментариями</li>
                  <li>Не используйте пробелы вокруг знака <code className="text-[#a476ff]">=</code></li>
                  <li>Значения с пробелами должны быть заключены в кавычки</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary btn-xs flex items-center"
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-1">Сохранение...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Сохранить</span>
            </>
          )}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-secondary btn-xs flex items-center"
            disabled={isSaving}
          >
            <span>Закрыть</span>
          </button>
        )}
      </div>
    </div>
  )
}
