import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Bot, Hash, MessageSquare, Eye, EyeOff, ChevronDown, ChevronRight, Server as ServerIcon, CheckCircle } from 'lucide-react'
import { scriptsApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'


const WEEKLY_CUP_SERVERS = [
  { id: '1367922911289151529', name: 'MCL' },
  { id: '738118962168201248', name: 'New York' },
  { id: '738118974386208880', name: 'Detroit' },
  { id: '738118982581616671', name: 'Chicago' },
  { id: '738118990383284234', name: 'San Francisco' },
  { id: '905563151318274089', name: 'Atlanta' },
  { id: '916112805906763786', name: 'San Diego' },
  { id: '1056386679671357501', name: 'Los Angeles' },
  { id: '1284836808789594163', name: 'Miami' },
  { id: '1181219262313017344', name: 'Las Vegas' },
  { id: '1214710371403964466', name: 'Washington' },
  { id: '1248624620991549440', name: 'Dallas' },
  { id: '1273355399160135733', name: 'Boston' },
  { id: '1316481413423435889', name: 'Houston' },
  { id: '1333884807926779997', name: 'Seattle' },
  { id: '1381703567953629326', name: 'Phoenix' },
  { id: '1429823260962455633', name: 'Denver' },
  { id: '1450882697865203853', name: 'Portland' }
]

interface ChannelConfig {
  id: string
  serverName: string
  channelId: string
  forwardToChannelId: string
}

interface WeeklyCupSettingsProps {
  scriptId: string
  onClose?: () => void
}

export default function WeeklyCupSettings({ scriptId, onClose }: WeeklyCupSettingsProps) {
  const [botToken, setBotToken] = useState('')
  const [channels, setChannels] = useState<ChannelConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [collapsedChannels, setCollapsedChannels] = useState<Set<string>>(new Set())
  const [channelsInitialized, setChannelsInitialized] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [openServerDropdown, setOpenServerDropdown] = useState<string | null>(null)

  useEffect(() => {
    loadEnvSettings()
  }, [scriptId])


  useEffect(() => {
    if (channels.length > 0 && !channelsInitialized) {
      const allChannelIds = new Set(channels.map((ch: ChannelConfig) => ch.id))
      setCollapsedChannels(allChannelIds)
      setChannelsInitialized(true)
    }
  }, [channels, channelsInitialized])

  const loadEnvSettings = async () => {
    try {
      const response = await scriptsApi.getScriptEnvFile(scriptId)
      const envContent = response.data.content

      if (envContent) {
        parseEnvContent(envContent)
      } else {

        setBotToken('')
        setChannels([
          { id: '1', serverName: '', channelId: '', forwardToChannelId: '' }
        ])
      }
    } catch (error) {
      console.error('Ошибка загрузки .env файла:', error)
      showErrorToast('Ошибка загрузки настроек')
    } finally {
      setIsLoading(false)
    }
  }

  const parseEnvContent = (content: string) => {
    const lines = content.split('\n')
    let token = ''
    let key = ''
    let url = ''
    const channelList: ChannelConfig[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('BOT_TOKEN=')) {
        token = trimmedLine.split('=')[1] || ''
      } else if (trimmedLine.startsWith('API_KEY=')) {
        key = trimmedLine.split('=')[1] || ''
      } else if (trimmedLine.startsWith('API_URL=')) {
        url = trimmedLine.split('=')[1] || ''
      } else if (trimmedLine.startsWith('CHANNELS_COUNT=')) {
        const count = parseInt(trimmedLine.split('=')[1]) || 0

        for (let i = 1; i <= count; i++) {
          const serverName = getEnvValue(lines, `CHANNEL_${i}_SERVER_NAME`)
          const channelId = getEnvValue(lines, `CHANNEL_${i}_ID`)
          const forwardToChannelId = getEnvValue(lines, `CHANNEL_${i}_FORWARD_TO`)

          if (serverName || channelId || forwardToChannelId) {
            channelList.push({
              id: i.toString(),
              serverName: serverName || '',
              channelId: channelId || '',
              forwardToChannelId: forwardToChannelId || ''
            } as ChannelConfig)
          }
        }
      }
    }

    setBotToken(token)
    setApiKey(key || crypto.randomUUID())
    setApiUrl(url || window.location.origin + '/api')
    setChannels(channelList.length > 0 ? channelList : [
      { id: '1', serverName: '', channelId: '', forwardToChannelId: '' }
    ])
  }

  const getEnvValue = (lines: string[], key: string): string => {
    for (const line of lines) {
      if (line.trim().startsWith(`${key}=`)) {
        const value = line.split('=')[1] || ''
        return value
      }
    }
    return ''
  }

  const generateEnvContent = (): string => {
    let content = `# Токен Discord self-бота\n`
    content += `BOT_TOKEN=${botToken}\n\n`
    content += `# API настройки для связи с бэкендом\n`

    const finalApiUrl = apiUrl || window.location.origin + '/api'
    const finalApiKey = apiKey || crypto.randomUUID()
    content += `API_URL=${finalApiUrl}\n`
    content += `API_KEY=${finalApiKey}\n`
    content += `SCRIPT_ID=${scriptId}\n`
    content += `# Если возникают ошибки SSL сертификата, раскомментируйте следующую строку:\n`
    content += `IGNORE_SSL=true\n\n`
    content += `# Количество каналов для мониторинга новостей\n`
    content += `CHANNELS_COUNT=${channels.length}\n\n`

    channels.forEach((channel: ChannelConfig, index: number) => {
      content += `# Настройки канала ${index + 1}\n`
      content += `CHANNEL_${index + 1}_SERVER_NAME=${channel.serverName}\n`
      content += `CHANNEL_${index + 1}_ID=${channel.channelId}\n`
      content += `CHANNEL_${index + 1}_FORWARD_TO=${channel.forwardToChannelId}\n\n`
    })

    return content
  }

  const handleSave = async () => {
    if (!botToken.trim()) {
      showErrorToast('Введите токен бота')
      return
    }

    const hasEmptyChannels = channels.some((ch: ChannelConfig) => !ch.serverName.trim() || !ch.channelId.trim() || !ch.forwardToChannelId.trim())
    if (hasEmptyChannels) {
      showErrorToast('Заполните все поля для всех каналов')
      return
    }

    setIsSaving(true)
    try {
      const envContent = generateEnvContent()
      await scriptsApi.updateScriptEnvFile(scriptId, envContent)
      showSuccessToast('Настройки сохранены')
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error)
      showErrorToast('Ошибка сохранения настроек')
    } finally {
      setIsSaving(false)
    }
  }

  const addChannel = () => {
    const newId = (channels.length + 1).toString()
    setChannels([...channels, {
      id: newId,
      serverName: '',
      channelId: '',
      forwardToChannelId: ''
    }])
  }

  const removeChannel = (id: string) => {
    if (channels.length > 1) {
      setChannels(channels.filter((ch: ChannelConfig) => ch.id !== id))
    }
  }

  const updateChannel = (id: string, field: keyof ChannelConfig, value: string) => {
    setChannels(channels.map((ch: ChannelConfig) =>
      ch.id === id ? { ...ch, [field]: value } : ch
    ))
  }

  const toggleChannelCollapse = (channelId: string) => {
    setCollapsedChannels((prev: Set<string>) => {
      const newSet = new Set(prev)
      if (newSet.has(channelId)) {
        newSet.delete(channelId)
      } else {
        newSet.add(channelId)
      }
      return newSet
    })
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
          Настройки Weekly Cup бота
        </h3>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Bot className="h-5 w-5 text-[#a476ff]" />
          <h4 className="text-sm font-medium text-[#dfdfdf]">Токен Discord self-бота</h4>
        </div>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={botToken}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBotToken(e.target.value)}
            placeholder="Введите токен self-бота"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#f3f3f398] hover:text-[#dfdfdf]"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#f3f3f398]">
          Токен self-бота для мониторинга новостей и пересылки в каналы
        </p>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Hash className="h-5 w-5 text-[#a476ff]" />
            <h4 className="text-sm font-medium text-[#dfdfdf]">Каналы для мониторинга новостей</h4>
          </div>
          <button
            onClick={addChannel}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="h-4 w-4" />
            Добавить канал
          </button>
        </div>

        <div className="space-y-4">
          {channels.map((channel: ChannelConfig, index: number) => {
            const isCollapsed = collapsedChannels.has(channel.id)
            return (
              <div key={channel.id} className="border border-[#ffffff10] rounded-lg p-4 bg-[#1a1a1a]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleChannelCollapse(channel.id)}
                      className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <h5 className="text-sm font-medium text-[#dfdfdf]">
                      {channel.serverName || `Канал ${index + 1}`}
                    </h5>
                  </div>
                  {channels.length > 1 && (
                    <button
                      onClick={() => removeChannel(channel.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                          Сервер (ID канала)
                        </label>
                        <div className="relative">
                          <button
                            onClick={() => setOpenServerDropdown(openServerDropdown === channel.id ? null : channel.id)}
                            className="inline-flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all justify-between text-[#dfdfdf] bg-[#151515] border border-[#ffffff10] hover:bg-[#1f1f1f] min-h-[40px]"
                          >
                            <div className="flex items-center space-x-2">
                              <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                              <span>
                                {channel.channelId
                                  ? WEEKLY_CUP_SERVERS.find(s => s.id === channel.channelId)?.name || 'Выберите сервер...'
                                  : 'Выберите сервер...'}
                              </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${openServerDropdown === channel.id ? 'rotate-180' : ''}`} />
                          </button>

                          {openServerDropdown === channel.id && (() => {

                            const selectedServerIds = channels
                              .filter((ch: ChannelConfig) => ch.id !== channel.id && ch.channelId)
                              .map((ch: ChannelConfig) => ch.channelId)


                            const availableServers = WEEKLY_CUP_SERVERS.filter(server =>
                              !selectedServerIds.includes(server.id) || channel.channelId === server.id
                            )

                            return (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenServerDropdown(null)}
                                />
                                <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                  <div className="p-2">
                                    <button
                                      onClick={() => {
                                        updateChannel(channel.id, 'channelId', '');
                                        setOpenServerDropdown(null);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                        !channel.channelId
                                          ? 'bg-[#151515] text-[#dfdfdf]'
                                          : 'text-[#dfdfdf] hover:bg-[#151515]'
                                      }`}
                                    >
                                      <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                                      <span>Выберите сервер...</span>
                                      {!channel.channelId && (
                                        <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                      )}
                                    </button>
                                    {availableServers.map((server) => (
                                      <button
                                        key={server.id}
                                        onClick={() => {
                                          updateChannel(channel.id, 'channelId', server.id);
                                          setOpenServerDropdown(null);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                          channel.channelId === server.id
                                            ? 'bg-[#151515] text-[#dfdfdf]'
                                            : 'text-[#dfdfdf] hover:bg-[#151515]'
                                        }`}
                                      >
                                        <ServerIcon className="h-4 w-4 text-[#a476ff]" />
                                        <span>{server.name}</span>
                                        {channel.channelId === server.id && (
                                          <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                          Название сервера
                        </label>
                        <input
                          type="text"
                          value={channel.serverName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateChannel(channel.id, 'serverName', e.target.value)}
                          placeholder="Название сервера"
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                        Куда пересылать
                      </label>
                      <input
                        type="text"
                        value={channel.forwardToChannelId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateChannel(channel.id, 'forwardToChannelId', e.target.value)}
                        placeholder="ID канала с личного дискорда"
                        className="input text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[#a476ff20] border border-[#a476ff40] rounded-md p-4">
        <div className="flex">
          <MessageSquare className="h-5 w-5 text-[#a476ff] mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-[#dfdfdf]">
              Как работает бот
            </h4>
            <div className="mt-2 text-sm text-[#f3f3f398]">
              <p>Бот мониторит указанные каналы и автоматически пересылает новости в ваши личные каналы Discord.</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Бот отслеживает новости в указанных каналах</li>
                <li>Пересылает только сообщения, содержащие "открываем заявки" и "Warzone"</li>
                <li>При появлении новой новости - пересылает её в указанный канал</li>
                <li>Поддерживает мониторинг нескольких каналов одновременно</li>
                <li>Каждый канал может пересылать новости в свой личный канал Discord</li>
              </ul>
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
