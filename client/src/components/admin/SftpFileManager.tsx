import React, { useState, useEffect, useRef } from 'react'
import {
  Folder,
  Upload,
  Trash2,
  FolderPlus,
  ArrowLeft,
  RefreshCw,
  Download,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  Archive,
  Code,
  Music,
  Video,
  FileIcon,
  Terminal,
  Send,
  Trash
} from 'lucide-react'
import { sshApi } from '../../services/api'
import { showSuccessToast, showErrorToast } from '../../lib/toast'
import LoadingSpinner from '../LoadingSpinner'

interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory' | 'link'
  size: number
  permissions: string
  owner: string
  group: string
  modified: string
}

interface SftpFileManagerProps {
  serverId: string
  serverName: string
  onClose: () => void
}

export default function SftpFileManager({ serverId, serverName, onClose }: SftpFileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showCreateDir, setShowCreateDir] = useState(false)
  const [newDirName, setNewDirName] = useState('')
  const [isCreatingDir, setIsCreatingDir] = useState(false)
  const [isEditingPath, setIsEditingPath] = useState(false)
  const [editingPathValue, setEditingPathValue] = useState('')
  const [showConsole, setShowConsole] = useState(false)
  const [consoleCommand, setConsoleCommand] = useState('')
  const [consoleHistory, setConsoleHistory] = useState<Array<{ command: string; output: string; error: string; timestamp: Date }>>([])
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pathInputRef = useRef<HTMLInputElement>(null)
  const consoleInputRef = useRef<HTMLInputElement>(null)
  const consoleOutputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadFiles()
  }, [currentPath])

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const response = await sshApi.listFiles(serverId, currentPath)
      setFiles(response.data)
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Ошибка загрузки файлов')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = (path: string) => {

    const normalizedPath = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    setCurrentPath(normalizedPath)
  }

  const handleStartEditPath = () => {
    setIsEditingPath(true)
    setEditingPathValue(currentPath)
  }

  const handleCancelEditPath = () => {
    setIsEditingPath(false)
    setEditingPathValue('')
  }

  const handleSavePath = () => {
    if (!editingPathValue.trim()) {
      handleCancelEditPath()
      return
    }


    let normalizedPath = editingPathValue.trim().replace(/\/+/g, '/')


    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath
    }


    if (normalizedPath !== '/' && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1)
    }

    handleNavigate(normalizedPath)
    setIsEditingPath(false)
    setEditingPathValue('')
  }

  const handlePathInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSavePath()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEditPath()
    }
  }

  useEffect(() => {
    if (isEditingPath && pathInputRef.current) {
      pathInputRef.current.focus()
      pathInputRef.current.select()
    }
  }, [isEditingPath])

  const handleGoBack = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    if (parts.length === 0) {
      setCurrentPath('/')
      return
    }
    const parentPath = '/' + parts.slice(0, -1).join('/')
    setCurrentPath(parentPath || '/')
  }

  const handleDelete = async (item: FileItem) => {
    if (!window.confirm(`Вы уверены, что хотите удалить ${item.type === 'directory' ? 'директорию' : 'файл'} "${item.name}"?`)) {
      return
    }

    setIsDeleting(item.path)
    try {
      await sshApi.deleteFile({ serverId, path: item.path })
      showSuccessToast(`${item.type === 'directory' ? 'Директория' : 'Файл'} удален`)
      loadFiles()
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Ошибка удаления')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {

      const uploadPath = currentPath.endsWith('/') ? currentPath : `${currentPath}/`
      await sshApi.uploadFile(serverId, uploadPath, file)
      showSuccessToast('Файл загружен')
      loadFiles()
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Ошибка загрузки файла')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = async (item: FileItem) => {
    if (item.type === 'directory') return

    try {
      const blob = await sshApi.downloadFile(serverId, item.path)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccessToast('Файл скачан')
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Ошибка скачивания файла')
    }
  }

  const handleCreateDirectory = async () => {
    if (!newDirName.trim()) {
      showErrorToast('Введите название директории')
      return
    }

    setIsCreatingDir(true)
    try {
      const newPath = currentPath === '/'
        ? `/${newDirName}`
        : `${currentPath}/${newDirName}`
      await sshApi.createDirectory({ serverId, path: newPath })
      showSuccessToast('Директория создана')
      setShowCreateDir(false)
      setNewDirName('')
      loadFiles()
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Ошибка создания директории')
    } finally {
      setIsCreatingDir(false)
    }
  }

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'directory') {
      return <Folder className="h-5 w-5 text-[#a476ff]" />
    }

    const ext = item.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return <ImageIcon className="h-5 w-5 text-blue-400" />
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return <Video className="h-5 w-5 text-purple-400" />
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <Music className="h-5 w-5 text-pink-400" />
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return <Archive className="h-5 w-5 text-yellow-400" />
      case 'js':
      case 'ts':
      case 'py':
      case 'json':
      case 'xml':
      case 'html':
      case 'css':
        return <Code className="h-5 w-5 text-green-400" />
      case 'txt':
      case 'md':
      case 'log':
        return <FileText className="h-5 w-5 text-gray-400" />
      default:
        return <FileIcon className="h-5 w-5 text-[#f3f3f398]" />
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const executeCommand = async () => {
    if (!consoleCommand.trim() || isExecutingCommand) return

    const command = consoleCommand.trim()
    setConsoleCommand('')
    setIsExecutingCommand(true)

    try {
      const response = await sshApi.executeCommand({
        serverId,
        command,
        cwd: currentPath !== '/' ? currentPath : undefined,
      })

      const newEntry = {
        command,
        output: response.data.stdout || '',
        error: response.data.stderr || '',
        timestamp: new Date(),
      }

      setConsoleHistory(prev => [...prev, newEntry])


      setTimeout(() => {
        if (consoleOutputRef.current) {
          consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight
        }
      }, 100)
    } catch (error: any) {
      const newEntry = {
        command,
        output: '',
        error: error.response?.data?.message || 'Ошибка выполнения команды',
        timestamp: new Date(),
      }
      setConsoleHistory(prev => [...prev, newEntry])
    } finally {
      setIsExecutingCommand(false)
      if (consoleInputRef.current) {
        consoleInputRef.current.focus()
      }
    }
  }

  const clearConsole = () => {
    setConsoleHistory([])
  }

  const handleConsoleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    }
  }

  useEffect(() => {
    if (showConsole && consoleInputRef.current) {
      consoleInputRef.current.focus()
    }
  }, [showConsole])

  const pathParts = currentPath.split('/').filter(Boolean)
  const breadcrumbs = pathParts.map((part: string, index: number) => {
    const path = '/' + pathParts.slice(0, index + 1).join('/')
    return { name: part, path }
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#151515] border border-[#ffffff10] rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[#ffffff10] bg-[#1a1a1a] rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#a476ff]/20 rounded-lg">
              <Folder className="h-6 w-6 text-[#a476ff]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#dfdfdf]">
                Файловый менеджер
              </h2>
              <p className="text-sm text-[#f3f3f398] mt-1">
                {serverName} • {currentPath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#f3f3f398] hover:text-[#dfdfdf] hover:bg-[#1f1f1f] rounded-lg p-1.5 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#ffffff10] bg-[#1a1a1a] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <button
              onClick={handleGoBack}
              disabled={currentPath === '/'}
              className="btn btn-secondary btn-sm disabled:opacity-50"
              aria-label="Назад"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={loadFiles}
              className="btn btn-secondary btn-sm"
              aria-label="Обновить"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <div
              className="flex items-center space-x-1 text-sm text-[#f3f3f398] overflow-x-auto flex-1 min-w-0 cursor-pointer px-2 py-1 rounded hover:bg-[#ffffff10] transition-colors"
              onClick={!isEditingPath ? handleStartEditPath : undefined}
              title={!isEditingPath ? "Кликните для ввода пути вручную" : undefined}
            >
              {isEditingPath ? (
                <input
                  ref={pathInputRef}
                  type="text"
                  value={editingPathValue}
                  onChange={(e) => setEditingPathValue(e.target.value)}
                  onKeyDown={handlePathInputKeyDown}
                  onBlur={handleSavePath}
                  onClick={(e) => e.stopPropagation()}
                  className="input text-sm font-mono flex-1 min-w-[200px]"
                  placeholder="/var/www"
                  autoFocus
                />
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNavigate('/')
                    }}
                    className="hover:text-[#dfdfdf] transition-colors px-2 py-1 rounded"
                  >
                    /
                  </button>
                  {breadcrumbs.map((crumb: { name: string; path: string }, index: number) => (
                    <div key={index} className="flex items-center space-x-1">
                      <span>/</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNavigate(crumb.path)
                        }}
                        className="hover:text-[#dfdfdf] transition-colors px-2 py-1 rounded"
                      >
                        {crumb.name}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConsole(!showConsole)}
              className={`btn btn-sm ${showConsole ? 'btn-primary' : 'btn-secondary'}`}
              title="Открыть консоль"
            >
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Консоль</span>
            </button>
            <button
              onClick={() => setShowCreateDir(true)}
              className="btn btn-secondary btn-sm"
              title="Создать директорию"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Создать папку</span>
            </button>
            <label className="btn btn-primary btn-sm cursor-pointer">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Загрузить</span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {showConsole && (
          <div className="border-t border-[#ffffff10] bg-[#0a0a0a] flex flex-col" style={{ height: '300px' }}>
            <div className="flex items-center justify-between p-3 border-b border-[#ffffff10] bg-[#1a1a1a]">
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-[#a476ff]" />
                <h3 className="text-sm font-medium text-[#dfdfdf]">Консоль</h3>
                <span className="text-xs text-[#f3f3f398]">({currentPath})</span>
              </div>
              <button
                onClick={clearConsole}
                className="text-[#f3f3f398] hover:text-[#dfdfdf] hover:bg-[#1f1f1f] rounded-lg p-1.5 transition-colors"
                title="Очистить консоль"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={consoleOutputRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-sm"
              style={{ maxHeight: 'calc(300px - 100px)' }}
            >
              {consoleHistory.length === 0 ? (
                <div className="text-[#f3f3f398] text-xs">
                  Введите команду для выполнения на сервере. Команды выполняются в текущей директории: {currentPath}
                </div>
              ) : (
                <div className="space-y-3">
                  {consoleHistory.map((entry, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[#a476ff]">$</span>
                        <span className="text-[#dfdfdf]">{entry.command}</span>
                        <span className="text-[#f3f3f398] text-xs ml-auto">
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      {entry.output && (
                        <div className="text-[#4ade80] ml-4 whitespace-pre-wrap break-words">
                          {entry.output}
                        </div>
                      )}
                      {entry.error && (
                        <div className="text-[#f87171] ml-4 whitespace-pre-wrap break-words">
                          {entry.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-[#ffffff10] bg-[#1a1a1a] p-3">
              <div className="flex items-center space-x-2">
                <span className="text-[#a476ff] font-mono">$</span>
                <input
                  ref={consoleInputRef}
                  type="text"
                  value={consoleCommand}
                  onChange={(e) => setConsoleCommand(e.target.value)}
                  onKeyPress={handleConsoleKeyPress}
                  placeholder="Введите команду..."
                  disabled={isExecutingCommand}
                  className="flex-1 bg-[#151515] border border-[#ffffff10] rounded-lg px-3 py-2 text-sm text-[#dfdfdf] font-mono focus:outline-none focus:border-[#a476ff] disabled:opacity-50"
                />
                <button
                  onClick={executeCommand}
                  disabled={!consoleCommand.trim() || isExecutingCommand}
                  className="btn btn-primary btn-sm disabled:opacity-50"
                >
                  {isExecutingCommand ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`flex-1 p-6 overflow-y-auto ${showConsole ? '' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="mx-auto h-12 w-12 text-[#f3f3f398] mb-4" />
              <h3 className="text-lg font-semibold text-[#dfdfdf] mb-2">Директория пуста</h3>
              <p className="text-sm text-[#f3f3f398]">
                Загрузите файлы или создайте новую директорию
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((item: FileItem) => (
                <div
                  key={item.path}
                  className="group flex items-center space-x-4 p-3 rounded-lg border border-[#ffffff10] bg-[#1a1a1a] hover:bg-[#1f1f1f] hover:border-[#ffffff20] transition-all"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(item)}
                  </div>

                  <div
                    className={`flex-1 min-w-0 ${item.type === 'directory' ? 'cursor-pointer' : ''}`}
                    onClick={() => item.type === 'directory' && handleNavigate(item.path)}
                    onDoubleClick={() => item.type === 'directory' && handleNavigate(item.path)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-[#dfdfdf] truncate">
                        {item.name}
                      </span>
                      {item.type === 'link' && (
                        <span className="text-xs text-[#f3f3f398]">→</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-[#f3f3f398]">
                      {item.type === 'file' && (
                        <span>{formatSize(item.size)}</span>
                      )}
                      <span>{item.owner}:{item.group}</span>
                      <span>{item.modified}</span>
                      <span className="font-mono text-[10px]">{item.permissions}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {item.type === 'file' && (
                      <button
                        onClick={() => handleDownload(item)}
                        className="p-2 text-[#f3f3f398] hover:text-[#dfdfdf] hover:bg-[#151515] rounded-lg transition-colors"
                        title="Скачать"
                        aria-label="Скачать файл"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={isDeleting === item.path}
                      className="p-2 text-[#f3f3f398] hover:text-red-400 hover:bg-[#151515] rounded-lg transition-colors disabled:opacity-50"
                      title="Удалить"
                      aria-label="Удалить"
                    >
                      {isDeleting === item.path ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isUploading && (
            <div className="fixed bottom-4 right-4 bg-[#1a1a1a] border border-[#ffffff10] rounded-lg p-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-5 w-5 animate-spin text-[#a476ff]" />
                <span className="text-sm text-[#dfdfdf]">Загрузка файла...</span>
              </div>
            </div>
          )}
        </div>

        {showCreateDir && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#151515] border border-[#ffffff10] rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-[#dfdfdf] mb-4">
                Создать директорию
              </h3>
              <input
                type="text"
                value={newDirName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDirName(e.target.value)}
                placeholder="Название директории"
                className="input w-full mb-4"
                autoFocus
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleCreateDirectory()
                  }
                }}
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowCreateDir(false)
                    setNewDirName('')
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateDirectory}
                  disabled={isCreatingDir || !newDirName.trim()}
                  className="btn btn-primary btn-sm"
                >
                  {isCreatingDir ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2">Создание...</span>
                    </>
                  ) : (
                    'Создать'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

