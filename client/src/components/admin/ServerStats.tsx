import { useState, useEffect } from 'react'
import { Server as ServerIcon, Cpu, HardDrive, AlertTriangle, CheckCircle, XCircle, Pause, Play, RefreshCw, ChevronDown } from 'lucide-react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import ServerStatsChart from './ServerStatsChart'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import type { Server as ServerType } from '../../types'

interface ServerStats {
  id: string
  name: string
  host: string
  status: 'online' | 'offline' | 'error'
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  uptime: number
  loadAverage: number[]
  runningScripts: number
  totalScripts: number
}

interface ServerStatsData {
  servers: ServerStats[]
  lastUpdated: string
}

export default function ServerStats() {
  const [stats, setStats] = useState<ServerStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false)

  const loadServerStats = async () => {
    try {
      const response = await adminApi.getServerStats()

      if (response.data && response.data.servers) {
      setStats(response.data)
      } else {

        setStats({
          servers: [],
          lastUpdated: new Date().toISOString(),
        })
      }
    } catch (error: any) {

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {

        try {
          const serversResponse = await adminApi.getServers()
          if (serversResponse.data && serversResponse.data.length > 0) {
            setStats({
              servers: serversResponse.data.map((server: ServerType) => ({
                id: server.id,
                name: server.name,
                host: server.host,
                status: 'offline' as const,
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0,
                networkIn: 0,
                networkOut: 0,
                uptime: 0,
                loadAverage: [0, 0, 0],
                runningScripts: 0,
                totalScripts: 0,
              })),
              lastUpdated: new Date().toISOString(),
            })
          }
        } catch {

        }
      }
      console.error('Ошибка загрузки статистики серверов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const { refresh, handlers } = useAutoRefresh({
    interval: 15000,
    enabled: autoRefreshEnabled,
    onRefresh: loadServerStats,
    pauseOnHover: true,
    pauseOnFocus: false
  })

  useEffect(() => {
    loadServerStats()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getUsageColor = (usage: number) => {
    if (usage >= 90) return 'text-red-600'
    if (usage >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }


  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}д ${hours}ч`
    if (hours > 0) return `${hours}ч ${minutes}м`
    return `${minutes}м`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats || !stats.servers.length) {
    return (
        <div className="text-center py-12">
          <ServerIcon className="mx-auto h-12 w-12 text-[#f3f3f398] dark:text-slate-500" />
        <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Нет серверов</h3>
        <p className="mt-1 text-sm text-[#f3f3f398]">Добавьте серверы для просмотра статистики</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                  Статистика серверов
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                    className={`p-1 rounded-md transition-colors ${
                      autoRefreshEnabled
                        ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                        : 'text-[#f3f3f398] hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
                    }`}
                    title={autoRefreshEnabled ? 'Автообновление включено' : 'Автообновление выключено'}
                  >
                    {autoRefreshEnabled ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={refresh}
                    className="p-1 text-[#f3f3f398] hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    title="Обновить сейчас"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                Мониторинг нагрузки и состояния серверов
                {autoRefreshEnabled && (
                  <span className="ml-2 text-green-600 dark:text-green-400">
                    • Автообновление каждые 15 сек
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                    viewMode === 'table'
                      ? 'bg-[#a476ff] text-[#101010] border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#ffffff10]'
                  }`}
                >
                  Таблица
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    viewMode === 'chart'
                      ? 'bg-[#a476ff] text-[#101010] border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#ffffff10]'
                  }`}
                >
                  График
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-[#dfdfdf]">Сервер:</label>
            <div className="relative">
              <button
                onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-w-[200px] justify-between text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] hover:bg-[#1f1f1f]"
              >
                <div className="flex items-center space-x-2">
                  <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                  <span>
                    {selectedServer
                      ? stats.servers.find(s => s.id === selectedServer)?.name || 'Все серверы'
                      : 'Все серверы'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isServerDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsServerDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setSelectedServer(null)
                          setIsServerDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                          !selectedServer
                            ? 'bg-[#151515] text-[#dfdfdf]'
                            : 'text-[#dfdfdf] hover:bg-[#151515]'
                        }`}
                      >
                        <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                        <span>Все серверы</span>
                        {!selectedServer && (
                          <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                        )}
                      </button>
                      {stats.servers.map((server) => (
                        <button
                          key={server.id}
                          onClick={() => {
                            setSelectedServer(server.id)
                            setIsServerDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                            selectedServer === server.id
                              ? 'bg-[#151515] text-[#dfdfdf]'
                              : 'text-[#dfdfdf] hover:bg-[#151515]'
                          }`}
                        >
                          <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                          <div className="flex-1">
                            <div className="font-medium">{server.name}</div>
                            <div className="text-xs text-[#f3f3f398]">{server.host}</div>
                          </div>
                          {selectedServer === server.id && (
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
      </div>

      {viewMode === 'table' ? (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" {...handlers}>
          {stats.servers
            .filter(server => !selectedServer || server.id === selectedServer)
            .map((server) => (
              <div
                key={server.id}
                className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        server.status === 'online'
                          ? 'bg-green-400 animate-pulse'
                          : server.status === 'offline'
                          ? 'bg-red-400'
                          : 'bg-yellow-400'
                      }`}
                    />
                    <h5 className="text-sm font-semibold text-[#dfdfdf]">
                      {server.name}
                    </h5>
                  </div>
                  {getStatusIcon(server.status)}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#f3f3f398] flex items-center gap-1.5">
                        <ServerIcon className="h-3.5 w-3.5" />
                        Хост
                      </span>
                      <span className="text-[#dfdfdf] font-medium truncate ml-2 max-w-[120px]">
                        {server.host}
                      </span>
                    </div>
                  </div>

                  {server.status === 'online' ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#f3f3f398] flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5" />
                          CPU
                        </span>
                        <span className={`font-semibold ${getUsageColor(server.cpuUsage)}`}>
                          {server.cpuUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            server.cpuUsage >= 90
                              ? 'bg-red-500'
                              : server.cpuUsage >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${server.cpuUsage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#f3f3f398] flex items-center gap-1.5">
                          <HardDrive className="h-3.5 w-3.5" />
                          Память
                        </span>
                        <span className={`font-semibold ${getUsageColor(server.memoryUsage)}`}>
                          {server.memoryUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            server.memoryUsage >= 90
                              ? 'bg-red-500'
                              : server.memoryUsage >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${server.memoryUsage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#f3f3f398] flex items-center gap-1.5">
                          <HardDrive className="h-3.5 w-3.5" />
                          Диск
                        </span>
                        <span className={`font-semibold ${getUsageColor(server.diskUsage)}`}>
                          {server.diskUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            server.diskUsage >= 90
                              ? 'bg-red-500'
                              : server.diskUsage >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${server.diskUsage}%` }}
                        />
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#ffffff10]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#f3f3f398]">Скрипты</span>
                          <span className="text-[#dfdfdf] font-medium">
                            {server.runningScripts} / {server.totalScripts}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#f3f3f398]">Время работы</span>
                          <span className="text-[#dfdfdf] font-medium">
                            {formatUptime(server.uptime)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-sm text-[#f3f3f398]">
                        Сервер недоступен
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (

        <ServerStatsChart
          servers={stats.servers}
          selectedServer={selectedServer}
        />
      )}

      <div className="text-center text-sm text-[#f3f3f398]">
        Последнее обновление: {new Date(stats.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}
