import { useState, useEffect } from 'react'
import { Plus, X, Play, Edit2, Trash2, Clock, CheckCircle, Loader, ChevronDown, Sparkles, Calendar as CalendarIcon, Settings, Gamepad2, Trophy, Users } from 'lucide-react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'

type ScheduledTaskType =
  | 'CHECK_AUTO_UPDATE'
  | 'CHECK_SCRIPT_EXPIRY'
  | 'AUTO_RELOAD_SCRIPTS'
  | 'CLEANUP_OLD_LOGS'
  | 'BACKUP_DATABASE'
  | 'HEALTH_CHECK'

interface ScheduledTask {
  id: string
  name: string
  description?: string
  taskType: ScheduledTaskType
  cronExpression: string
  timezone: string
  parameters?: any
  isActive: boolean
  isRunning: boolean
  lastRunAt?: string
  lastRunStatus?: string
  lastRunError?: string
  runCount: number
  failCount: number
  nextRunAt?: string
  createdAt: string
  updatedAt: string
}


const TASK_TYPE_LABELS: Record<ScheduledTaskType, string> = {
  CHECK_AUTO_UPDATE: 'Проверка автообновления скриптов',
  CHECK_SCRIPT_EXPIRY: 'Проверка истечения скриптов',
  AUTO_RELOAD_SCRIPTS: 'Автоперезагрузка всех скриптов',
  CLEANUP_OLD_LOGS: 'Очистка старых логов',
  BACKUP_DATABASE: 'Резервное копирование БД',
  HEALTH_CHECK: 'Проверка здоровья системы',
}

const TASK_TYPE_ICONS: Record<ScheduledTaskType, any> = {
  CHECK_AUTO_UPDATE: Clock,
  CHECK_SCRIPT_EXPIRY: Clock,
  AUTO_RELOAD_SCRIPTS: Clock,
  CLEANUP_OLD_LOGS: Trash2,
  BACKUP_DATABASE: Clock,
  HEALTH_CHECK: CheckCircle,
}

const SCRIPT_TYPES = [
  { value: 'CUSTOM', label: 'Пользовательский', icon: Settings },
  { value: 'CYBER_LEAGUE', label: 'Cyber League', icon: Gamepad2 },
  { value: 'WEEKLY_CUP', label: 'Weekly Cup', icon: Trophy },
  { value: 'ALLIANCE_BOT', label: 'Alliance Bot', icon: Users },
]

const COMMON_CRON_PRESETS = [
  { label: 'Каждую минуту', value: '* * * * *' },
  { label: 'Каждые 5 минут', value: '*/5 * * * *' },
  { label: 'Каждые 15 минут', value: '*/15 * * * *' },
  { label: 'Каждые 30 минут', value: '*/30 * * * *' },
  { label: 'Каждый час', value: '0 * * * *' },
  { label: 'Каждые 6 часов', value: '0 */6 * * *' },
  { label: 'Каждые 12 часов', value: '0 */12 * * *' },
  { label: 'Каждый день в 00:00', value: '0 0 * * *' },
  { label: 'Каждый день в 12:00', value: '0 12 * * *' },
  { label: 'Каждую неделю (понедельник 00:00)', value: '0 0 * * 1' },
  { label: 'Каждый месяц (1 число 00:00)', value: '0 0 1 * *' },
]

const DAYS_OF_WEEK = [
  { value: '0', label: 'Воскресенье' },
  { value: '1', label: 'Понедельник' },
  { value: '2', label: 'Вторник' },
  { value: '3', label: 'Среда' },
  { value: '4', label: 'Четверг' },
  { value: '5', label: 'Пятница' },
  { value: '6', label: 'Суббота' },
]

const MONTHS = [
  { value: '1', label: 'Январь' },
  { value: '2', label: 'Февраль' },
  { value: '3', label: 'Март' },
  { value: '4', label: 'Апрель' },
  { value: '5', label: 'Май' },
  { value: '6', label: 'Июнь' },
  { value: '7', label: 'Июль' },
  { value: '8', label: 'Август' },
  { value: '9', label: 'Сентябрь' },
  { value: '10', label: 'Октябрь' },
  { value: '11', label: 'Ноябрь' },
  { value: '12', label: 'Декабрь' },
]

export default function AdminScheduler() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRunningTask, setIsRunningTask] = useState<string | null>(null)
  const [isCronPresetOpen, setIsCronPresetOpen] = useState(false)
  const [isTaskTypeDropdownOpen, setIsTaskTypeDropdownOpen] = useState(false)
  const [cronInputMode, setCronInputMode] = useState<'manual' | 'visual'>('manual')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    taskType: 'CHECK_AUTO_UPDATE' as ScheduledTaskType,
    cronExpression: '0 * * * *',
    timezone: 'Europe/Moscow',
    parameters: {} as any,
    isActive: true,
  })

  const [visualCron, setVisualCron] = useState({
    minute: '0',
    hour: '*',
    day: '*',
    month: '*',
    dayOfWeek: '*',
  })

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const response = await adminApi.getScheduledTasks()
      setTasks(response.data)
    } catch (error) {
      console.error('Ошибка загрузки задач:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTaskTypeChange = (taskType: ScheduledTaskType) => {
    setFormData(prev => ({
      ...prev,
      taskType,
      parameters: {}
    }))
    setIsTaskTypeDropdownOpen(false)
  }

  const handleVisualCronChange = (field: keyof typeof visualCron, value: string) => {
    const newVisualCron = { ...visualCron, [field]: value }
    setVisualCron(newVisualCron)

    const cronExpr = `${newVisualCron.minute} ${newVisualCron.hour} ${newVisualCron.day} ${newVisualCron.month} ${newVisualCron.dayOfWeek}`
    setFormData(prev => ({ ...prev, cronExpression: cronExpr }))
  }

  const parseCronToVisual = (cronExpr: string) => {
    const parts = cronExpr.split(' ')
    if (parts.length === 5) {
      setVisualCron({
        minute: parts[0],
        hour: parts[1],
        day: parts[2],
        month: parts[3],
        dayOfWeek: parts[4],
      })
    }
  }

  const handleCronModeChange = (mode: 'manual' | 'visual') => {
    setCronInputMode(mode)
    if (mode === 'visual') {
      parseCronToVisual(formData.cronExpression)
    }
  }

  const handleCronPresetSelect = (preset: string) => {
    setFormData(prev => ({
      ...prev,
      cronExpression: preset
    }))
    setIsCronPresetOpen(false)
    if (cronInputMode === 'visual') {
      parseCronToVisual(preset)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.cronExpression.trim()) {
      showErrorToast('Название и cron выражение обязательны')
      return
    }

    setIsCreating(true)
    try {
      await adminApi.createScheduledTask(formData)
      showSuccessToast('Задача создана успешно')
      setShowCreateForm(false)
      resetForm()
      loadTasks()
    } catch (error: any) {
      console.error('Ошибка создания задачи:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingTask || !formData.name.trim() || !formData.cronExpression.trim()) {
      showErrorToast('Название и cron выражение обязательны')
      return
    }

    setIsUpdating(true)
    try {
      await adminApi.updateScheduledTask(editingTask.id, formData)
      showSuccessToast('Задача обновлена успешно')
      setEditingTask(null)
      resetForm()
      loadTasks()
    } catch (error: any) {
      console.error('Ошибка обновления задачи:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return
    }

    try {
      await adminApi.deleteScheduledTask(taskId)
      showSuccessToast('Задача удалена успешно')
      loadTasks()
    } catch (error: any) {
      console.error('Ошибка удаления задачи:', error)
    }
  }

  const handleRunTask = async (taskId: string) => {
    setIsRunningTask(taskId)
    try {
      await adminApi.runScheduledTask(taskId)
      showSuccessToast('Задача запущена вручную')
      await loadTasks()
    } catch (error: any) {
      console.error('Ошибка запуска задачи:', error)
    } finally {
      setIsRunningTask(null)
    }
  }

  const handleEditTask = (task: ScheduledTask) => {
    setEditingTask(task)
    setFormData({
      name: task.name,
      description: task.description || '',
      taskType: task.taskType,
      cronExpression: task.cronExpression,
      timezone: task.timezone,
      parameters: task.parameters || {},
      isActive: task.isActive,
    })
    parseCronToVisual(task.cronExpression)
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      taskType: 'CHECK_AUTO_UPDATE',
      cronExpression: '0 * * * *',
      timezone: 'Europe/Moscow',
      parameters: {},
      isActive: true,
    })
    setVisualCron({
      minute: '0',
      hour: '*',
      day: '*',
      month: '*',
      dayOfWeek: '*',
    })
    setCronInputMode('manual')
    setEditingTask(null)
  }

  const handleCancelEdit = () => {
    setShowCreateForm(false)
    resetForm()
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const generateMinuteOptions = () => {
    return Array.from({ length: 60 }, (_, i) => i.toString())
  }

  const generateHourOptions = () => {
    return Array.from({ length: 24 }, (_, i) => i.toString())
  }

  const generateDayOptions = () => {
    return Array.from({ length: 31 }, (_, i) => (i + 1).toString())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const TaskTypeIcon = TASK_TYPE_ICONS[formData.taskType]

  return (
    <div className="space-y-6">
      {showCreateForm && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {editingTask ? 'Редактирование задачи' : 'Создание новой задачи'}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  Название задачи *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input min-h-[40px]"
                  placeholder="Проверка автообновления скриптов"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  Описание
                </label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input min-h-[80px]"
                  placeholder="Описание задачи..."
                  rows={3}
                />
              </div>

              <div>
                <label htmlFor="taskType" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  Тип задачи *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTaskTypeDropdownOpen(!isTaskTypeDropdownOpen)}
                    className="inline-flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-all justify-between text-[#dfdfdf] bg-[#1a1a1a] border border-[#ffffff10] hover:bg-[#1f1f1f] min-h-[40px]"
                  >
                    <div className="flex items-center space-x-2">
                      <TaskTypeIcon className="h-4 w-4 text-[#a476ff]" />
                      <span>{TASK_TYPE_LABELS[formData.taskType]}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isTaskTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isTaskTypeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsTaskTypeDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20">
                        <div className="p-2">
                          {(Object.keys(TASK_TYPE_LABELS) as ScheduledTaskType[]).map((taskType) => {
                            const Icon = TASK_TYPE_ICONS[taskType]
                            return (
                              <button
                                key={taskType}
                                type="button"
                                onClick={() => handleTaskTypeChange(taskType)}
                                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center space-x-2 ${
                                  formData.taskType === taskType
                                    ? 'bg-[#151515] text-[#dfdfdf]'
                                    : 'text-[#dfdfdf] hover:bg-[#151515]'
                                }`}
                              >
                                <Icon className="h-4 w-4 text-[#a476ff]" />
                                <span>{TASK_TYPE_LABELS[taskType]}</span>
                                {formData.taskType === taskType && (
                                  <CheckCircle className="h-4 w-4 ml-auto text-green-400" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="cronExpression" className="block text-sm font-medium text-[#dfdfdf] mb-2">
                  Расписание *
                </label>

                <div className="flex items-center space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleCronModeChange('manual')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      cronInputMode === 'manual'
                        ? 'bg-[#a476ff] text-white'
                        : 'bg-[#1a1a1a] text-[#dfdfdf] hover:bg-[#151515] border border-[#ffffff10]'
                    }`}
                  >
                    Ручной ввод
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCronModeChange('visual')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      cronInputMode === 'visual'
                        ? 'bg-[#a476ff] text-white'
                        : 'bg-[#1a1a1a] text-[#dfdfdf] hover:bg-[#151515] border border-[#ffffff10]'
                    }`}
                  >
                    <CalendarIcon className="h-3 w-3 inline mr-1" />
                    Визуальный
                  </button>
                </div>

                {cronInputMode === 'manual' ? (
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        name="cronExpression"
                        id="cronExpression"
                        value={formData.cronExpression}
                        onChange={handleInputChange}
                        className="input min-h-[40px] font-mono text-sm"
                        placeholder="0 * * * *"
                        required
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <button
                          type="button"
                          onClick={() => setIsCronPresetOpen(!isCronPresetOpen)}
                          className="p-1 text-[#f3f3f398] hover:text-[#dfdfdf]"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${isCronPresetOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isCronPresetOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsCronPresetOpen(false)}
                          />
                          <div className="absolute left-0 mt-2 w-full bg-[#1a1a1a] border border-[#ffffff10] rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                            <div className="p-2">
                              {COMMON_CRON_PRESETS.map((preset) => (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => handleCronPresetSelect(preset.value)}
                                  className="w-full text-left px-3 py-2 text-sm rounded transition-colors text-[#dfdfdf] hover:bg-[#151515]"
                                >
                                  <div className="font-medium">{preset.label}</div>
                                  <div className="text-xs text-[#f3f3f398] font-mono">{preset.value}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">Минута</label>
                        <select
                          value={visualCron.minute}
                          onChange={(e) => handleVisualCronChange('minute', e.target.value)}
                          className="input text-sm min-h-[36px]"
                        >
                          <option value="*">Каждую</option>
                          {generateMinuteOptions().map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="*/5">Каждые 5</option>
                          <option value="*/15">Каждые 15</option>
                          <option value="*/30">Каждые 30</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">Час</label>
                        <select
                          value={visualCron.hour}
                          onChange={(e) => handleVisualCronChange('hour', e.target.value)}
                          className="input text-sm min-h-[36px]"
                        >
                          <option value="*">Каждый</option>
                          {generateHourOptions().map(h => (
                            <option key={h} value={h}>{h.padStart(2, '0')}</option>
                          ))}
                          <option value="*/6">Каждые 6</option>
                          <option value="*/12">Каждые 12</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">День месяца</label>
                        <select
                          value={visualCron.day}
                          onChange={(e) => handleVisualCronChange('day', e.target.value)}
                          className="input text-sm min-h-[36px]"
                        >
                          <option value="*">Каждый</option>
                          {generateDayOptions().map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">Месяц</label>
                        <select
                          value={visualCron.month}
                          onChange={(e) => handleVisualCronChange('month', e.target.value)}
                          className="input text-sm min-h-[36px]"
                        >
                          <option value="*">Каждый</option>
                          {MONTHS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">День недели</label>
                        <select
                          value={visualCron.dayOfWeek}
                          onChange={(e) => handleVisualCronChange('dayOfWeek', e.target.value)}
                          className="input text-sm min-h-[36px]"
                        >
                          <option value="*">Каждый</option>
                          {DAYS_OF_WEEK.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#ffffff10]">
                      <div className="text-xs text-[#f3f3f398]">
                        <span className="font-medium text-[#dfdfdf]">Cron выражение:</span>
                        <span className="ml-2 font-mono text-[#a476ff]">{formData.cronExpression}</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="mt-1 text-xs text-[#f3f3f398]">
                  Формат: минута час день месяц день_недели (например: 0 * * * * - каждый час)
                </p>
              </div>

              {formData.taskType === 'AUTO_RELOAD_SCRIPTS' && (
                <div className="space-y-4 p-4 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-[#dfdfdf] mb-2">
                      Типы скриптов для перезагрузки
                    </label>
                    <p className="text-xs text-[#f3f3f398] mb-3">
                      Выберите типы скриптов, которые будут перезагружены. Если ничего не выбрано, будут перезагружены все типы.
                    </p>
                    <div className="space-y-2">
                      {SCRIPT_TYPES.map((scriptType) => {
                        const isSelected = formData.parameters?.scriptTypes?.includes(scriptType.value) || false
                        const Icon = scriptType.icon
                        return (
                          <label
                            key={scriptType.value}
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                                : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentTypes = formData.parameters?.scriptTypes || []
                                const newTypes = e.target.checked
                                  ? [...currentTypes, scriptType.value]
                                  : currentTypes.filter((t: string) => t !== scriptType.value)

                                setFormData(prev => ({
                                  ...prev,
                                  parameters: {
                                    ...prev.parameters,
                                    scriptTypes: newTypes.length > 0 ? newTypes : undefined,
                                  },
                                }))
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-[#a476ff] bg-[#a476ff]'
                                : 'border-[#ffffff20]'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="flex items-center text-sm font-medium text-[#dfdfdf]">
                              <Icon className="h-4 w-4 mr-2 text-[#a476ff]" />
                              <span>{scriptType.label}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ffffff10]">
                    <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.parameters?.onlyRunning !== false
                        ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                        : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.parameters?.onlyRunning !== false}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            parameters: {
                              ...prev.parameters,
                              onlyRunning: e.target.checked,
                            },
                          }))
                        }}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                        formData.parameters?.onlyRunning !== false
                          ? 'border-[#a476ff] bg-[#a476ff]'
                          : 'border-[#ffffff20]'
                      }`}>
                        {formData.parameters?.onlyRunning !== false && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className="text-sm font-medium text-[#dfdfdf]">
                        Перезагружать только запущенные скрипты
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {formData.taskType === 'CLEANUP_OLD_LOGS' && (
                <div className="space-y-4 p-4 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-[#dfdfdf] mb-2">
                      Типы скриптов для очистки логов
                    </label>
                    <p className="text-xs text-[#f3f3f398] mb-3">
                      Выберите типы скриптов, у которых будут очищены логи. Если ничего не выбрано, будут очищены логи у всех типов.
                    </p>
                    <div className="space-y-2">
                      {SCRIPT_TYPES.map((scriptType) => {
                        const isSelected = formData.parameters?.scriptTypes?.includes(scriptType.value) || false
                        const Icon = scriptType.icon
                        return (
                          <label
                            key={scriptType.value}
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                                : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const currentTypes = formData.parameters?.scriptTypes || []
                                const newTypes = e.target.checked
                                  ? [...currentTypes, scriptType.value]
                                  : currentTypes.filter((t: string) => t !== scriptType.value)

                                setFormData(prev => ({
                                  ...prev,
                                  parameters: {
                                    ...prev.parameters,
                                    scriptTypes: newTypes.length > 0 ? newTypes : undefined,
                                  },
                                }))
                              }}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'border-[#a476ff] bg-[#a476ff]'
                                : 'border-[#ffffff20]'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="flex items-center text-sm font-medium text-[#dfdfdf]">
                              <Icon className="h-4 w-4 mr-2 text-[#a476ff]" />
                              <span>{scriptType.label}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ffffff10]">
                    <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      formData.parameters?.onlyRunning !== false
                        ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                        : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={formData.parameters?.onlyRunning !== false}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            parameters: {
                              ...prev.parameters,
                              onlyRunning: e.target.checked,
                            },
                          }))
                        }}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                        formData.parameters?.onlyRunning !== false
                          ? 'border-[#a476ff] bg-[#a476ff]'
                          : 'border-[#ffffff20]'
                      }`}>
                        {formData.parameters?.onlyRunning !== false && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className="text-sm font-medium text-[#dfdfdf]">
                        Очищать логи только у запущенных скриптов
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <div className={`p-4 rounded-lg border transition-colors ${
                  formData.isActive
                    ? 'border-[#a476ff] bg-[#a476ff10]'
                    : 'border-[#ffffff10] bg-[#1a1a1a] hover:border-[#ffffff20]'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${
                        formData.isActive
                          ? 'bg-[#a476ff20] text-[#a476ff]'
                          : 'bg-[#ffffff10] text-[#f3f3f398]'
                      }`}>
                        <Clock className={`h-5 w-5 ${formData.isActive ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-semibold text-[#dfdfdf]">
                            Активность задачи
                          </h4>
                          {formData.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#a476ff20] text-[#a476ff] border border-[#a476ff40]">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Активна
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#f3f3f398] leading-relaxed">
                          {formData.isActive
                            ? 'Задача будет выполняться согласно расписанию'
                            : 'Задача будет создана, но не будет автоматически выполняться'}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive || false}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-[#ffffff10] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#a476ff40] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#a476ff]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-secondary btn-sm"
                  disabled={isCreating || isUpdating}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="btn btn-primary btn-sm"
                >
                  {(isCreating || isUpdating) ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">{editingTask ? 'Обновление...' : 'Создание...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span className="ml-2">{editingTask ? 'Обновить' : 'Создать задачу'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                Планировщик задач
              </h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                Управление автоматическими задачами системы
              </p>
            </div>
            {!showCreateForm && (
              <button
                onClick={() => {
                  resetForm()
                  setShowCreateForm(true)
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4" />
                Создать задачу
              </button>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-[#f3f3f398]" />
              <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Нет задач</h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                Создайте первую задачу для автоматизации процессов.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    resetForm()
                    setShowCreateForm(true)
                  }}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  Создать задачу
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => {
                return (
                  <div key={task.id} className="card shadow-lg flex flex-col">
                    <div className="card-header">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-semibold text-[#dfdfdf] leading-tight break-words">{task.name}</h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {task.isActive ? (
                              <span className="text-sm text-green-400">Активно</span>
                            ) : (
                              <span className="text-sm text-gray-400">Неактивно</span>
                            )}
                            {task.isRunning && (
                              <span className="text-sm text-blue-400 flex items-center">
                                <Loader className="h-3 w-3 mr-1 animate-spin" />
                                Выполняется
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs sm:text-sm text-[#f3f3f398] mt-1 line-clamp-2 break-words">{task.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="card-content flex-1">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-[#f3f3f398]">
                          <span className="font-medium">Тип:</span>
                          <span className="ml-2 text-[#dfdfdf]">{TASK_TYPE_LABELS[task.taskType]}</span>
                        </div>
                        <div className="flex items-center text-sm text-[#f3f3f398]">
                          <span className="font-medium">Cron:</span>
                          <span className="ml-2 text-[#dfdfdf] font-mono text-xs">{task.cronExpression}</span>
                        </div>
                        <div className="flex items-center text-sm text-[#f3f3f398]">
                          <span className="font-medium">Последний:</span>
                          <span className="ml-2 text-[#dfdfdf] text-xs">{formatDate(task.lastRunAt)}</span>
                        </div>
                        <div className="flex items-center text-sm text-[#f3f3f398]">
                          <span className="font-medium">Следующий:</span>
                          <span className="ml-2 text-[#dfdfdf] text-xs">{formatDate(task.nextRunAt)}</span>
                        </div>
                        <div className="flex items-center text-sm text-[#f3f3f398]">
                          <span className="font-medium">Статистика:</span>
                          <span className="ml-2 text-[#dfdfdf] text-xs">
                            <span className="text-green-400">{task.runCount}</span> / <span className="text-red-400">{task.failCount}</span>
                          </span>
                        </div>

                        {task.lastRunError && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 line-clamp-2 break-words">
                            {task.lastRunError}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="space-y-3 w-full">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleRunTask(task.id)}
                            disabled={isRunningTask === task.id}
                            className="btn btn-primary btn-sm flex-1 sm:flex-none"
                            title="Запустить вручную"
                          >
                            {isRunningTask === task.id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">Запустить</span>
                          </button>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="btn btn-secondary btn-sm"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Изменить</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="btn btn-danger btn-sm"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-xs text-[#f3f3f398] text-left">
                          Создана: {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tasks.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[#ffffff10]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-[#dfdfdf]">
                    Всего задач: {tasks.length}
                  </h3>
                  <p className="mt-1 text-sm text-[#f3f3f398]">
                    Активных: {tasks.filter(t => t.isActive).length} | Выполняется: {tasks.filter(t => t.isRunning).length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
