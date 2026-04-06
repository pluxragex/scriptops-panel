
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Play, Square, RotateCcw, Download, GitBranch, Users, Settings, Snowflake, Hash, Code, Shield, Zap, Bot, Server, Folder, Activity, Calendar, Clock, FileText, Info, KeyRound } from 'lucide-react'
import { scriptsApi } from '../services/api'
import { Script } from '../types'
import { getStatusColor, getStatusText, formatDate, formatUptime, getExpiryStatus, isScriptExpired, isScriptFrozen } from '../lib/utils'
import LoadingSpinner from '../components/LoadingSpinner'
import ScriptAccessManager from '../components/ScriptAccessManager'
import ScriptSettingsModal from '../components/ScriptSettings'
import ScriptLogsModal from '../components/admin/ScriptLogsModal'
import FreezeScriptModal from '../components/FreezeScriptModal'
import { useAuthStore } from '../stores/authStore'
import { showSuccessToast } from '../lib/toast'
import { useTranslation } from '../lib/i18n'

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [script, setScript] = useState<Script | null>(null)
  const [userAccess, setUserAccess] = useState<{
    canView: boolean;
    canStart: boolean;
    canStop: boolean;
    canRestart: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
    isOwner: boolean;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAccessManager, setShowAccessManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [showFreezeModal, setShowFreezeModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadScript()
    }
  }, [id])

  const loadScript = async () => {
    if (!id) return

    try {
      const [scriptResponse, accessResponse] = await Promise.all([
        scriptsApi.getScript(id),
        scriptsApi.getUserScriptAccess(id)
      ])
      setScript(scriptResponse.data)
      setUserAccess(accessResponse.data)
    } catch (error) {
      console.error('Ошибка загрузки скрипта')
    } finally {
      setIsLoading(false)
    }
  }


  const handleShowLogsModal = () => {
    setShowLogsModal(true)
  }

  const handleScriptAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!id) return

    try {
      let response
      switch (action) {
        case 'start':
          response = await scriptsApi.startScript(id)

          setScript(prev => prev ? { ...prev, status: 'RUNNING' } : null)
          break
        case 'stop':
          response = await scriptsApi.stopScript(id)

          setScript(prev => prev ? { ...prev, status: 'STOPPED' } : null)
          break
        case 'restart':
          response = await scriptsApi.restartScript(id)

          setScript(prev => prev ? { ...prev, status: 'RUNNING' } : null)
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

  if (!script) {
    return (
      <div className="text-center py-12">
        <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl p-8 max-w-md mx-auto">
          <Bot className="mx-auto h-12 w-12 text-[#f3f3f398] mb-4" />
          <h3 className="text-xl font-bold text-[#dfdfdf] mb-2">{t('scriptDetail.notFound')}</h3>
          <p className="text-sm text-[#f3f3f398] mb-6">
            {t('scriptDetail.notFoundDescription')}
          </p>
          <Link to="/scripts" className="btn btn-primary inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('scriptDetail.backToScripts')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-4">
            <Link
              to="/scripts"
              className="btn btn-secondary btn-sm flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-[#dfdfdf] sm:text-3xl sm:truncate">
                {script.name}
              </h2>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                {script.description || t('scriptDetail.noDescription')}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:ml-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(script.status)}`}>
            {getStatusText(script.status)}
          </span>
          {isScriptFrozen(script.frozenAt, script.frozenUntil) && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-blue-400 bg-blue-500/20 border border-blue-500/40">
              {t('scriptDetail.frozen')}
            </span>
          )}
          {script.expiryDate && (getExpiryStatus(script.expiryDate) === 'expired' || getExpiryStatus(script.expiryDate) === 'expiring-soon') && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              getExpiryStatus(script.expiryDate) === 'expired' ? 'text-red-400 bg-red-500/20 border border-red-500/40' :
              'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40'
            }`}>
              {isScriptExpired(script.expiryDate) ? t('scriptDetail.expired') : t('scripts.expiringSoon')}
            </span>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
              <Settings className="h-5 w-5 text-[#a476ff]" />
            </div>
            <h3 className="text-xl font-bold text-[#dfdfdf]">
              {t('scriptDetail.actions')}
            </h3>
          </div>

          <div className="hidden md:flex flex-wrap gap-3">
            {(() => {
              const isFrozen = !!(script.frozenAt && (!script.frozenUntil || new Date(script.frozenUntil) > new Date()))
              return (
                <>
                  {userAccess?.canStart && script.status === 'RUNNING' && (
                    <button
                      onClick={() => handleScriptAction('stop')}
                      className="btn btn-danger btn-text"
                    >
                      <Square className="h-4 w-4" />
                      <span>{t('scriptDetail.stop')}</span>
                    </button>
                  )}

                  {userAccess?.canStart && script.status !== 'RUNNING' && (
                    <button
                      onClick={() => handleScriptAction('start')}
                      disabled={isFrozen}
                      className="btn btn-success btn-text disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isFrozen ? t('scriptDetail.frozenCannotStart') : ''}
                    >
                      <Play className="h-4 w-4" />
                      <span>{t('scriptDetail.start')}</span>
                    </button>
                  )}

                  {userAccess?.canRestart && (
                    <button
                      onClick={() => handleScriptAction('restart')}
                      disabled={isFrozen}
                      className="btn btn-primary btn-text disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isFrozen ? t('scriptDetail.frozenCannotRestart') : ''}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{t('scriptDetail.restart')}</span>
                    </button>
                  )}
                </>
              )
            })()}

            {userAccess?.canViewLogs && (
              <button
                onClick={handleShowLogsModal}
                className="btn btn-secondary btn-text"
              >
                <Download className="h-4 w-4" />
                <span>{t('scriptDetail.showLogs')}</span>
              </button>
            )}

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || userAccess?.isOwner) && (
              <button
                onClick={() => setShowAccessManager(!showAccessManager)}
                className={`btn btn-text ${showAccessManager ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Users className="h-4 w-4" />
                <span>{t('scriptDetail.access')}</span>
              </button>
            )}

            {script && (userAccess?.isOwner || userAccess?.canManageSettings || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setShowSettings(true)}
                className="btn btn-secondary btn-text"
              >
                <Settings className="h-4 w-4" />
                <span>{t('scriptDetail.settings')}</span>
              </button>
            )}

            {script && script.expiryDate && (userAccess?.isOwner || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (() => {
              const isFrozen = script.frozenAt && (!script.frozenUntil || new Date(script.frozenUntil) > new Date())
              return (
                <button
                  onClick={() => setShowFreezeModal(true)}
                  className={`btn btn-text border transition-colors ${
                    isFrozen
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/40'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                  }`}
                >
                  <Snowflake className="h-4 w-4" />
                  <span>{isFrozen ? t('scriptDetail.unfreeze') : t('scriptDetail.freeze')}</span>
                </button>
              )
            })()}
          </div>

          <div className="md:hidden space-y-3">
            {(() => {
              const isFrozen = !!(script.frozenAt && (!script.frozenUntil || new Date(script.frozenUntil) > new Date()))
              return (
                <>
                  <div className="flex gap-3">
                    {userAccess?.canStart && script.status === 'RUNNING' && (
                      <button
                        onClick={() => handleScriptAction('stop')}
                        className="btn btn-danger btn-text flex-1"
                      >
                        <Square className="h-4 w-4" />
                        <span>{t('scriptDetail.stop')}</span>
                      </button>
                    )}

                    {userAccess?.canRestart && (
                      <button
                        onClick={() => handleScriptAction('restart')}
                        disabled={isFrozen}
                        className="btn btn-primary btn-text flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isFrozen ? t('scriptDetail.frozenCannotRestart') : ''}
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>{t('scriptDetail.restart')}</span>
                      </button>
                    )}

                    {userAccess?.canStart && script.status !== 'RUNNING' && (
                      <button
                        onClick={() => handleScriptAction('start')}
                        disabled={isFrozen}
                        className="btn btn-success btn-text flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isFrozen ? t('scriptDetail.frozenCannotStart') : ''}
                      >
                        <Play className="h-4 w-4" />
                        <span>{t('scriptDetail.start')}</span>
                      </button>
                    )}
                  </div>

                  {userAccess?.canViewLogs && (
                    <button
                      onClick={handleShowLogsModal}
                      className="btn btn-secondary btn-text w-full"
                    >
                      <Download className="h-4 w-4" />
                      <span>{t('scriptDetail.showLogs')}</span>
                    </button>
                  )}

                  {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || userAccess?.isOwner) && (
                    <button
                      onClick={() => setShowAccessManager(!showAccessManager)}
                      className={`btn btn-text w-full ${showAccessManager ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      <Users className="h-4 w-4" />
                      <span>{t('scriptDetail.access')}</span>
                    </button>
                  )}

                  {script && (userAccess?.isOwner || userAccess?.canManageSettings || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="btn btn-secondary btn-text w-full"
                    >
                      <Settings className="h-4 w-4" />
                      <span>{t('scriptDetail.settings')}</span>
                    </button>
                  )}

                  {script && script.expiryDate && (userAccess?.isOwner || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (() => {
                    const isFrozen = script.frozenAt && (!script.frozenUntil || new Date(script.frozenUntil) > new Date())
                    return (
                      <button
                        onClick={() => setShowFreezeModal(true)}
                        className={`btn btn-text w-full border transition-colors ${
                          isFrozen
                            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-500/40'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40'
                        }`}
                      >
                        <Snowflake className="h-4 w-4" />
                        <span>{isFrozen ? t('scriptDetail.unfreeze') : t('scriptDetail.freeze')}</span>
                      </button>
                    )
                  })()}
                </>
              )
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                <Info className="h-5 w-5 text-[#a476ff]" />
              </div>
              <h3 className="text-xl font-bold text-[#dfdfdf]">
                {t('scriptDetail.information')}
              </h3>
            </div>

            <dl className="space-y-4">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                  <Hash className="h-4 w-4 text-[#a476ff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">
                    {t('scriptDetail.id')}
                  </dt>
                  <dd className="text-sm text-[#dfdfdf] font-mono break-all">{script.id}</dd>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                  {script.type === 'CUSTOM' ? <Code className="h-4 w-4 text-purple-400" /> :
                   script.type === 'CYBER_LEAGUE' ? <Shield className="h-4 w-4 text-blue-400" /> :
                   script.type === 'WEEKLY_CUP' ? <Zap className="h-4 w-4 text-yellow-400" /> :
                   script.type === 'ALLIANCE_BOT' ? <Bot className="h-4 w-4 text-green-400" /> :
                   <Bot className="h-4 w-4 text-[#a476ff]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('scriptDetail.type')}</dt>
                  <dd className="text-sm text-[#dfdfdf]">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      script.type === 'CUSTOM' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                      script.type === 'CYBER_LEAGUE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                      script.type === 'WEEKLY_CUP' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                      script.type === 'ALLIANCE_BOT' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                      'bg-[#1a1a1a] text-[#dfdfdf] border-[#ffffff10]'
                    }`}>
                      {script.type === 'CUSTOM' ? 'Пользовательский' :
                       script.type === 'CYBER_LEAGUE' ? 'Majestic Cyber League' :
                       script.type === 'WEEKLY_CUP' ? 'Weekly Cup / WarZone' :
                       script.type === 'ALLIANCE_BOT' ? 'Союзный бот' :
                       script.type}
                    </span>
                  </dd>
                </div>
              </div>

              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20 border border-blue-500/40">
                    <Server className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('scriptDetail.server')}</dt>
                    <dd className="text-sm text-[#dfdfdf]">{script.server.name} ({script.server.host})</dd>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                  <Folder className="h-4 w-4 text-[#a476ff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">
                    {t('scriptDetail.pathOnServer')}
                  </dt>
                  <dd className="text-sm text-[#dfdfdf] font-mono break-all">{script.pathOnServer}</dd>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                  <KeyRound className="h-4 w-4 text-[#a476ff]" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">
                    {t('scriptDetail.pm2Name')}
                  </dt>
                  <dd className="text-sm text-[#dfdfdf] font-mono break-all">{script.pm2Name}</dd>
                </div>
              </div>

              {script.pid && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                    <Activity className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">PID</dt>
                    <dd className="text-sm text-[#dfdfdf]">{script.pid}</dd>
                  </div>
                </div>
              )}

              {script.uptime && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                    <Clock className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('scriptDetail.uptime')}</dt>
                    <dd className="text-sm text-[#dfdfdf]">{formatUptime(script.uptime)}</dd>
                  </div>
                </div>
              )}

              {script.version && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <FileText className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">
                      {t('scriptDetail.version')}
                    </dt>
                    <dd className="text-sm text-[#dfdfdf]">{script.version}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                <Calendar className="h-5 w-5 text-[#a476ff]" />
              </div>
              <h3 className="text-xl font-bold text-[#dfdfdf]">
                Метаданные
              </h3>
            </div>

            <dl className="space-y-4">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                  <Calendar className="h-4 w-4 text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('scriptDetail.created')}</dt>
                  <dd className="text-sm text-[#dfdfdf]">{formatDate(script.createdAt)}</dd>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20 border border-blue-500/40">
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('scriptDetail.updated')}</dt>
                  <dd className="text-sm text-[#dfdfdf]">{formatDate(script.updatedAt)}</dd>
                </div>
              </div>

              {script.expiryDate && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className={`flex-shrink-0 p-2 rounded-lg border ${
                    getExpiryStatus(script.expiryDate) === 'expired' ? 'bg-red-500/20 border-red-500/40' :
                    getExpiryStatus(script.expiryDate) === 'expiring-soon' ? 'bg-yellow-500/20 border-yellow-500/40' :
                    'bg-[#a476ff20] border-[#a476ff40]'
                  }`}>
                    <Clock className={`h-4 w-4 ${
                      getExpiryStatus(script.expiryDate) === 'expired' ? 'text-red-400' :
                      getExpiryStatus(script.expiryDate) === 'expiring-soon' ? 'text-yellow-400' :
                      'text-[#a476ff]'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('scriptDetail.expires')}</dt>
                    <dd className={`text-sm ${
                      getExpiryStatus(script.expiryDate) === 'expired' ? 'text-red-400' :
                      getExpiryStatus(script.expiryDate) === 'expiring-soon' ? 'text-yellow-400' :
                      'text-[#dfdfdf]'
                    }`}>{formatDate(script.expiryDate)}</dd>
                  </div>
                </div>
              )}

              {script.repoUrl && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <GitBranch className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">Git репозиторий</dt>
                    <dd className="text-sm text-[#dfdfdf]">
                      <a
                        href={script.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#a476ff] hover:text-[#8c5eff] flex items-center gap-1 transition-colors break-all"
                      >
                        <GitBranch className="h-4 w-4 flex-shrink-0" />
                        <span className="break-all">{script.repoUrl}</span>
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {script.uploadedPath && (
                <div className="flex items-start space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <FileText className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">Загруженный файл</dt>
                    <dd className="text-sm text-[#dfdfdf] font-mono break-all">{script.uploadedPath}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>


      {showAccessManager && script && (
        <div className="mt-8">
          <ScriptAccessManager
            scriptId={script.id}
            scriptName={script.name}
          />
        </div>
      )}

      {showSettings && script && createPortal(
        <ScriptSettingsModal
          script={script}
          onClose={() => setShowSettings(false)}
        />,
        document.body
      )}

      {showLogsModal && script && createPortal(
        <ScriptLogsModal
          script={script}
          onClose={() => setShowLogsModal(false)}
        />,
        document.body
      )}

      {showFreezeModal && script && createPortal(
        <FreezeScriptModal
          script={script}
          onClose={() => setShowFreezeModal(false)}
          onSuccess={() => {
            loadScript()
          }}
          isAdmin={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || false}
          canFreeze={
            !script.frozenAt || (script.frozenUntil && new Date(script.frozenUntil) <= new Date())
              ? (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || !script.ownerFrozenOnce)
              : false
          }
          isFrozen={script.frozenAt ? (!script.frozenUntil || new Date(script.frozenUntil) > new Date()) : false}
        />,
        document.body
      )}
    </div>
  )
}
