import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import {
  Users,
  Bot,
  Server,
  BarChart3,
  Key,
  FileText,
  Activity,
  Newspaper,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn } from '../lib/utils'
import { adminApi } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { useTranslation } from '../lib/i18n'

import AdminStats from '../components/admin/AdminStats'
import AdminUsers from '../components/admin/AdminUsers'
import AdminScripts from '../components/admin/AdminScripts'
import AdminServers from '../components/admin/AdminServers'
import AdminServerKeys from '../components/admin/AdminServerKeys'
import AdminAuditLogs from '../components/admin/AdminAuditLogs'
import AdminNews from '../components/admin/AdminNews'
import AdminScheduler from '../components/admin/AdminScheduler'
import ServerStats from '../components/admin/ServerStats'

export default function AdminPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const navScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const adminNavigation = [
    { name: t('admin.stats'), href: '/admin', icon: BarChart3 },
    { name: t('admin.serverMonitoring'), href: '/admin/server-stats', icon: Activity },
    { name: t('admin.users'), href: '/admin/users', icon: Users },
    { name: t('admin.scripts'), href: '/admin/scripts', icon: Bot },
    { name: t('admin.news'), href: '/admin/news', icon: Newspaper },
    { name: t('admin.scheduler'), href: '/admin/scheduler', icon: Clock },
    { name: t('admin.servers'), href: '/admin/servers', icon: Server },
    { name: t('admin.sshKeys'), href: '/admin/server-keys', icon: Key },
    { name: t('admin.auditLogs'), href: '/admin/audit-logs', icon: FileText },
  ]

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await adminApi.checkAccess()
        setHasAccess(response.data.hasAccess)
      } catch (error) {
        console.error('Admin access check failed:', error)
        setHasAccess(false)
      } finally {
        setIsCheckingAccess(false)
      }
    }

    checkAccess()
  }, [])

  useEffect(() => {

    const timer = setTimeout(() => {
      checkNavScroll()
    }, 100)

    const handleResize = () => {
      setTimeout(checkNavScroll, 100)
    }

    const handleScroll = () => {
      checkNavScroll()
    }

    window.addEventListener('resize', handleResize)
    const navElement = navScrollRef.current
    if (navElement) {
      navElement.addEventListener('scroll', handleScroll)

      navElement.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault()
          navElement.scrollLeft += e.deltaY
        }
      }, { passive: false })
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      if (navElement) {
        navElement.removeEventListener('scroll', handleScroll)
      }
    }
  }, [location.pathname])

  const checkNavScroll = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const { scrollWidth, clientWidth } = navScrollRef.current
      if (direction === 'left') {

        navScrollRef.current.scrollTo({
          left: 0,
          behavior: 'smooth',
        })
      } else {

        navScrollRef.current.scrollTo({
          left: scrollWidth - clientWidth,
          behavior: 'smooth',
        })
      }
      setTimeout(checkNavScroll, 300)
    }
  }

  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-[#dfdfdf] sm:text-3xl sm:truncate">
            {t('admin.title')}
          </h2>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('admin.manage')}
          </p>
        </div>

        <div className="bg-[#151515] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <div className="hidden md:block relative">
              <button
                onClick={() => scrollNav('left')}
                disabled={!canScrollLeft}
                className={`absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-12 group transition-all duration-300 ${
                  canScrollLeft
                    ? 'opacity-100 cursor-pointer'
                    : 'opacity-0 cursor-default pointer-events-none'
                }`}
                aria-label="Прокрутить влево"
              >
                <div className="relative w-full h-full flex items-center justify-start pl-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#151515] via-[#151515]/80 to-transparent pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a1a1a]/50 border border-[#ffffff10] backdrop-blur-sm transition-all duration-300 group-hover:bg-[#a476ff]/20 group-hover:border-[#a476ff]/40 group-hover:shadow-lg group-hover:shadow-[#a476ff]/20 group-active:scale-95">
                    <ChevronLeft className="h-4 w-4 text-[#f3f3f398] transition-all duration-300 group-hover:text-[#a476ff] group-hover:scale-110" />
                  </div>
                </div>
              </button>
              <button
                onClick={() => scrollNav('right')}
                disabled={!canScrollRight}
                className={`absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-12 group transition-all duration-300 ${
                  canScrollRight
                    ? 'opacity-100 cursor-pointer'
                    : 'opacity-0 cursor-default pointer-events-none'
                }`}
                aria-label="Прокрутить вправо"
              >
                <div className="relative w-full h-full flex items-center justify-end pr-2">
                  <div className="absolute inset-0 bg-gradient-to-l from-[#151515] via-[#151515]/80 to-transparent pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg bg-[#1a1a1a]/50 border border-[#ffffff10] backdrop-blur-sm transition-all duration-300 group-hover:bg-[#a476ff]/20 group-hover:border-[#a476ff]/40 group-hover:shadow-lg group-hover:shadow-[#a476ff]/20 group-active:scale-95">
                    <ChevronRight className="h-4 w-4 text-[#f3f3f398] transition-all duration-300 group-hover:text-[#a476ff] group-hover:scale-110" />
                  </div>
                </div>
              </button>
              <nav
                ref={navScrollRef}
                className="flex space-x-8 overflow-x-auto scrollbar-hide scroll-smooth cursor-grab active:cursor-grabbing select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', userSelect: 'none' }}
                aria-label="Tabs"
                onMouseDown={(e) => {
                  const nav = navScrollRef.current
                  if (!nav) return
                  const startX = e.pageX - nav.offsetLeft
                  const scrollLeft = nav.scrollLeft
                  let isDown = true

                  const onMouseMove = (e: MouseEvent) => {
                    if (!isDown) return
                    e.preventDefault()
                    const x = e.pageX - nav.offsetLeft
                    const walk = (x - startX) * 2
                    nav.scrollLeft = scrollLeft - walk
                  }

                  const onMouseUp = () => {
                    isDown = false
                    document.removeEventListener('mousemove', onMouseMove)
                    document.removeEventListener('mouseup', onMouseUp)
                  }

                  document.addEventListener('mousemove', onMouseMove)
                  document.addEventListener('mouseup', onMouseUp)
                }}
              >
                {adminNavigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0',
                        isActive
                          ? 'border-[#a476ff] text-[#a476ff]'
                          : 'border-transparent text-[#f3f3f398] hover:text-[#dfdfdf] hover:border-[#ffffff20]'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-2 h-5 w-5',
                          isActive ? 'text-[#a476ff]' : 'text-[#f3f3f398] group-hover:text-[#dfdfdf]'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <nav className="md:hidden space-y-2" aria-label="Tabs">
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'group flex items-center py-3 px-3 rounded-lg font-medium text-sm transition-colors',
                      isActive
                        ? 'bg-[#a476ff20] border border-[#a476ff40] text-[#a476ff]'
                        : 'text-[#dfdfdf] hover:bg-[#ffffff10] border border-transparent'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5',
                        isActive ? 'text-[#a476ff]' : 'text-[#f3f3f398] group-hover:text-[#dfdfdf]'
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        <Routes>
          <Route index element={<AdminStats />} />
          <Route path="server-stats" element={<ServerStats />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="scripts" element={<AdminScripts />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="scheduler" element={<AdminScheduler />} />
          <Route path="servers" element={<AdminServers />} />
          <Route path="server-keys" element={<AdminServerKeys />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Routes>
      </div>
    </>
  )
}
