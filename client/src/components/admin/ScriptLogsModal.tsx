import { useState, useEffect, useCallback } from 'react'
import { X, Download, RefreshCw, Eye, Trash2, Clock } from 'lucide-react'
import { scriptsApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showSuccessToast } from '../../lib/toast'
import { useTranslation } from '../../lib/i18n'

interface ScriptLogsModalProps {
  script: {
    id: string
    name: string
    status: string
  }
  onClose: () => void
}

export default function ScriptLogsModal({ script, onClose }: ScriptLogsModalProps) {
  const [logs, setLogs] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lines, setLines] = useState(200)
  const [isClearingLogs, setIsClearingLogs] = useState(false)
  const [currentScript, setCurrentScript] = useState(script)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const { t } = useTranslation()

  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await scriptsApi.getScriptLogs(script.id, lines)
      setLogs(response.data.logs)
    } catch (error: any) {

      console.error('Ошибка загрузки логов:', error)
    } finally {
      setIsLoading(false)
    }
  }, [script.id, lines])

  const loadScriptStatus = useCallback(async () => {
    try {
      const response = await scriptsApi.getScriptStatus(script.id)


      let newStatus = null

      if (response.data) {

        if ((response.data as any).isRunning !== undefined) {
          newStatus = (response.data as any).isRunning ? 'RUNNING' : 'STOPPED'
        }

        else if (response.data.status && typeof response.data.status === 'object' && (response.data.status as any).pm2_env) {
          const pm2Status = (response.data.status as any).pm2_env.status
          newStatus = pm2Status === 'online' ? 'RUNNING' : 'STOPPED'
        }

        else if (response.data.status && typeof response.data.status === 'string') {
          newStatus = response.data.status
        }
      }

      if (newStatus) {
        setCurrentScript(prev => ({
          ...prev,
          status: newStatus
        }))
      } else {
        console.warn('[ScriptLogsModal] Could not determine status, keeping current:', currentScript.status)
      }
    } catch (error: any) {
      console.error('[ScriptLogsModal] Error loading status:', error)

    }
  }, [script.id, script.name, currentScript.status])

  const refreshLogs = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const response = await scriptsApi.getScriptLogs(script.id, lines)
      setLogs(response.data.logs)
      showSuccessToast(t('logs.updated'))
    } catch (error: any) {

      console.error('Ошибка обновления логов:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [script.id, lines])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    setCurrentScript(script)

    loadScriptStatus()
  }, [script.id, loadScriptStatus])


  useEffect(() => {
    let interval: number | null = null

    if (autoRefresh) {
      interval = setInterval(() => {
        loadScriptStatus()
        refreshLogs()
      }, 5000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [autoRefresh, loadScriptStatus, refreshLogs])

  const clearLogs = async () => {
    if (!window.confirm(t('logs.clearConfirm'))) {
      return
    }

    try {
      setIsClearingLogs(true)
      await scriptsApi.clearScriptLogs(script.id)
      setLogs('')
      showSuccessToast(t('logs.cleared'))
    } catch (error: any) {

      console.error('Ошибка очистки логов:', error)
    } finally {
      setIsClearingLogs(false)
    }
  }


  const downloadLogs = () => {
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `script-${script.id}-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    if (!status) {
      return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
    }

    switch (status) {
      case 'RUNNING':
        return 'text-green-400 bg-green-500/20 border border-green-500/40'
      case 'STOPPED':
        return 'text-red-400 bg-red-500/20 border border-red-500/40'
      case 'STARTING':
        return 'text-blue-400 bg-blue-500/20 border border-blue-500/40'
      case 'STOPPING':
        return 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40'
      case 'ERROR':
        return 'text-red-400 bg-red-500/20 border border-red-500/40'
      case 'EXPIRED':
        return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
      default:
        return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#151515] rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#ffffff10]">
          <div className="flex items-center space-x-3">
            <Eye className="h-6 w-6 text-[#a476ff]" />
            <div>
              <h2 className="text-xl font-semibold text-[#dfdfdf]">
                {t('logs.title')}: {script.name}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-[#f3f3f398]">{t('logs.status')}:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentScript.status || script.status)}`}>
                  {currentScript.status || script.status || t('logs.unknown')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 border-b border-[#ffffff10] bg-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-[#dfdfdf]">
                {t('logs.lines')}:
              </label>
              <select
                value={lines}
                onChange={(e) => setLines(parseInt(e.target.value))}
                className="input text-sm py-1"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={refreshLogs}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-[#a476ff20] text-[#a476ff] hover:bg-[#a476ff30] transition-colors disabled:opacity-50"
                title={t('logs.refresh')}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={clearLogs}
                disabled={isClearingLogs}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                title={t('logs.clear')}
              >
                {isClearingLogs ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-[#151515] text-[#f3f3f398] hover:bg-[#ffffff10]'
                }`}
                title={autoRefresh ? t('logs.autoRefreshOff') : t('logs.autoRefreshOn')}
              >
                <Clock className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
              </button>

              <button
                onClick={downloadLogs}
                className="btn btn-secondary btn-sm"
              >
                <Download className="h-4 w-4" />
                {t('logs.download')}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="h-full bg-black text-green-400 font-mono text-sm overflow-auto rounded-lg p-4">
              <pre className="whitespace-pre-wrap break-words">
                {logs || t('logs.notFound')}
              </pre>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#ffffff10] bg-[#1a1a1a]">
          <div className="flex items-center justify-between text-sm text-[#f3f3f398]">
            <div className="flex items-center space-x-4">
              <div>
                {t('logs.shownLines', { count: lines })}
              </div>
              {autoRefresh && (
                <div className="flex items-center space-x-1 text-green-400">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span>{t('logs.autoRefreshEnabled')}</span>
                </div>
              )}
            </div>
            <div>
              {t('logs.updatedAt')}: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

