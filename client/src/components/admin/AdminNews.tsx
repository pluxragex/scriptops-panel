import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createPortal } from 'react-dom'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Calendar,
  User,
  Search,
  X,
  FileText,
  Image,
  Video,
  Settings,
  Save,
  Type,
  AlignLeft
} from 'lucide-react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import toast from 'react-hot-toast'
import { News } from '../../types'

const newsSchema = z.object({
  title: z.string().min(3, 'Заголовок должен содержать минимум 3 символа').max(200, 'Заголовок не может быть длиннее 200 символов'),
  content: z.string().min(10, 'Содержимое должно содержать минимум 10 символов'),
  excerpt: z.string().optional(),
  imageUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }, 'Некорректный URL изображения'),
  videoUrl: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }, 'Некорректный URL видео'),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  priority: z.number().min(0).max(100).default(50),
})

type NewsForm = z.infer<typeof newsSchema>


export default function AdminNews() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [currentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<NewsForm>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      isPublished: false,
      isFeatured: false,
      priority: 50,
    },
  })

  const watchedContent = watch('content')

  useEffect(() => {
    if (watchedContent && watchedContent.length > 50 && !editingNews) {
      const excerpt = watchedContent.substring(0, 200) + '...'
      setValue('excerpt', excerpt)
    }
  }, [watchedContent, setValue, editingNews])

  useEffect(() => {
    fetchNews()
  }, [currentPage])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getNews(currentPage, 10)
      setNews(response.data.news || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки новостей')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: NewsForm) => {
    try {
      const cleanedData = {
        ...data,
        imageUrl: data.imageUrl?.trim() || undefined,
        videoUrl: data.videoUrl?.trim() || undefined,
        excerpt: data.excerpt?.trim() || undefined,
      }

      if (editingNews) {
        await adminApi.updateNews(editingNews.id, cleanedData)
        toast.success('Новость обновлена успешно')
      } else {
        await adminApi.createNews(cleanedData)
        toast.success('Новость создана успешно')
      }

      setShowModal(false)
      setEditingNews(null)
      reset()
      fetchNews()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения новости')
    }
  }

  const handleEdit = (newsItem: News) => {
    setEditingNews(newsItem)
    setValue('title', newsItem.title)
    setValue('content', newsItem.content)
    setValue('excerpt', newsItem.excerpt || '')
    setValue('imageUrl', newsItem.imageUrl || '')
    setValue('videoUrl', newsItem.videoUrl || '')
    setValue('isPublished', newsItem.isPublished)
    setValue('isFeatured', newsItem.isFeatured)
    setValue('priority', newsItem.priority)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return

    try {
      await adminApi.deleteNews(id)
      toast.success('Новость удалена успешно')
      fetchNews()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка удаления новости')
    }
  }

  const handleView = (newsItem: News) => {
    const url = `/news/${newsItem.slug}`
    window.open(url, '_blank')
  }

  const togglePublished = async (newsItem: News) => {
    try {
      await adminApi.updateNews(newsItem.id, { isPublished: !newsItem.isPublished })
      toast.success(`Новость ${!newsItem.isPublished ? 'опубликована' : 'снята с публикации'}`)
      fetchNews()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка изменения статуса')
    }
  }

  const toggleFeatured = async (newsItem: News) => {
    try {
      await adminApi.updateNews(newsItem.id, { isFeatured: !newsItem.isFeatured })
      toast.success(`Новость ${!newsItem.isFeatured ? 'добавлена в рекомендуемые' : 'убрана из рекомендуемых'}`)
      fetchNews()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка изменения статуса')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const filteredNews = (news || []).filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      <div className="bg-[#151515] border border-[#ffffff10] shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
              Управление новостями
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f3f3f398]" />
                <input
                  type="text"
                  placeholder="Поиск новостей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <button
                onClick={() => {
                  setEditingNews(null)
                  reset()
                  setShowModal(true)
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus className="h-4 w-4" />
                Добавить новость
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ffffff10] rounded-lg overflow-hidden">
              <thead className="bg-[#1a1a1a] border-b border-[#ffffff10]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                  Заголовок
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                  Автор
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                  Просмотры
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[#f3f3f398] uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#151515] divide-y divide-[#ffffff10]">
              {filteredNews.map((newsItem) => (
                <tr key={newsItem.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-sm font-medium text-[#dfdfdf]">
                          {newsItem.title}
                        </div>
                        <div className="text-sm text-[#f3f3f398] truncate max-w-xs">
                          {newsItem.excerpt || newsItem.content.substring(0, 100) + '...'}
                        </div>
                      </div>
                      {newsItem.isFeatured && (
                        <Star className="h-4 w-4 text-[#a476ff] fill-current" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#f3f3f398]" />
                      <span className="text-sm text-[#dfdfdf]">
                        {newsItem.author.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePublished(newsItem)}
                        className={`btn btn-sm ${
                          newsItem.isPublished
                            ? 'btn-success'
                            : 'btn-secondary'
                        }`}
                        title={newsItem.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                      >
                        {newsItem.isPublished ? (
                          <>
                            <Eye className="h-4 w-4" />
                            Опубликована
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Черновик
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#dfdfdf]">
                    {newsItem._count.views}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-[#f3f3f398]">
                      <Calendar className="h-4 w-4" />
                      {formatDate(newsItem.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleView(newsItem)}
                        className="btn btn-secondary btn-sm"
                        title="Просмотр новости"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleFeatured(newsItem)}
                        className={`btn btn-sm ${
                          newsItem.isFeatured
                            ? 'btn-warning'
                            : 'btn-secondary'
                        }`}
                        title={newsItem.isFeatured ? 'Убрать из рекомендуемых' : 'Добавить в рекомендуемые'}
                      >
                        {newsItem.isFeatured ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(newsItem)}
                        className="btn btn-primary btn-sm"
                        title="Редактировать новость"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(newsItem.id)}
                        className="btn btn-danger btn-sm"
                        title="Удалить новость"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>

    {showModal && createPortal(
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#151515] border border-[#ffffff10] rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-[#ffffff10] bg-[#1a1a1a] rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#a476ff]/20 rounded-lg">
                <FileText className="h-6 w-6 text-[#a476ff]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#dfdfdf]">
                  {editingNews ? 'Редактировать новость' : 'Создать новость'}
                </h2>
                <p className="text-sm text-[#f3f3f398] mt-0.5">
                  {editingNews ? 'Внесите изменения в новость' : 'Заполните форму для создания новой новости'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowModal(false)
                setEditingNews(null)
                reset()
              }}
              className="text-[#f3f3f398] hover:text-[#dfdfdf] hover:bg-[#1f1f1f] rounded-lg p-1.5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} id="news-form" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-[#ffffff10]">
                  <Type className="h-4 w-4 text-[#a476ff]" />
                  <h3 className="text-sm font-semibold text-[#dfdfdf] uppercase tracking-wide">Основная информация</h3>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-[#dfdfdf] mb-2">
                    <Type className="h-4 w-4 text-[#a476ff]" />
                    <span>Заголовок <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className={`input ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Введите заголовок новости"
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center space-x-1">
                      <span>•</span>
                      <span>{errors.title.message}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-[#dfdfdf] mb-2">
                    <AlignLeft className="h-4 w-4 text-[#a476ff]" />
                    <span>Краткое описание</span>
                  </label>
                  <textarea
                    {...register('excerpt')}
                    rows={3}
                    className={`input ${errors.excerpt ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Краткое описание новости (автоматически генерируется из содержимого)"
                  />
                  {errors.excerpt && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center space-x-1">
                      <span>•</span>
                      <span>{errors.excerpt.message}</span>
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-[#f3f3f398]">
                    Будет автоматически сгенерировано из содержимого, если оставить пустым
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-[#dfdfdf] mb-2">
                    <FileText className="h-4 w-4 text-[#a476ff]" />
                    <span>Содержимое <span className="text-red-500">*</span></span>
                  </label>
                  <textarea
                    {...register('content')}
                    rows={8}
                    className={`input ${errors.content ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Введите содержимое новости"
                  />
                  {errors.content && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center space-x-1">
                      <span>•</span>
                      <span>{errors.content.message}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-[#ffffff10]">
                  <Image className="h-4 w-4 text-[#a476ff]" />
                  <h3 className="text-sm font-semibold text-[#dfdfdf] uppercase tracking-wide">Медиа контент</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#1a1a1a] border border-[#ffffff10] rounded-lg p-4">
                    <label className="flex items-center space-x-2 text-sm font-medium text-[#dfdfdf] mb-2">
                      <Image className="h-4 w-4 text-[#a476ff]" />
                      <span>URL изображения</span>
                    </label>
                    <input
                      {...register('imageUrl')}
                      type="url"
                      className={`input ${errors.imageUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="https://example.com/image.jpg"
                    />
                    {errors.imageUrl && (
                      <p className="mt-1.5 text-sm text-red-400 flex items-center space-x-1">
                        <span>•</span>
                        <span>{errors.imageUrl.message}</span>
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[#f3f3f398] flex items-center space-x-1">
                      <span>Поддерживаются:</span>
                      <span className="text-[#a476ff]">JPG, PNG, GIF, WebP</span>
                    </p>
                  </div>

                  <div className="bg-[#1a1a1a] border border-[#ffffff10] rounded-lg p-4">
                    <label className="flex items-center space-x-2 text-sm font-medium text-[#dfdfdf] mb-2">
                      <Video className="h-4 w-4 text-[#a476ff]" />
                      <span>URL видео</span>
                    </label>
                    <input
                      {...register('videoUrl')}
                      type="url"
                      className={`input ${errors.videoUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="https://youtube.com/watch?v=example"
                    />
                    {errors.videoUrl && (
                      <p className="mt-1.5 text-sm text-red-400 flex items-center space-x-1">
                        <span>•</span>
                        <span>{errors.videoUrl.message}</span>
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[#f3f3f398] flex items-center space-x-1">
                      <span>Поддерживаются:</span>
                      <span className="text-[#a476ff]">YouTube, Vimeo, прямые ссылки</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-[#ffffff10]">
                  <Settings className="h-4 w-4 text-[#a476ff]" />
                  <h3 className="text-sm font-semibold text-[#dfdfdf] uppercase tracking-wide">Настройки публикации</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a1a] border border-[#ffffff10] rounded-lg p-4">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          {...register('isPublished')}
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a476ff] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a476ff] border border-[#ffffff10]"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4 text-[#a476ff]" />
                          <span className="text-sm font-medium text-[#dfdfdf] group-hover:text-[#a476ff] transition-colors">
                            Опубликовать
                          </span>
                        </div>
                        <p className="text-xs text-[#f3f3f398] mt-1">
                          Новость будет видна всем пользователям
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="bg-[#1a1a1a] border border-[#ffffff10] rounded-lg p-4">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          {...register('isFeatured')}
                          type="checkbox"
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#a476ff] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#a476ff] border border-[#ffffff10]"></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-[#a476ff]" />
                          <span className="text-sm font-medium text-[#dfdfdf] group-hover:text-[#a476ff] transition-colors">
                            Рекомендуемая
                          </span>
                        </div>
                        <p className="text-xs text-[#f3f3f398] mt-1">
                          Показывать в рекомендуемых новостях
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="bg-[#1a1a1a] border border-[#ffffff10] rounded-lg p-4">
                    <label className="flex items-center space-x-2 text-sm font-medium text-[#dfdfdf] mb-2">
                      <Settings className="h-4 w-4 text-[#a476ff]" />
                      <span>Приоритет</span>
                    </label>
                    <input
                      {...register('priority', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      max="100"
                      className={`input ${errors.priority ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="50"
                    />
                    {errors.priority && (
                      <p className="mt-1.5 text-sm text-red-400 flex items-center space-x-1">
                        <span>•</span>
                        <span>{errors.priority.message}</span>
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[#f3f3f398]">
                      От 0 до 100 (чем выше, тем важнее)
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-[#ffffff10] bg-[#1a1a1a] rounded-b-xl">
            <button
              type="button"
              onClick={() => {
                setShowModal(false)
                setEditingNews(null)
                reset()
              }}
              className="btn btn-secondary btn-sm"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              <span className="ml-2">Отмена</span>
            </button>
            <button
              type="submit"
              form="news-form"
              disabled={isSubmitting}
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="ml-2">{editingNews ? 'Обновить' : 'Создать'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  )
}
