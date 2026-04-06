import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Activity, Cpu, HardDrive, Wifi } from 'lucide-react'


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ServerStats {
  id: string
  name: string
  host: string
  status: 'online' | 'offline' | 'error'
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  uptime: number
  loadAverage: number[]
  runningScripts: number
  totalScripts: number
}

interface ServerStatsChartProps {
  servers: ServerStats[]
  selectedServer: string | null
}

export default function ServerStatsChart({ servers, selectedServer }: ServerStatsChartProps) {
  const [chartType, setChartType] = useState<'cpu' | 'memory' | 'disk' | 'network'>('cpu')
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h')
  const [chartData, setChartData] = useState<any>(null)


  const generateMockData = (server: ServerStats, type: string, timeRange: string) => {
    const now = new Date()
    const points = timeRange === '1h' ? 12 : timeRange === '6h' ? 24 : timeRange === '24h' ? 48 : 168
    const interval = timeRange === '1h' ? 5 : timeRange === '6h' ? 15 : timeRange === '24h' ? 30 : 60

    const labels = []
    const data = []

    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval * 60 * 1000)
      labels.push(time.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        ...(timeRange === '7d' && { day: '2-digit', month: '2-digit' })
      }))


      let baseValue = 0
      switch (type) {
        case 'cpu':
          baseValue = server.cpuUsage
          break
        case 'memory':
          baseValue = server.memoryUsage
          break
        case 'disk':
          baseValue = server.diskUsage
          break
        case 'network':
          baseValue = Math.max(server.networkIn, server.networkOut) / 1024 / 1024
          break
      }


      const variation = (Math.random() - 0.5) * 0.2
      const value = Math.max(0, Math.min(100, baseValue + baseValue * variation))
      data.push(parseFloat(value.toFixed(1)))
    }

    return { labels, data }
  }

  useEffect(() => {
    if (!servers.length) return

    const filteredServers = selectedServer
      ? servers.filter(server => server.id === selectedServer)
      : servers

    if (!filteredServers.length) return

    const colors = [
      '#3B82F6',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
    ]

    const datasets = filteredServers.map((server, index) => {
      const mockData = generateMockData(server, chartType, timeRange)
      const color = colors[index % colors.length]

      return {
        label: server.name,
        data: mockData.data,
        borderColor: color,
        backgroundColor: color + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        borderWidth: 2,
      }
    })

    const mockData = generateMockData(filteredServers[0], chartType, timeRange)

    setChartData({
      labels: mockData.labels,
      datasets,
    })
  }, [servers, selectedServer, chartType, timeRange])

  const getChartTitle = () => {
    switch (chartType) {
      case 'cpu':
        return 'Использование CPU (%)'
      case 'memory':
        return 'Использование памяти (%)'
      case 'disk':
        return 'Использование диска (%)'
      case 'network':
        return 'Сетевая активность (MB/s)'
      default:
        return 'Статистика серверов'
    }
  }

  const getChartIcon = () => {
    switch (chartType) {
      case 'cpu':
        return <Cpu className="h-5 w-5" />
      case 'memory':
        return <HardDrive className="h-5 w-5" />
      case 'disk':
        return <HardDrive className="h-5 w-5" />
      case 'network':
        return <Wifi className="h-5 w-5" />
      default:
        return <Activity className="h-5 w-5" />
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: '#dfdfdf',
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#151515',
        titleColor: '#dfdfdf',
        bodyColor: '#dfdfdf',
        borderColor: '#ffffff10',
        borderWidth: 1,
      },
    },
        scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Время',
          color: '#f3f3f398',
        },
        ticks: {
          color: '#f3f3f398',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: chartType === 'network' ? 'MB/s' : '%',
          color: '#f3f3f398',
        },
        ticks: {
          color: '#f3f3f398',
        },
        min: 0,
        max: chartType === 'network' ? undefined : 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-[#f3f3f398] animate-pulse" />
          <h3 className="mt-2 text-sm font-medium text-[#dfdfdf]">Загрузка графика...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              {getChartIcon()}
              <h4 className="text-lg font-medium text-[#dfdfdf]">
                {getChartTitle()}
              </h4>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setChartType('cpu')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                    chartType === 'cpu'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  CPU
                </button>
                <button
                  onClick={() => setChartType('memory')}
                  className={`px-3 py-2 text-sm font-medium border-t border-b ${
                    chartType === 'memory'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  Память
                </button>
                <button
                  onClick={() => setChartType('disk')}
                  className={`px-3 py-2 text-sm font-medium border-t border-b ${
                    chartType === 'disk'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  Диск
                </button>
                <button
                  onClick={() => setChartType('network')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    chartType === 'network'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  Сеть
                </button>
              </div>

              <div className="flex rounded-md shadow-sm">
                <button
                  onClick={() => setTimeRange('1h')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                    timeRange === '1h'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  1ч
                </button>
                <button
                  onClick={() => setTimeRange('6h')}
                  className={`px-3 py-2 text-sm font-medium border-t border-b ${
                    timeRange === '6h'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  6ч
                </button>
                <button
                  onClick={() => setTimeRange('24h')}
                  className={`px-3 py-2 text-sm font-medium border-t border-b ${
                    timeRange === '24h'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  24ч
                </button>
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                    timeRange === '7d'
                      ? 'bg-[#a476ff] text-white border-[#a476ff]'
                      : 'bg-[#151515] text-[#dfdfdf] border-[#ffffff10] hover:bg-[#1a1a1a]'
                  }`}
                >
                  7д
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg p-6">
        <div className="h-96">
          <Line data={chartData} options={options} />
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chartData.datasets.map((dataset: any, index: number) => {
            const server = servers.find(s => s.name === dataset.label)
            if (!server) return null

            return (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: dataset.borderColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#dfdfdf] truncate">
                    {server.name}
                  </p>
                  <p className="text-sm text-[#f3f3f398]">
                    {server.host}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#dfdfdf]">
                    {chartType === 'cpu' && `${server.cpuUsage.toFixed(1)}%`}
                    {chartType === 'memory' && `${server.memoryUsage.toFixed(1)}%`}
                    {chartType === 'disk' && `${server.diskUsage.toFixed(1)}%`}
                    {chartType === 'network' && `${(Math.max(server.networkIn, server.networkOut) / 1024 / 1024).toFixed(1)} MB/s`}
                  </p>
                  <p className="text-xs text-[#f3f3f398]">
                    {server.runningScripts}/{server.totalScripts} скриптов
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
