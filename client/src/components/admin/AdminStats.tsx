import { useState, useEffect } from 'react'
import { Users, Bot, Server, Activity, Clock, CheckCircle, XCircle, Play, Square } from 'lucide-react'
import { adminApi } from '../../services/api'
import { SystemStats } from '../../types'
import LoadingSpinner from '../LoadingSpinner'
import { useTranslation } from '../../lib/i18n'

export default function AdminStats() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await adminApi.getSystemStats()
      setStats(response.data)
    } catch (error) {

      console.error('Ошибка загрузки статистики:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">
          {t('admin.stats.error')}
        </h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg overflow-hidden shadow-lg transition-all">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-[#f3f3f398] truncate">
                  {t('admin.stats.totalUsers')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[#dfdfdf] mt-0.5">
                  {stats.users.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg overflow-hidden shadow-lg transition-all">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-green-500/20 border border-green-500/40">
                  <Bot className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-[#f3f3f398] truncate">
                  {t('admin.stats.totalScripts')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[#dfdfdf] mt-0.5">
                  {stats.scripts.total}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg overflow-hidden shadow-lg transition-all">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/40">
                  <Server className="h-5 w-5 text-purple-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-[#f3f3f398] truncate">
                  {t('admin.stats.activeServers')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[#dfdfdf] mt-0.5">
                  {stats.servers.active}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg overflow-hidden shadow-lg transition-all">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40">
                  <Activity className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-[#f3f3f398] truncate">
                  {t('admin.stats.runningScripts')}
                </p>
                <p className="text-lg sm:text-xl font-semibold text-[#dfdfdf] mt-0.5">
                  {stats.scripts.running}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
              <h3 className="text-sm sm:text-base font-semibold text-[#dfdfdf]">
                {t('admin.stats.usersTitle')}
              </h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {t('admin.stats.totalUsers')}
                </span>
                <span className="text-[#dfdfdf] font-semibold">{stats.users.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {t('admin.stats.usersActive')}
                </span>
                <span className="text-green-400 font-semibold">{stats.users.active}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  {t('admin.stats.usersBlocked')}
                </span>
                <span className="text-red-400 font-semibold">{stats.users.blocked}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
              <h3 className="text-sm sm:text-base font-semibold text-[#dfdfdf]">
                {t('admin.stats.scriptsTitle')}
              </h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  {t('admin.stats.totalScripts')}
                </span>
                <span className="text-[#dfdfdf] font-semibold">{stats.scripts.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  {t('admin.stats.scriptsRunning')}
                </span>
                <span className="text-green-400 font-semibold">{stats.scripts.running}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Square className="h-3.5 w-3.5" />
                  {t('admin.stats.scriptsStopped')}
                </span>
                <span className="text-[#f3f3f398] font-semibold">{stats.scripts.total - stats.scripts.running}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
              <h3 className="text-sm sm:text-base font-semibold text-[#dfdfdf]">
                {t('admin.stats.serversTitle')}
              </h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  {t('admin.stats.totalServers')}
                </span>
                <span className="text-[#dfdfdf] font-semibold">{stats.servers.total}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {t('admin.stats.serversActive')}
                </span>
                <span className="text-green-400 font-semibold">{stats.servers.active}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  {t('admin.stats.serversInactive')}
                </span>
                <span className="text-red-400 font-semibold">{stats.servers.total - stats.servers.active}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <h3 className="text-sm sm:text-base font-semibold text-[#dfdfdf]">
                {t('admin.stats.activityTitle')}
              </h3>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  {t('admin.stats.totalDeployments')}
                </span>
                <span className="text-[#dfdfdf] font-semibold">
                  {stats.deployments.total}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[#f3f3f398] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('admin.stats.activity24h')}
                </span>
                <span className="text-blue-400 font-semibold">{stats.activity.recentLogs}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
