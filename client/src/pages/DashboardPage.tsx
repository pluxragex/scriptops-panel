import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Play, Square, RotateCcw, Activity, Plus } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usersApi, scriptsApi } from '../services/api'
import { Script } from '../types'
import { getStatusColor, getStatusText, formatDate, getExpiryStatus, isScriptExpired, isScriptFrozen } from '../lib/utils'
import LoadingSpinner from '../components/LoadingSpinner'
import { showSuccessToast } from '../lib/toast'
import { useTranslation } from '../lib/i18n'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [scripts, setScripts] = useState<Script[]>([])
  const [stats, setStats] = useState({
    totalScripts: 0,
    runningScripts: 0,
    totalDeployments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [scriptsResponse, statsResponse] = await Promise.all([
        scriptsApi.getScripts(),
        usersApi.getUserStats(),
      ])

      setScripts(scriptsResponse.data)
      setStats(statsResponse.data)
    } catch (error) {

      console.error('Ошибка загрузки данных:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScriptAction = async (scriptId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      let response
      switch (action) {
        case 'start':
          response = await scriptsApi.startScript(scriptId)

          setScripts(prev => prev.map(script =>
            script.id === scriptId ? { ...script, status: 'RUNNING' } : script
          ))
          break
        case 'stop':
          response = await scriptsApi.stopScript(scriptId)

          setScripts(prev => prev.map(script =>
            script.id === scriptId ? { ...script, status: 'STOPPED' } : script
          ))
          break
        case 'restart':
          response = await scriptsApi.restartScript(scriptId)

          setScripts(prev => prev.map(script =>
            script.id === scriptId ? { ...script, status: 'RUNNING' } : script
          ))
          break
      }
      showSuccessToast(response.data.message)
    } catch (error: any) {

      console.error('Ошибка выполнения действия:', error)
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
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-[#dfdfdf] sm:text-3xl sm:truncate">
            {t('dashboard.welcome')}, {user?.username}!
          </h2>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('dashboard.manage')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-3">
        <div className="bg-[#151515] border border-[#ffffff10] overflow-hidden shadow-sm rounded-xl hover:shadow-md hover:border-[#ffffff20] transition-all duration-200">
          <div className="p-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-[#a476ff]/10 border border-[#a476ff]/20">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-[#a476ff]" />
                </div>
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#f3f3f398] truncate">
                    {t('dashboard.totalScripts')}
                  </dt>
                  <dd className="text-xl sm:text-2xl font-bold text-[#dfdfdf] mt-1.5">
                    {stats.totalScripts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] overflow-hidden shadow-sm rounded-xl hover:shadow-md hover:border-[#ffffff20] transition-all duration-200">
          <div className="p-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#f3f3f398] truncate">
                    {t('dashboard.running')}
                  </dt>
                  <dd className="text-xl sm:text-2xl font-bold text-[#dfdfdf] mt-1.5">
                    {stats.runningScripts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] overflow-hidden shadow-sm rounded-xl hover:shadow-md hover:border-[#ffffff20] transition-all duration-200">
          <div className="p-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                </div>
              </div>
              <div className="ml-4 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[#f3f3f398] truncate">
                    {t('dashboard.deployments')}
                  </dt>
                  <dd className="text-xl sm:text-2xl font-bold text-[#dfdfdf] mt-1.5">
                    {stats.totalDeployments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] shadow-sm rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <h3 className="text-xl font-bold text-[#dfdfdf] mb-6">
            {t('dashboard.recentScripts')}
          </h3>

          {scripts.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-[#f3f3f398]" />
              <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">{t('dashboard.noScripts')}</h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                {t('dashboard.createFirst')}
              </p>
              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <div className="mt-6">
                  <Link
                    to="/admin/scripts"
                    className="btn btn-primary w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="ml-2">{t('dashboard.createScript')}</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.slice(0, 5).map((script) => (
                <div key={script.id} className="border border-[#ffffff10] rounded-xl bg-[#1a1a1a] hover:border-[#ffffff20] hover:shadow-md transition-all duration-200">
                  <div className="hidden sm:flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-[#dfdfdf]">
                          {script.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(script.status)}`}>
                          {t(`scriptCard.${script.status.toLowerCase()}` as any) || getStatusText(script.status)}
                        </span>
                        {isScriptFrozen(script.frozenAt, script.frozenUntil) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-500/10 border border-blue-500/20">
                            {t('scriptCard.frozen')}
                          </span>
                        )}
                        {script.expiryDate && (getExpiryStatus(script.expiryDate) === 'expired' || getExpiryStatus(script.expiryDate) === 'expiring-soon') && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getExpiryStatus(script.expiryDate) === 'expired' ? 'text-red-600 bg-red-500/10 border border-red-500/20' :
                            'text-yellow-600 bg-yellow-500/10 border border-yellow-500/20'
                          }`}>
                            {isScriptExpired(script.expiryDate) ? t('scriptCard.expired') : t('scripts.expiringSoon')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#f3f3f398]">
                        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
                          <>{t('scriptCard.server')}: {script.server.name} • {t('scriptCard.created')}: {formatDate(script.createdAt)}</>
                        ) : (
                          <>{t('scriptCard.updated')}: {formatDate(script.updatedAt)} • {t('scriptCard.created')}: {formatDate(script.createdAt)}</>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {script.status === 'RUNNING' ? (
                        <button
                          onClick={() => handleScriptAction(script.id, 'stop')}
                          className="btn btn-danger btn-sm"
                        >
                          <Square className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleScriptAction(script.id, 'start')}
                          className="btn btn-success btn-sm"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleScriptAction(script.id, 'restart')}
                        className="btn btn-primary btn-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>

                      <Link
                        to={`/scripts/${script.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        {t('scriptCard.more')}
                      </Link>
                    </div>
                  </div>

                  <div className="sm:hidden p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#dfdfdf] truncate">
                          {script.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(script.status)}`}>
                            {t(`scriptCard.${script.status.toLowerCase()}` as any) || getStatusText(script.status)}
                          </span>
                          {isScriptFrozen(script.frozenAt, script.frozenUntil) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-500/10 border border-blue-500/20">
                              {t('scriptCard.frozen')}
                            </span>
                          )}
                          {script.expiryDate && (getExpiryStatus(script.expiryDate) === 'expired' || getExpiryStatus(script.expiryDate) === 'expiring-soon') && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              getExpiryStatus(script.expiryDate) === 'expired' ? 'text-red-600 bg-red-500/10 border border-red-500/20' :
                              'text-yellow-600 bg-yellow-500/10 border border-yellow-500/20'
                            }`}>
                              {isScriptExpired(script.expiryDate) ? t('scriptCard.expired') : t('scripts.expiringSoon')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#f3f3f398] mb-3">
                      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? (
                        <>{t('scriptCard.server')}: {script.server.name} • {t('scriptCard.created')}: {formatDate(script.createdAt)}</>
                      ) : (
                        <>{t('scriptCard.updated')}: {formatDate(script.updatedAt)} • {t('scriptCard.created')}: {formatDate(script.createdAt)}</>
                      )}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {script.status === 'RUNNING' ? (
                          <button
                            onClick={() => handleScriptAction(script.id, 'stop')}
                            className="btn btn-danger btn-xs flex items-center"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            <span className="text-xs">{t('scriptCard.stop')}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleScriptAction(script.id, 'start')}
                            className="btn btn-success btn-xs flex items-center"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            <span className="text-xs">{t('scriptCard.start')}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleScriptAction(script.id, 'restart')}
                          className="btn btn-primary btn-xs flex items-center"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span className="text-xs">{t('scriptCard.restart')}</span>
                        </button>
                      </div>

                      <Link
                        to={`/scripts/${script.id}`}
                        className="btn btn-secondary btn-xs flex items-center"
                      >
                        <span className="text-xs">{t('scriptCard.more')}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {scripts.length > 5 && (
                <div className="text-center pt-2">
                  <Link
                    to="/scripts"
                    className="btn btn-secondary btn-sm inline-flex items-center gap-2"
                  >
                    <span>{t('dashboard.showAll')} ({scripts.length})</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
