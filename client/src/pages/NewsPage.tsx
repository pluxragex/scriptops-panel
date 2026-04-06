import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  User,
  Eye,
  Star,
  ChevronRight,
  Search,
  Clock,
  Share2
} from 'lucide-react'
import { newsApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { useTranslation } from '../lib/i18n'

interface News {
  id: string
  title: string
  content: string
  excerpt?: string
  imageUrl?: string
  videoUrl?: string
  slug: string
  isPublished: boolean
  isFeatured: boolean
  priority: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
  author: {
    id: string
    username: string
  }
  _count: {
    views: number
  }
}

export default function NewsPage() {
  const { t } = useTranslation()
  const [news, setNews] = useState<News[]>([])
  const [featuredNews, setFeaturedNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFeatured, setShowFeatured] = useState(false)

  useEffect(() => {
    fetchNews()
    fetchFeaturedNews()
  }, [])

  useEffect(() => {

    fetchNews()

  }, [showFeatured])

  const fetchNews = async () => {
    try {
      setLoading(true)
      const response = await newsApi.getNews({
        published: true,
        limit: 20,
        search: searchTerm || undefined,

        featured: showFeatured ? true : undefined
      })
      setNews(response.data.news || [])
    } catch (error: any) {
      console.error('Ошибка при загрузке новостей:', error)
      toast.error(error.response?.data?.message || error.message || 'Ошибка загрузки новостей')
    } finally {
      setLoading(false)
    }
  }

  const fetchFeaturedNews = async () => {
    try {
      const response = await newsApi.getFeaturedNews(5)
      setFeaturedNews(response.data || [])
    } catch (error: any) {
      console.error('Ошибка загрузки рекомендуемых новостей:', error)
    }
  }

  const handleSearch = () => {
    fetchNews()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleShare = async (newsItem: News) => {
    const url = `${window.location.origin}/news/${newsItem.slug}`
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ url })) {
      try {
        await navigator.share({
          title: newsItem.title,
          text: newsItem.excerpt || newsItem.content.substring(0, 100) + '...',
          url: url
        })
        return
      } catch (error) {

        if (error instanceof Error && error.name === 'AbortError') {
          return
        }

      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
        toast.success(t('news.linkCopied'))
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (successful) {
          toast.success(t('news.linkCopied'))
        } else {
          toast.error(t('news.copyFailed'))
        }
      }
    } catch (error) {
      toast.error(t('news.copyFailed'))
    }
  }

  const NewsCard = ({ newsItem, featured = false }: { newsItem: News; featured?: boolean }) => (
    <article className={`bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl overflow-hidden hover:shadow-xl hover:border-[#ffffff20] transition-all duration-200 ${
      featured ? 'ring-2 ring-[#a476ff] ring-opacity-50' : ''
    }`}>
      {newsItem.imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={newsItem.imageUrl}
            alt={newsItem.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
          {newsItem.isFeatured && (
            <div className="absolute top-3 left-3 bg-[#8c5eff] border border-[#a476ff] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
              <Star className="h-3 w-3 fill-current" />
              {t('news.featured')}
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
            <User className="h-3.5 w-3.5 text-[#a476ff]" />
            <span className="text-[#dfdfdf]">{newsItem.author.username}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
            <Calendar className="h-3.5 w-3.5 text-[#a476ff]" />
            <span className="text-[#dfdfdf]">{formatDate(newsItem.publishedAt || newsItem.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
            <Clock className="h-3.5 w-3.5 text-[#a476ff]" />
            <span className="text-[#dfdfdf]">{formatTime(newsItem.publishedAt || newsItem.createdAt)}</span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-[#dfdfdf] mb-3 line-clamp-2">
          {newsItem.title}
        </h2>

        <p className="text-[#f3f3f398] mb-4 line-clamp-3">
          {newsItem.excerpt || truncateText(newsItem.content)}
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#ffffff10] text-[#f3f3f398] font-medium text-sm">
              <Eye className="h-4 w-4 text-[#a476ff]" />
              <span className="text-[#dfdfdf]">{newsItem._count.views}</span>
            </div>

            <button
              onClick={() => handleShare(newsItem)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#ffffff10] text-[#f3f3f398] hover:text-[#dfdfdf] hover:border-[#ffffff20] font-medium text-sm transition-colors"
              title={t('news.share')}
            >
              <Share2 className="h-4 w-4" />
              {t('news.share')}
            </button>

            <Link
              to={`/news/${newsItem.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a476ff20] border border-[#a476ff40] text-[#a476ff] hover:bg-[#a476ff30] font-medium text-sm transition-colors"
            >
              {t('news.read')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )

  if (loading) {
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
            {t('news.title')}
          </h2>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('news.description')}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#f3f3f398]" />
              <input
                type="text"
                placeholder={t('news.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="btn btn-primary btn-sm flex items-center space-x-2 h-10"
            >
              <Search className="h-4 w-4" />
              <span>{t('news.search')}</span>
            </button>

            <button
              onClick={() => setShowFeatured(!showFeatured)}
              className={`btn btn-sm flex items-center space-x-2 h-10 ${
                showFeatured
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
            >
              <Star className="h-4 w-4" />
              <span>{t('news.featured')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {showFeatured && (featuredNews || []).length > 0 && (
            <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
              <div className="px-6 py-6 sm:p-8">
                <h2 className="text-2xl font-bold text-[#dfdfdf] mb-6 flex items-center gap-2">
                  <Star className="h-6 w-6 text-[#a476ff] fill-current" />
                  {t('news.featuredNews')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(featuredNews || []).map((newsItem) => (
                    <NewsCard key={newsItem.id} newsItem={newsItem} featured />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
            <div className="px-6 py-6 sm:p-8">
              <h2 className="text-2xl font-bold text-[#dfdfdf] mb-6">
                {showFeatured ? t('news.otherNews') : t('news.latestNews')}
              </h2>

              {(news || []).length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-[#f3f3f398] mb-4">
                    <Search className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-[#dfdfdf] mb-2">
                    {t('news.notFound')}
                  </h3>
                  <p className="text-[#f3f3f398]">
                    {t('news.tryChangeQuery')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(news || []).map((newsItem) => (
                    <NewsCard key={newsItem.id} newsItem={newsItem} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
