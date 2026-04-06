import { useState, useEffect, useMemo, useCallback } from 'react'
import { Bot, Filter } from 'lucide-react'
import { scriptsApi } from '../services/api'
import { Script } from '../types'
import LoadingSpinner from '../components/LoadingSpinner'
import { showSuccessToast } from '../lib/toast'
import { useAuthStore } from '../stores/authStore'
import { ScriptCard } from '../components/ScriptCard'
import { useTranslation } from '../lib/i18n'

type ScriptTypeFilter = 'ALL' | 'CUSTOM' | 'CYBER_LEAGUE' | 'WEEKLY_CUP' | 'ALLIANCE_BOT'

export default function ScriptsPage() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [scripts, setScripts] = useState<Script[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<ScriptTypeFilter>('ALL')

  useEffect(() => {
    loadScripts()
  }, [])

  const loadScripts = async () => {
    try {
      const response = await scriptsApi.getScripts()
      setScripts(response.data)
    } catch (error) {

      console.error('Ошибка загрузки скриптов:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScriptAction = useCallback(async (scriptId: string, action: 'start' | 'stop' | 'restart') => {

    const previousScripts = [...scripts]


    let optimisticStatus: string
    switch (action) {
      case 'start':
        optimisticStatus = 'RUNNING'
        break
      case 'stop':
        optimisticStatus = 'STOPPED'
        break
      case 'restart':
        optimisticStatus = 'RUNNING'
        break
    }

    setScripts(prev => prev.map(script =>
      script.id === scriptId ? { ...script, status: optimisticStatus as any } : script
    ))

    try {
      let response
      switch (action) {
        case 'start':
          response = await scriptsApi.startScript(scriptId)
          break
        case 'stop':
          response = await scriptsApi.stopScript(scriptId)
          break
        case 'restart':
          response = await scriptsApi.restartScript(scriptId)
          break
      }

      showSuccessToast(response.data.message)
    } catch (error: any) {

      setScripts(previousScripts)

      console.error('Ошибка выполнения действия:', error)
    }
  }, [scripts])

  const filteredScripts = useMemo(() => {
    if (!scripts || scripts.length === 0) {
      return []
    }

    if (typeFilter === 'ALL') {
      return scripts
    }

    return scripts.filter(script => {
      if (!script || !script.type) {
        return false
      }
      return script.type === typeFilter
    })
  }, [scripts, typeFilter])

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
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-[#dfdfdf] sm:text-3xl sm:truncate">
            {t('scripts.title')}
          </h2>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('scripts.manage')}
          </p>
        </div>
      </div>

      {scripts.length > 0 && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Filter className="h-5 w-5 text-[#a476ff]" />
              <span className="text-sm font-medium text-[#dfdfdf]">{t('scripts.filter')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'CUSTOM', 'CYBER_LEAGUE', 'WEEKLY_CUP', 'ALLIANCE_BOT'] as ScriptTypeFilter[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    typeFilter === type
                      ? 'bg-[#a476ff] text-white border border-[#a476ff]'
                      : 'bg-[#1a1a1a] text-[#dfdfdf] border border-[#ffffff10] hover:border-[#ffffff20] hover:bg-[#1f1f1f]'
                  }`}
                >
                  {type === 'ALL' ? t('scripts.all') : getScriptTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredScripts.length === 0 && scripts.length > 0 && typeFilter !== 'ALL' ? (
        <div className="text-center py-12">
          <Bot className="mx-auto h-12 w-12 text-[#f3f3f398]" />
          <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">{t('scripts.noScriptsType')}</h3>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('scripts.tryOther')}
          </p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="mx-auto h-12 w-12 text-[#f3f3f398]" />
          <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">{t('scripts.noScripts')}</h3>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('scripts.noCreated')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 auto-rows-fr">
          {filteredScripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onAction={handleScriptAction}
              userRole={user?.role}
            />
          ))}
        </div>
      )}
    </div>
  )
}
