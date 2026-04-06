import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import {
  Calendar,
  User,
  Eye,
  Star,
  ArrowLeft,
  Clock,
  Share2
} from 'lucide-react'
import { newsApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { News } from '../types'
import { useTranslation } from '../lib/i18n'

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const [news, setNews] = useState<News | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [viewStats, setViewStats] = useState<{ totalViews: number; uniqueViews: number; recentViews: number } | null>(null)

  useEffect(() => {
    if (slug) {
      fetchNews(slug)
    }
  }, [slug])

  const fetchNews = async (newsSlug: string) => {
    try {
      setLoading(true)
      const response = await newsApi.getNewsById(newsSlug)
      setNews(response.data || null)

      try {
        const statsResponse = await newsApi.getNewsStats(response.data.id)
        setViewStats(statsResponse.data)
      } catch (statsError) {
        console.warn('Не удалось загрузить статистику просмотров:', statsError)
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setNotFound(true)
      } else {
        toast.error(error.response?.data?.message || 'Ошибка загрузки новости')
      }
    } finally {
      setLoading(false)
    }
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

  const handleShare = async () => {
    if (!news) return

    const url = window.location.href
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (isMobile && navigator.share && navigator.canShare && navigator.canShare({ url })) {
      try {
        await navigator.share({
          title: news.title,
          text: news.excerpt || news.content.substring(0, 100) + '...',
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

  if (notFound) {
    return <Navigate to="/news" replace />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!news) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#dfdfdf] mb-4">
            {t('news.notFoundTitle')}
          </h1>
          <Link
            to="/news"
            className="inline-flex items-center gap-2 text-[#a476ff] hover:text-[#8c5eff] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('news.backToList')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-4">
        <Link
          to="/news"
              className="btn btn-secondary btn-sm"
        >
              <ArrowLeft className="h-4 w-4" />
        </Link>
            <div className="flex-1 min-w-0 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold leading-7 text-[#dfdfdf] sm:text-3xl sm:truncate">
                  {news.title}
                </h2>
                <p className="mt-1 text-sm text-[#f3f3f398]">
                  {news.excerpt || t('news.title')}
                </p>
              </div>
              {news.isFeatured && (
                <div className="bg-[#8c5eff] border border-[#a476ff] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 flex-shrink-0 mt-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {t('news.featured')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
              <User className="h-4 w-4 text-[#a476ff]" />
              <span className="text-[#dfdfdf]">{news.author.username}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
              <Calendar className="h-4 w-4 text-[#a476ff]" />
              <span className="text-[#dfdfdf]">{formatDate(news.publishedAt || news.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
              <Clock className="h-4 w-4 text-[#a476ff]" />
              <span className="text-[#dfdfdf]">{formatTime(news.publishedAt || news.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
              <Eye className="h-4 w-4 text-[#a476ff]" />
              <span className="text-[#dfdfdf]">
                {viewStats ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{viewStats.totalViews} {t('news.views')}</span>
                    <span className="text-xs text-[#f3f3f398]">
                      ({viewStats.uniqueViews} {t('news.uniqueViews')})
                    </span>
                    {viewStats.recentViews > 0 && (
                      <span className="text-xs text-[#a476ff] font-medium">
                        +{viewStats.recentViews} {t('news.recent24h')}
                      </span>
                    )}
                  </div>
                ) : (
                  `${news._count.views} ${t('news.views')}`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {news.imageUrl && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl overflow-hidden">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-64 md:h-96 object-cover"
          />
        </div>
      )}

      {news.videoUrl && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl overflow-hidden">
          <div className="relative w-full h-64 md:h-96 bg-[#0a0a0a]">
            {(() => {

              let embedUrl = news.videoUrl


              if (news.videoUrl.includes('youtube.com/watch')) {
                const videoId = news.videoUrl.split('v=')[1]?.split('&')[0]
                if (videoId) {
                  embedUrl = `https://www.youtube.com/embed/${videoId}`
                }
              }

              else if (news.videoUrl.includes('youtu.be/')) {
                const videoId = news.videoUrl.split('youtu.be/')[1]?.split('?')[0]
                if (videoId) {
                  embedUrl = `https://www.youtube.com/embed/${videoId}`
                }
              }

              else if (news.videoUrl.includes('vimeo.com/')) {
                const videoId = news.videoUrl.split('vimeo.com/')[1]?.split('?')[0]
                if (videoId) {
                  embedUrl = `https://player.vimeo.com/video/${videoId}`
                }
              }

              return (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title={news.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              )
            })()}
          </div>
        </div>
      )}

      {news.excerpt && (
        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <p className="text-lg md:text-xl text-[#dfdfdf] leading-relaxed font-light">
              {news.excerpt}
            </p>
          </div>
        </div>
      )}

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <article className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-[#dfdfdf] prose-p:text-[#dfdfdf] prose-strong:text-[#dfdfdf] prose-a:text-[#a476ff] prose-a:hover:text-[#8c5eff]">
            <div
              className="text-[#dfdfdf] leading-relaxed whitespace-pre-wrap text-base md:text-lg"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </article>
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleShare}
                className="btn btn-secondary btn-sm flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                {t('news.share')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <h3 className="text-lg font-semibold text-[#dfdfdf] mb-6">
            {t('news.aboutAuthor')}
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-[#a476ff] rounded-full blur-md opacity-30"></div>
              <div className="relative w-14 h-14 bg-gradient-to-br from-[#a476ff] to-[#8c5eff] rounded-full flex items-center justify-center text-[#101010] font-bold text-lg shadow-lg">
                {news.author.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-[#dfdfdf] text-lg">
                {news.author.username}
              </h4>
              <p className="text-sm text-[#f3f3f398] mt-1">
                {t('news.author')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
