import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import {
  Home,
  Bot,
  User,
  Shield,
  Menu,
  X,
  ExternalLink,
  Newspaper,
  Languages,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../lib/utils'
import { useTranslation } from '../lib/i18n'

interface SidebarContextType {
  isCollapsed: boolean
}

const SidebarContext = createContext<SidebarContextType>({ isCollapsed: false })

export const useSidebar = () => useContext(SidebarContext)

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { t, language, changeLanguage } = useTranslation()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleLogout = async () => {
    setIsProfileDropdownOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const handleProfile = () => {
    navigate('/profile')
    setIsProfileDropdownOpen(false)
    setIsMobileMenuOpen(false)
  }

  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.scripts'), href: '/scripts', icon: Bot },
    { name: t('nav.news'), href: '/news', icon: Newspaper },
  ]

  const adminNavigation = [
    { name: t('nav.admin'), href: '/admin', icon: Shield },
  ]

  const NavigationContent = () => (
    <>
      <div className={cn(
        "flex items-center flex-shrink-0 border-b border-[#ffffff10] transition-all duration-300",
        isCollapsed ? "px-4 py-6 justify-center" : "px-6 py-6"
      )}>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-[#a476ff] rounded-xl blur-lg opacity-20"></div>
            <div className="relative bg-[#a476ff]/10 p-2 rounded-xl border border-[#a476ff]/20">
              <Bot className="h-6 w-6 text-[#a476ff]" />
            </div>
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-xl font-bold text-[#dfdfdf] tracking-tight">
                222prod
              </span>
              <p className="text-xs text-[#f3f3f398] mt-0.5">production</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-b border-[#ffffff10] hidden lg:block">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#202020] border border-[#ffffff10] transition-all duration-200 group"
          title={isCollapsed ? 'Развернуть' : 'Свернуть'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-[#a476ff]" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-[#a476ff]" />
          )}
        </button>
      </div>

      <nav className={cn("mt-6 flex-1 space-y-2 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        {navigation.map((item, index) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center rounded-xl transition-all duration-200',
                isCollapsed
                  ? 'justify-center px-3 py-3'
                  : 'px-4 py-3',
                isActive
                  ? 'bg-[#a476ff]/10 text-[#a476ff] shadow-sm'
                  : 'text-[#f3f3f398] hover:bg-[#1a1a1a] hover:text-[#dfdfdf]',
                index === navigation.length - 1 ? 'mb-6' : ''
              )
            }
            title={isCollapsed ? item.name : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && !isCollapsed && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#a476ff] rounded-r-full"></div>
                )}
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    !isCollapsed && 'mr-3',
                    isActive
                      ? 'text-[#a476ff]'
                      : 'text-[#f3f3f398] group-hover:text-[#dfdfdf]'
                  )}
                />
                {!isCollapsed && (
                  <span className="text-sm font-medium relative z-10">{item.name}</span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            {!isCollapsed && (
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#ffffff10]"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs font-medium text-[#f3f3f398] bg-[#151515]">
                    {t('nav.administration')}
                  </span>
                </div>
              </div>
            )}
            {adminNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center rounded-xl transition-all duration-200',
                    isCollapsed
                      ? 'justify-center px-3 py-3'
                      : 'px-4 py-3',
                    isActive
                      ? 'bg-[#a476ff]/10 text-[#a476ff] shadow-sm'
                      : 'text-[#f3f3f398] hover:bg-[#1a1a1a] hover:text-[#dfdfdf]'
                  )
                }
                title={isCollapsed ? item.name : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !isCollapsed && (
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#a476ff] rounded-r-full"></div>
                    )}
                    <item.icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition-colors',
                        !isCollapsed && 'mr-3',
                        isActive
                          ? 'text-[#a476ff]'
                          : 'text-[#f3f3f398] group-hover:text-[#dfdfdf]'
                      )}
                    />
                    {!isCollapsed && (
                      <span className="text-sm font-medium relative z-10">{item.name}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {!isCollapsed && (
        <div className="px-4 py-4 border-t border-[#ffffff10]">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] rounded-xl border border-[#ffffff10] p-4 space-y-3">
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-[#151515] hover:bg-[#1a1a1a] border border-[#ffffff10] transition-all duration-200 group"
              >
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-[#a476ff] rounded-full blur-md opacity-30"></div>
                  <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-[#a476ff] to-[#8c5eff] flex items-center justify-center shadow-lg">
                    <User className="h-5 w-5 text-[#101010]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-[#dfdfdf] truncate">{user?.username}</p>
                  <p className="text-xs text-[#f3f3f398] truncate">{user?.email}</p>
                </div>
                {isProfileDropdownOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#f3f3f398] flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#f3f3f398] flex-shrink-0" />
                )}
              </button>

            {isProfileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-lg shadow-xl border border-[#ffffff10] overflow-hidden z-50">
                  <button
                    onClick={handleProfile}
                    className="w-full flex items-center px-4 py-3 text-sm text-[#dfdfdf] hover:bg-[#151515] transition-colors duration-150"
                  >
                    <User className="h-4 w-4 mr-3 text-[#a476ff]" />
                    {t('header.profile')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm text-[#dfdfdf] hover:bg-[#151515] transition-colors duration-150 border-t border-[#ffffff10]"
                  >
                    <LogOut className="h-4 w-4 mr-3 text-red-400" />
                    {t('header.logout')}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#151515] hover:bg-[#1a1a1a] border border-[#ffffff10] transition-all duration-200"
            >
              <div className="flex items-center space-x-2">
                <Languages className="h-4 w-4 text-[#a476ff]" />
                <span className="text-sm font-medium text-[#dfdfdf]">{t('header.language')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-[#a476ff] uppercase">{language}</span>
                {isLanguageDropdownOpen ? (
                  <ChevronUp className="h-4 w-4 text-[#f3f3f398]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#f3f3f398]" />
                )}
              </div>
            </button>

            {isLanguageDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLanguageDropdownOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-lg shadow-xl border border-[#ffffff10] overflow-hidden z-50">
                  <button
                    onClick={() => {
                      changeLanguage('ru')
                      setIsLanguageDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-center px-4 py-2.5 text-sm transition-colors duration-150 ${
                      language === 'ru'
                        ? 'text-[#a476ff] bg-[#151515] font-semibold'
                        : 'text-[#dfdfdf] hover:bg-[#151515]'
                    }`}
                  >
                    Русский
                  </button>
                  <button
                    onClick={() => {
                      changeLanguage('en')
                      setIsLanguageDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-center px-4 py-2.5 text-sm transition-colors duration-150 border-t border-[#ffffff10] ${
                      language === 'en'
                        ? 'text-[#a476ff] bg-[#151515] font-semibold'
                        : 'text-[#dfdfdf] hover:bg-[#151515]'
                    }`}
                  >
                    English
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      <div className={cn("pb-3 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <a
          href="https://t.me/dev222prod"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group relative flex items-center rounded-xl transition-all duration-200 bg-[#0088cc]/5 hover:bg-[#0088cc]/10 border border-[#0088cc]/20 hover:border-[#0088cc]/30 text-[#f3f3f398] hover:text-[#dfdfdf]",
            isCollapsed ? "justify-center px-3 py-3" : "px-4 py-3"
          )}
          title={isCollapsed ? 'Telegram' : undefined}
        >
          <svg
            className={cn("h-5 w-5 flex-shrink-0 transition-colors text-[#0088cc]", !isCollapsed && "mr-3")}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
          </svg>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-sm font-medium">Telegram</span>
              <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </a>
      </div>

      <div className={cn("pb-6 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
        <a
          href="https://discord.gg/jnbTEdpjeZ"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group relative flex items-center rounded-xl transition-all duration-200 bg-[#5865F2]/5 hover:bg-[#5865F2]/10 border border-[#5865F2]/20 hover:border-[#5865F2]/30 text-[#f3f3f398] hover:text-[#dfdfdf]",
            isCollapsed ? "justify-center px-3 py-3" : "px-4 py-3"
          )}
          title={isCollapsed ? 'Discord' : undefined}
        >
          <svg
            className={cn("h-5 w-5 flex-shrink-0 transition-colors text-[#5865F2]", !isCollapsed && "mr-3")}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-sm font-medium">Discord</span>
              <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </a>
      </div>
    </>
  )

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-10 w-10 rounded-xl bg-[#151515] backdrop-blur-xl flex items-center justify-center shadow-lg border border-[#ffffff10] hover:bg-[#1a1a1a] transition-all duration-200"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5 text-[#a476ff]" />
          ) : (
            <Menu className="h-5 w-5 text-[#a476ff]" />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#151515] border-r border-[#ffffff10] backdrop-blur-xl transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full overflow-y-auto">
          <NavigationContent />
        </div>
      </div>

      <SidebarContext.Provider value={{ isCollapsed }}>
        <div className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}>
          <div className="flex flex-col flex-grow bg-[#151515] border-r border-[#ffffff10] backdrop-blur-xl overflow-y-auto">
            <NavigationContent />
          </div>
        </div>
      </SidebarContext.Provider>
    </>
  )
}
