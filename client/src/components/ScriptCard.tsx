import { memo } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Square, RotateCcw, Clock, Snowflake, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Pause, Bot, Code, Shield, Zap, Calendar, Server, ArrowRight, TrendingUp
} from 'lucide-react'
import { Script } from '../types'
import { formatDate, getScriptStatusInfo, cn, isScriptFrozen } from '../lib/utils'
import { useTranslation } from '../lib/i18n'

interface ScriptCardProps {
  script: Script
  onAction: (scriptId: string, action: 'start' | 'stop' | 'restart') => void
  userRole?: string
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case 'STOPPED':
      return <XCircle className="h-3.5 w-3.5" />
    case 'STARTING':
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />
    case 'STOPPING':
      return <Pause className="h-3.5 w-3.5" />
    case 'ERROR':
      return <AlertTriangle className="h-3.5 w-3.5" />
    case 'EXPIRED':
      return <Clock className="h-3.5 w-3.5" />
    case 'UNKNOWN':
      return <AlertTriangle className="h-3.5 w-3.5" />
    default:
      return <AlertTriangle className="h-3.5 w-3.5" />
  }
}

const getScriptTypeIcon = (type: string) => {
  switch (type) {
    case 'CUSTOM':
      return <Code className="h-3.5 w-3.5" />
    case 'CYBER_LEAGUE':
      return <Shield className="h-3.5 w-3.5" />
    case 'WEEKLY_CUP':
      return <Zap className="h-3.5 w-3.5" />
    case 'ALLIANCE_BOT':
      return <Bot className="h-3.5 w-3.5" />
    default:
      return <Bot className="h-3.5 w-3.5" />
  }
}


const getScriptTypeColor = (type: string) => {
  switch (type) {
    case 'CUSTOM':
      return 'text-purple-400 bg-purple-500/20 border-purple-500/40'
    case 'CYBER_LEAGUE':
      return 'text-blue-400 bg-blue-500/20 border-blue-500/40'
    case 'WEEKLY_CUP':
      return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40'
    case 'ALLIANCE_BOT':
      return 'text-green-400 bg-green-500/20 border-green-500/40'
    default:
      return 'text-[#f3f3f398] bg-[#151515] border-[#ffffff10]'
  }
}

export const ScriptCard = memo<ScriptCardProps>(({ script, onAction, userRole }) => {
  const { t } = useTranslation()
  const statusInfo = getScriptStatusInfo(script)
  const isActionDisabled = script.status === 'STARTING' || script.status === 'STOPPING' || script.status === 'EXPIRED'

  const getStatusTextLocalized = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return t('scriptCard.running')
      case 'STOPPED':
        return t('scriptCard.stopped')
      case 'STARTING':
        return t('scriptCard.starting')
      case 'STOPPING':
        return t('scriptCard.stopping')
      case 'ERROR':
        return t('scriptCard.error')
      case 'EXPIRED':
        return t('scriptCard.expired')
      case 'UNKNOWN':
        return t('scriptCard.unknown')
      default:
        return t('scriptCard.unknown')
    }
  }

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


  const localizedStatusText = getStatusTextLocalized(script.status)

  return (
    <article
      className="relative flex flex-col h-full rounded-2xl border border-[#ffffff10] bg-gradient-to-br from-[#151515] to-[#1a1a1a] shadow-lg overflow-hidden"
      aria-labelledby={`script-${script.id}-title`}
    >

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 w-full">
              <span className={cn(
                "flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors min-w-0",
                getScriptTypeColor(script.type)
              )} title={getScriptTypeLabel(script.type)}>
                {getScriptTypeIcon(script.type)}
                <span className="hidden sm:inline truncate">
                  {getScriptTypeLabel(script.type)}
                </span>
                <span className="sm:hidden truncate">
                  {getScriptTypeLabel(script.type)}
                </span>
              </span>

              <span
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors min-w-0",
                  statusInfo.primaryStatus.color
                )}
                title={`${t('common.status')}: ${localizedStatusText}`}
              >
                {getStatusIcon(script.status)}
                <span className="hidden sm:inline truncate">
                  {localizedStatusText}
                </span>
                <span className="sm:hidden truncate">
                  {localizedStatusText}
                </span>
              </span>
            </div>
            <h3
              id={`script-${script.id}-title`}
              className="text-lg sm:text-xl font-bold text-[#dfdfdf] break-words leading-tight"
            >
              {script.name}
            </h3>
          </div>
        </div>

        {script.description && (
          <p className="text-sm text-[#f3f3f398] line-clamp-2 leading-relaxed mb-4">
            {script.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-[#ffffff10]">
          <div className="space-y-2.5 mb-4">
            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') ? (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Server className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#a476ff] flex-shrink-0" />
                <span className="font-medium text-[#f3f3f398]">{t('scriptCard.server')}:</span>
                <span className="text-[#dfdfdf] break-words truncate">{script.server.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#a476ff] flex-shrink-0" />
                <span className="font-medium text-[#f3f3f398]">{t('scriptCard.updated')}:</span>
                <span className="text-[#dfdfdf] break-words truncate">{formatDate(script.updatedAt)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#a476ff] flex-shrink-0" />
              <span className="font-medium text-[#f3f3f398]">{t('scriptCard.created')}:</span>
              <span className="text-[#dfdfdf] break-words truncate">{formatDate(script.createdAt)}</span>
            </div>
            {script.frozenAt && isScriptFrozen(script.frozenAt, script.frozenUntil) && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Snowflake className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                <span className="font-medium text-[#f3f3f398]">{t('scriptCard.frozen')}:</span>
                <span className="text-blue-400 break-words truncate">
                  {script.frozenUntil
                    ? `${t('scriptCard.frozenUntil')} ${formatDate(script.frozenUntil)}`
                    : t('scriptCard.frozenForever')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-[#ffffff10]">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 w-full">
              {script.status === 'RUNNING' ? (
                <button
                  onClick={() => onAction(script.id, 'stop')}
                  className="w-full btn btn-danger btn-sm"
                  title="Остановить"
                  aria-label="Остановить скрипт"
                  disabled={isActionDisabled}
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-1.5">{t('scriptCard.stop')}</span>
                </button>
              ) : (
                <button
                  onClick={() => onAction(script.id, 'start')}
                  className="w-full btn btn-success btn-sm"
                  title="Запустить"
                  aria-label="Запустить скрипт"
                  disabled={isActionDisabled}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-1.5">{t('scriptCard.start')}</span>
                </button>
              )}

              <button
                onClick={() => onAction(script.id, 'restart')}
                className="w-full btn btn-primary btn-sm"
                title="Перезапустить"
                aria-label="Перезапустить скрипт"
                disabled={isActionDisabled}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span className="ml-1.5">{t('scriptCard.restart')}</span>
              </button>
            </div>

            <Link
              to={`/scripts/${script.id}`}
              className="w-full btn btn-secondary btn-sm justify-center"
              aria-label={`Подробнее о скрипте ${script.name}`}
            >
              <span>{t('scriptCard.more')}</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
})

ScriptCard.displayName = 'ScriptCard'


