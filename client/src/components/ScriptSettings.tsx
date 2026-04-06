import { X, Bot, Server, Users, Settings as SettingsIcon } from 'lucide-react'
import { Script } from '../types'
import WeeklyCupSettings from './admin/WeeklyCupSettings'
import CyberLeagueEnvSettings from './admin/CyberLeagueEnvSettings'
import AllianceBotEnvSettings from './admin/AllianceBotEnvSettings'
import EnvFileSettings from './admin/EnvFileSettings'

interface ScriptSettingsComponentProps {
  script: Script
  onClose: () => void
}

export default function ScriptSettingsModal({ script, onClose }: ScriptSettingsComponentProps) {

  const getScriptTypeTitle = () => {
    switch (script.type) {
      case 'CYBER_LEAGUE':
        return 'Majestic Cyber League Registration'
      case 'WEEKLY_CUP':
        return 'Weekly Cup / WarZone Registration'
      case 'ALLIANCE_BOT':
        return 'Союзный бот'
      case 'CUSTOM':
        return 'Пользовательский скрипт'
      default:
        return 'Настройки скрипта'
    }
  }

  const getScriptTypeIcon = () => {
    switch (script.type) {
      case 'CYBER_LEAGUE':
        return <Server className="h-5 w-5" />
      case 'WEEKLY_CUP':
        return <Bot className="h-5 w-5" />
      case 'ALLIANCE_BOT':
        return <Users className="h-5 w-5" />
      case 'CUSTOM':
        return <SettingsIcon className="h-5 w-5" />
      default:
        return <SettingsIcon className="h-5 w-5" />
    }
  }


  return (
      <div className="fixed inset-0 bg-black/70 h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[90vh] shadow-lg rounded-md bg-[#151515] border-[#ffffff10] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getScriptTypeIcon()}
            <div>
              <h3 className="text-lg font-medium text-[#dfdfdf]">
                {getScriptTypeTitle()}
              </h3>
              <p className="text-sm text-[#f3f3f398]">
                Настройки для скрипта: {script.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {script.type === 'CYBER_LEAGUE' && (
            <CyberLeagueEnvSettings
              scriptId={script.id}
              onClose={onClose}
            />
          )}

          {script.type === 'WEEKLY_CUP' && (
            <WeeklyCupSettings
              scriptId={script.id}
              onClose={onClose}
            />
          )}

          {script.type === 'ALLIANCE_BOT' && (
            <AllianceBotEnvSettings
              scriptId={script.id}
              onClose={onClose}
            />
          )}

          {script.type === 'CUSTOM' && (
            <EnvFileSettings
              scriptId={script.id}
              onClose={onClose}
            />
          )}

          {script.type !== 'CUSTOM' && script.type !== 'CYBER_LEAGUE' && script.type !== 'WEEKLY_CUP' && script.type !== 'ALLIANCE_BOT' && (
            <div className="text-center py-8">
              <SettingsIcon className="h-12 w-12 text-[#f3f3f398] mx-auto mb-4" />
              <h4 className="text-lg font-medium text-[#dfdfdf] mb-2">
                Неизвестный тип скрипта
              </h4>
              <p className="text-[#f3f3f398]">
                Тип скрипта: {script.type}
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={onClose}
                  className="btn btn-secondary btn-xs"
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
