import { LogOut, User, Languages } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../lib/i18n'

export default function Header() {
  const { user, logout } = useAuthStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const { t, language, changeLanguage } = useTranslation()

  const handleLogout = async () => {
    setIsDropdownOpen(false)
    await logout()

    navigate('/login', { replace: true })
  }

  const handleProfile = () => {
    navigate('/profile')
    setIsDropdownOpen(false)
  }

  return (
    <header className="bg-[#151515] shadow-sm border-b border-[#ffffff10] transition-colors duration-200">
      <div className="mx-auto max-w-[853px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center relative">

          <div className="absolute left-1/2 transform -translate-x-1/2 md:hidden">
            <h1 className="text-xl font-semibold text-[#dfdfdf]">
              222production
            </h1>
          </div>

          <div className="flex items-center space-x-4 ml-auto relative z-10">
            <div className="relative">
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isLangDropdownOpen
                    ? 'bg-[#1a1a1a] border border-[#ffffff10]'
                    : 'hover:bg-[#1a1a1a] border border-transparent'
                } focus:outline-none focus:border-[#a476ff]/50`}
              >
                <Languages className="h-4 w-4 text-[#a476ff]" />
                <span className="hidden md:block text-[#dfdfdf] font-medium uppercase">
                  {language}
                </span>
              </button>

              {isLangDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsLangDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-32 bg-[#1a1a1a] rounded-lg shadow-xl py-1 z-50 border border-[#ffffff10]">
                    <button
                      onClick={() => {
                        changeLanguage('ru')
                        setIsLangDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-center px-4 py-2 text-sm transition-colors duration-150 ${
                        language === 'ru'
                          ? 'text-[#a476ff] bg-[#151515] font-semibold'
                          : 'text-[#dfdfdf] hover:bg-[#151515]'
                      }`}
                    >
                      RU
                    </button>
                    <button
                      onClick={() => {
                        changeLanguage('en')
                        setIsLangDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-center px-4 py-2 text-sm transition-colors duration-150 ${
                        language === 'en'
                          ? 'text-[#a476ff] bg-[#151515] font-semibold'
                          : 'text-[#dfdfdf] hover:bg-[#151515]'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isDropdownOpen
                    ? 'bg-[#1a1a1a] border border-[#ffffff10]'
                    : 'hover:bg-[#1a1a1a] border border-transparent'
                } focus:outline-none focus:border-[#a476ff]/50`}
              >
                <div className="h-8 w-8 rounded-full bg-[#a476ff20] flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-[#a476ff]" />
                </div>
                <span className="hidden md:block text-[#dfdfdf] font-medium">
                  {user?.username}
                </span>
              </button>

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-xl py-1 z-50 border border-[#ffffff10]">
                    <div className="px-4 py-2 text-sm text-[#f3f3f398] border-b border-[#ffffff10]">
                      {user?.email}
                    </div>
                    <button
                      onClick={handleProfile}
                      className="flex w-full items-center px-4 py-2 text-sm text-[#dfdfdf] hover:bg-[#151515] transition-colors duration-150"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {t('header.profile')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-[#dfdfdf] hover:bg-[#151515] transition-colors duration-150"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('header.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
