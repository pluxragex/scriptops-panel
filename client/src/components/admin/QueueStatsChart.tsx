import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Activity, TrendingUp, Layers, Clock } from 'lucide-react'


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface QueueStats {
  deployment: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    paused: number
  }
  script: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    paused: number
  }
  expiry: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
    paused: number
  }
}

interface QueueStatsChartProps {
  queueStats: QueueStats
}

type ChartView = 'overview' | 'bar' | 'doughnut' | 'timeline'

export default function QueueStatsChart({ queueStats }: QueueStatsChartProps) {
  const [chartView, setChartView] = useState<ChartView>('overview')
  const [selectedQueue, setSelectedQueue] = useState<'deployment' | 'script' | 'expiry' | 'all'>('all')

  const calculateTotal = (queue: any) => {
    return (queue.waiting || 0) + (queue.active || 0) + (queue.completed || 0) + (queue.failed || 0) + (queue.delayed || 0) + (queue.paused || 0)
  }

  const getQueueName = (queue: string) => {
    switch (queue) {
      case 'deployment':
        return 'Деплойменты'
      case 'script':
        return 'Скрипты'
      case 'expiry':
        return 'Истечение срока'
      default:
        return 'Все очереди'
    }
  }

  const getQueueColor = (queue: string) => {
    switch (queue) {
      case 'deployment':
        return '#3B82F6'
      case 'script':
        return '#10B981'
      case 'expiry':
        return '#F59E0B'
      default:
        return '#8B5CF6'
    }
  }


  const overviewBarData = {
    labels: ['Деплойменты', 'Скрипты', 'Истечение срока'],
    datasets: [
      {
        label: 'Ожидание',
        data: [
          queueStats.deployment.waiting || 0,
          queueStats.script.waiting || 0,
          queueStats.expiry.waiting || 0,
        ],
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
        borderColor: 'rgba(234, 179, 8, 1)',
        borderWidth: 2,
      },
      {
        label: 'Активные',
        data: [
          queueStats.deployment.active || 0,
          queueStats.script.active || 0,
          queueStats.expiry.active || 0,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
      {
        label: 'Завершено',
        data: [
          queueStats.deployment.completed || 0,
          queueStats.script.completed || 0,
          queueStats.expiry.completed || 0,
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
      },
      {
        label: 'Ошибки',
        data: [
          queueStats.deployment.failed || 0,
          queueStats.script.failed || 0,
          queueStats.expiry.failed || 0,
        ],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
      },
    ],
  }


  const getDoughnutData = (queueName: 'deployment' | 'script' | 'expiry' | 'all') => {
    let total = 0
    let waiting = 0
    let active = 0
    let completed = 0
    let failed = 0
    let delayed = 0
    let paused = 0

    if (queueName === 'all') {

      waiting = (queueStats.deployment.waiting || 0) + (queueStats.script.waiting || 0) + (queueStats.expiry.waiting || 0)
      active = (queueStats.deployment.active || 0) + (queueStats.script.active || 0) + (queueStats.expiry.active || 0)
      completed = (queueStats.deployment.completed || 0) + (queueStats.script.completed || 0) + (queueStats.expiry.completed || 0)
      failed = (queueStats.deployment.failed || 0) + (queueStats.script.failed || 0) + (queueStats.expiry.failed || 0)
      delayed = (queueStats.deployment.delayed || 0) + (queueStats.script.delayed || 0) + (queueStats.expiry.delayed || 0)
      paused = (queueStats.deployment.paused || 0) + (queueStats.script.paused || 0) + (queueStats.expiry.paused || 0)
      total = waiting + active + completed + failed + delayed + paused
    } else {
      const queue = queueStats[queueName]
      waiting = queue.waiting || 0
      active = queue.active || 0
      completed = queue.completed || 0
      failed = queue.failed || 0
      delayed = queue.delayed || 0
      paused = queue.paused || 0
      total = calculateTotal(queue)
    }

    if (total === 0) {
      return {
        labels: ['Пусто'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(255, 255, 255, 0.1)'],
          borderColor: ['rgba(255, 255, 255, 0.2)'],
          borderWidth: 2,
        }],
      }
    }

    const data = []
    const labels = []
    const colors = []
    const borderColors = []

    if (waiting > 0) {
      data.push(waiting)
      labels.push('Ожидание')
      colors.push('rgba(234, 179, 8, 0.8)')
      borderColors.push('rgba(234, 179, 8, 1)')
    }
    if (active > 0) {
      data.push(active)
      labels.push('Активные')
      colors.push('rgba(59, 130, 246, 0.8)')
      borderColors.push('rgba(59, 130, 246, 1)')
    }
    if (completed > 0) {
      data.push(completed)
      labels.push('Завершено')
      colors.push('rgba(16, 185, 129, 0.8)')
      borderColors.push('rgba(16, 185, 129, 1)')
    }
    if (failed > 0) {
      data.push(failed)
      labels.push('Ошибки')
      colors.push('rgba(239, 68, 68, 0.8)')
      borderColors.push('rgba(239, 68, 68, 1)')
    }
    if (delayed > 0) {
      data.push(delayed)
      labels.push('Отложено')
      colors.push('rgba(139, 92, 246, 0.8)')
      borderColors.push('rgba(139, 92, 246, 1)')
    }
    if (paused > 0) {
      data.push(paused)
      labels.push('Приостановлено')
      colors.push('rgba(107, 114, 128, 0.8)')
      borderColors.push('rgba(107, 114, 128, 1)')
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 2,
      }],
    }
  }


  const timelineData = {
    labels: ['Ожидание', 'Активные', 'Завершено', 'Ошибки', 'Отложено', 'Приостановлено'],
    datasets: selectedQueue === 'all' ? [
      {
        label: 'Деплойменты',
        data: [
          queueStats.deployment.waiting || 0,
          queueStats.deployment.active || 0,
          queueStats.deployment.completed || 0,
          queueStats.deployment.failed || 0,
          queueStats.deployment.delayed || 0,
          queueStats.deployment.paused || 0,
        ],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Скрипты',
        data: [
          queueStats.script.waiting || 0,
          queueStats.script.active || 0,
          queueStats.script.completed || 0,
          queueStats.script.failed || 0,
          queueStats.script.delayed || 0,
          queueStats.script.paused || 0,
        ],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Истечение срока',
        data: [
          queueStats.expiry.waiting || 0,
          queueStats.expiry.active || 0,
          queueStats.expiry.completed || 0,
          queueStats.expiry.failed || 0,
          queueStats.expiry.delayed || 0,
          queueStats.expiry.paused || 0,
        ],
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ] : [
      {
        label: getQueueName(selectedQueue),
        data: (() => {
          const queue = queueStats[selectedQueue]
          return [
            queue.waiting || 0,
            queue.active || 0,
            queue.completed || 0,
            queue.failed || 0,
            queue.delayed || 0,
            queue.paused || 0,
          ]
        })(),
        borderColor: getQueueColor(selectedQueue),
        backgroundColor: getQueueColor(selectedQueue) + '20',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          color: '#dfdfdf',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#151515',
        titleColor: '#dfdfdf',
        bodyColor: '#dfdfdf',
        borderColor: '#ffffff10',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: chartView === 'bar' || chartView === 'timeline' ? {
      x: {
        ticks: {
          color: '#f3f3f398',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#f3f3f398',
          stepSize: 1,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
    } : undefined,
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          color: '#dfdfdf',
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: '#151515',
        titleColor: '#dfdfdf',
        bodyColor: '#dfdfdf',
        borderColor: '#ffffff10',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[#a476ff]" />
              <h4 className="text-lg font-medium text-[#dfdfdf]">
                Визуализация очередей
              </h4>
            </div>

            <div className="flex items-center space-x-3 flex-wrap">
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setChartView('overview')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                    chartView === 'overview'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                  title="Обзор"
                >
                  <Layers className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartView('bar')}
                  className={`px-3 py-2 text-sm font-medium border-t border-b ${
                    chartView === 'bar'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                  title="Столбчатая диаграмма"
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartView('doughnut')}
                  className={`px-3 py-2 text-sm font-medium border-t border-b ${
                    chartView === 'doughnut'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                  title="Круговая диаграмма"
                >
                  <Activity className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartView('timeline')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    chartView === 'timeline'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                  title="Временная линия"
                >
                  <Clock className="h-4 w-4" />
                </button>
              </div>

              {(chartView === 'doughnut' || chartView === 'timeline') && (
                <div className="flex rounded-md shadow-sm">
                  <button
                    onClick={() => setSelectedQueue('all')}
                    className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                      selectedQueue === 'all'
                        ? 'bg-[#a476ff] text-white border-[#a476ff]'
                        : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    Все
                  </button>
                  <button
                    onClick={() => setSelectedQueue('deployment')}
                    className={`px-3 py-2 text-sm font-medium border-t border-b ${
                      selectedQueue === 'deployment'
                        ? 'bg-[#a476ff] text-white border-[#a476ff]'
                        : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    Деплой
                  </button>
                  <button
                    onClick={() => setSelectedQueue('script')}
                    className={`px-3 py-2 text-sm font-medium border-t border-b ${
                      selectedQueue === 'script'
                        ? 'bg-[#a476ff] text-white border-[#a476ff]'
                        : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    Скрипты
                  </button>
                  <button
                    onClick={() => setSelectedQueue('expiry')}
                    className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                      selectedQueue === 'expiry'
                        ? 'bg-[#a476ff] text-white border-[#a476ff]'
                        : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    Истечение
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${chartView !== 'overview' && chartView !== 'doughnut' ? 'lg:grid-cols-2' : ''} gap-6`}>
        <div className={`${chartView === 'overview' || chartView === 'doughnut' ? 'col-span-1' : ''} bg-[#151515] border border-[#ffffff10] shadow rounded-lg p-6`}>
          <div className="h-96">
            {chartView === 'overview' && (
              <Bar data={overviewBarData} options={chartOptions} />
            )}
            {chartView === 'bar' && (
              <Bar data={overviewBarData} options={chartOptions} />
            )}
            {chartView === 'doughnut' && (
              <Doughnut
                data={getDoughnutData(selectedQueue)}
                options={doughnutOptions}
              />
            )}
            {chartView === 'timeline' && (
              <Line
                data={timelineData}
                options={chartOptions}
              />
            )}
          </div>
        </div>

        {chartView !== 'overview' && chartView !== 'doughnut' && (
          <div className="space-y-4">
            {(['deployment', 'script', 'expiry'] as const).map((queueName) => {
              const queue = queueStats[queueName]
              const total = calculateTotal(queue)
              const color = getQueueColor(queueName)

              return (
                <div
                  key={queueName}
                  className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg p-5 hover:border-[#ffffff20] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <h5 className="text-sm font-semibold text-[#dfdfdf]">
                        {getQueueName(queueName)}
                      </h5>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#1a1a1a] text-[#f3f3f398]">
                      {total}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#f3f3f398]">Ожидание</span>
                      <span className="text-yellow-400 font-semibold">{queue.waiting || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#f3f3f398]">Активные</span>
                      <span className="text-blue-400 font-semibold">{queue.active || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#f3f3f398]">Завершено</span>
                      <span className="text-green-400 font-semibold">{queue.completed || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#f3f3f398]">Ошибки</span>
                      <span className="text-red-400 font-semibold">{queue.failed || 0}</span>
                    </div>
                    {total > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#ffffff10]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#f3f3f398]">Прогресс</span>
                          <span className="text-[#dfdfdf] font-medium">
                            {queue.completed > 0 ? Math.round((queue.completed / total) * 100) : 0}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 via-blue-500 to-yellow-500 rounded-full transition-all duration-500"
                            style={{ width: `${total > 0 ? (queue.completed / total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

