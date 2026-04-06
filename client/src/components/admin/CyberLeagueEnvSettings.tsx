import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Bot, Hash, MessageSquare, Eye, EyeOff, ChevronDown, ChevronRight, Server as ServerIcon, CheckCircle } from 'lucide-react'
import { scriptsApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'


const MCL_SERVERS = [
  { id: '924608736906059797', name: 'New York' },
  { id: '914894257142243368', name: 'Detroit' },
  { id: '1398945482067284079', name: 'Chicago' },
  { id: '923182097882034256', name: 'San Francisco' },
  { id: '959445168413626488', name: 'Atlanta' },
  { id: '918602797321162823', name: 'San Diego' },
  { id: '1056386855932801065', name: 'Los Angeles' },
  { id: '1118312976466837555', name: 'Miami' },
  { id: '1181428134676013056', name: 'Las Vegas' },
  { id: '1214710596159807508', name: 'Washington' },
  { id: '1248624970343514134', name: 'Dallas' },
  { id: '1273355514385928317', name: 'Boston' },
  { id: '1316481550858326116', name: 'Houston' },
  { id: '1333884914785058846', name: 'Seattle' },
  { id: '1381703723465703666', name: 'Phoenix' },
  { id: '1429823745257635870', name: 'Denver' },
  { id: '1450882794069823529', name: 'Portland' }
]

interface ChannelConfig {
  id: string
  channelId: string
  name: string
  messages: string[]
}

interface CyberLeagueEnvSettingsProps {
  scriptId: string
  onClose?: () => void
}

export default function CyberLeagueEnvSettings({ scriptId, onClose }: CyberLeagueEnvSettingsProps) {
  const [botToken, setBotToken] = useState('')
  const [channels, setChannels] = useState<ChannelConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [collapsedChannels, setCollapsedChannels] = useState<Set<string>>(new Set())
  const [channelsInitialized, setChannelsInitialized] = useState(false)
  const [openServerDropdown, setOpenServerDropdown] = useState<string | null>(null)

  useEffect(() => {
    loadEnvSettings()
  }, [scriptId])


  useEffect(() => {
    if (channels.length > 0 && !channelsInitialized) {
      const allChannelIds = new Set(channels.map(ch => ch.id))
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
          { id: '1', channelId: '', name: 'Channel 1', messages: [''] }
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
    const channelList: ChannelConfig[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('BOT_TOKEN=')) {
        token = trimmedLine.split('=')[1] || ''
      } else if (trimmedLine.startsWith('CHANNELS_COUNT=')) {
        const count = parseInt(trimmedLine.split('=')[1]) || 0

        for (let i = 1; i <= count; i++) {
          const channelId = getEnvValue(lines, `CHANNEL_${i}_ID`)
          const name = getEnvValue(lines, `CHANNEL_${i}_NAME`) || `Channel ${i}`
          const messageValue = getEnvValue(lines, `CHANNEL_${i}_MESSAGE`) || ''


          let messages: string[] = ['']
          if (messageValue) {
            try {
              const parsed = JSON.parse(messageValue)
              if (Array.isArray(parsed)) {
                messages = parsed.map((msg: any) => String(msg).replace(/\\n/g, '\n'))
                if (messages.length === 0) {
                  messages = ['']
                }
              } else {
                messages = [messageValue.replace(/\\n/g, '\n')]
              }
            } catch {

              messages = [messageValue.replace(/\\n/g, '\n')]
            }
          }

          if (channelId) {
            channelList.push({
              id: i.toString(),
              channelId,
              name,
              messages
            })
          }
        }
      }
    }

    setBotToken(token)
        setChannels(channelList.length > 0 ? channelList : [
          { id: '1', channelId: '', name: 'Channel 1', messages: [''] }
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
    content += `# Количество каналов для мониторинга\n`
    content += `CHANNELS_COUNT=${channels.length}\n\n`

    channels.forEach((channel, index) => {
      content += `# Настройки канала ${index + 1}\n`
      content += `CHANNEL_${index + 1}_ID=${channel.channelId}\n`
      content += `CHANNEL_${index + 1}_NAME=${channel.name}\n`


      const validMessages = channel.messages.filter(msg => msg.trim())
      if (validMessages.length === 0) {
        content += `CHANNEL_${index + 1}_MESSAGE=\n`
      } else if (validMessages.length === 1) {

        const messageWithEscapedNewlines = validMessages[0].replace(/\n/g, '\\n')
        content += `CHANNEL_${index + 1}_MESSAGE=${messageWithEscapedNewlines}\n`
      } else {

        const messagesArray = validMessages.map(msg => msg.replace(/\n/g, '\\n'))
        const jsonString = JSON.stringify(messagesArray)
        content += `CHANNEL_${index + 1}_MESSAGE=${jsonString}\n`
      }
      content += '\n'
    })

    return content
  }

  const handleSave = async () => {
    if (!botToken.trim()) {
      showErrorToast('Введите токен бота')
      return
    }

    const hasEmptyChannels = channels.some(ch => !ch.channelId.trim())
    if (hasEmptyChannels) {
      showErrorToast('Выберите сервер для всех каналов')
      return
    }

    setIsSaving(true)
    try {
      const envContent = generateEnvContent()
      await scriptsApi.updateScriptEnvFile(scriptId, envContent)
      showSuccessToast('Настройки сохранены')
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addChannel = () => {
    const newId = (channels.length + 1).toString()
        setChannels([...channels, {
          id: newId,
          channelId: '',
          name: `Channel ${channels.length + 1}`,
          messages: ['']
        }])
  }

  const removeChannel = (id: string) => {
    if (channels.length > 1) {
      setChannels(channels.filter(ch => ch.id !== id))
    }
  }

  const updateChannel = (id: string, field: keyof ChannelConfig, value: string | string[]) => {
    setChannels(channels.map(ch =>
      ch.id === id ? { ...ch, [field]: value } : ch
    ))
  }

  const addMessage = (channelId: string) => {
    setChannels(channels.map(ch =>
      ch.id === channelId && ch.messages.length < 5
        ? { ...ch, messages: [...ch.messages, ''] }
        : ch
    ))
  }

  const removeMessage = (channelId: string, messageIndex: number) => {
    setChannels(channels.map(ch =>
      ch.id === channelId
        ? {
            ...ch,
            messages: ch.messages.filter((_, index) => index !== messageIndex)
          }
        : ch
    ))
  }

  const updateMessage = (channelId: string, messageIndex: number, value: string) => {
    setChannels(channels.map(ch =>
      ch.id === channelId
        ? {
            ...ch,
            messages: ch.messages.map((msg, index) =>
              index === messageIndex ? value : msg
            )
          }
        : ch
    ))
  }

  const toggleChannelCollapse = (channelId: string) => {
    setCollapsedChannels(prev => {
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
          Настройки Cyber League бота
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
            onChange={(e) => setBotToken(e.target.value)}
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
          Токен self-бота для автоматической регистрации в каналах
        </p>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Hash className="h-5 w-5 text-[#a476ff]" />
            <h4 className="text-sm font-medium text-[#dfdfdf]">Каналы для мониторинга</h4>
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
          {channels.map((channel, index) => {
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
                      {channel.name || `Канал ${index + 1}`}
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
                          Сервер
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
                                  ? MCL_SERVERS.find(s => s.id === channel.channelId)?.name || 'Выберите сервер...'
                                  : 'Выберите сервер...'}
                              </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${openServerDropdown === channel.id ? 'rotate-180' : ''}`} />
                          </button>

                          {openServerDropdown === channel.id && (() => {

                            const selectedServerIds = channels
                              .filter(ch => ch.id !== channel.id && ch.channelId)
                              .map(ch => ch.channelId)


                            const availableServers = MCL_SERVERS.filter(server =>
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
                                        updateChannel(channel.id, 'channelId', '')
                                        setOpenServerDropdown(null)
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
                                          updateChannel(channel.id, 'channelId', server.id)
                                          setOpenServerDropdown(null)
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
                          Название канала
                        </label>
                        <input
                          type="text"
                          value={channel.name}
                          onChange={(e) => updateChannel(channel.id, 'name', e.target.value)}
                          placeholder="Registration Channel"
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-[#f3f3f398]">
                          Сообщение для отправки
                        </label>
                        {channel.messages.length < 5 && (
                          <button
                            onClick={() => addMessage(channel.id)}
                            className="text-[#a476ff] hover:text-[#8c5eff] text-xs flex items-center"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Добавить сообщение
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {channel.messages.map((message, messageIndex) => (
                          <div key={messageIndex}>
                            <label className="block text-xs text-[#f3f3f398] mb-1">
                              Сообщение:
                            </label>
                            <div className="flex items-start gap-2">
                              <textarea
                                value={message}
                                onChange={(e) => updateMessage(channel.id, messageIndex, e.target.value)}
                                placeholder="Введите текст сообщения...&#10;Можно использовать несколько строк"
                                rows={3}
                                className="input text-sm resize-vertical flex-1 min-h-[4.5rem]"
                              />
                              {channel.messages.length > 1 && (
                                <button
                                  onClick={() => removeMessage(channel.id, messageIndex)}
                                  className="text-red-400 hover:text-red-300 flex-shrink-0 pt-2"
                                  title="Удалить сообщение"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-[#f3f3f398] whitespace-pre-line">
                        💡 Можно добавить до 5 сообщений для каждого сервера. Каждое сообщение будет отправлено отдельно.{'\n\n'}Используйте Enter для переноса строки внутри сообщения.
                      </p>
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
              <p>Бот мониторит указанные каналы и автоматически отправляет сообщения, когда появляется возможность писать в канал.</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Бот отслеживает изменения прав доступа к каналам</li>
                <li>При появлении возможности писать - отправляет настроенное сообщение</li>
                <li>Поддерживает обработку лимитов скорости Discord</li>
                <li>Каждая строка отправляется как отдельное сообщение</li>
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