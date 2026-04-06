import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, LoginCredentials, RegisterData, TelegramLoginData } from '../types'
import { authApi } from '../services/api'
import { initSocket, disconnectSocket } from '../services/socket'
import toast from 'react-hot-toast'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isLoggingOut: boolean
  isSessionRevoked: boolean
  isRefreshing: boolean
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>
  loginWithTelegram: (data: TelegramLoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: (silent?: boolean) => void
  refreshAccessToken: () => Promise<void>
  checkAuth: () => Promise<void>
  setLoading: (loading: boolean) => void
  updateProfile: (userData: Partial<User>) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      return {

      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      isLoggingOut: false,
      isSessionRevoked: false,
      isRefreshing: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(credentials)


          if ('requiresTwoFactor' in response.data && response.data.requiresTwoFactor) {
            set({ isLoading: false })

            const twoFactorData = response.data as { requiresTwoFactor: boolean; message: string; loginToken: string }
            return { requiresTwoFactor: true, loginToken: twoFactorData.loginToken } as any
          }

          const { user, accessToken, refreshToken, sessionId } = response.data as { user: User; accessToken: string; refreshToken: string; sessionId?: string }

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            isSessionRevoked: false,
          })


          if (sessionId) {
            localStorage.setItem('currentSessionId', sessionId)
          }


          if (user.telegramUserId) {
            localStorage.setItem('telegramUserId', String(user.telegramUserId))
          }

          if (accessToken) {
            initSocket(accessToken, sessionId)
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      loginWithTelegram: async (data: TelegramLoginData) => {
        set({ isLoading: true })
        try {
          const response = await authApi.loginWithTelegram(data)
          const { user, accessToken, refreshToken, sessionId } = response.data as { user: User; accessToken: string; refreshToken: string; sessionId?: string }

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            isSessionRevoked: false,
          })

          if (sessionId) {
            localStorage.setItem('currentSessionId', sessionId)
          }


          if (user.telegramUserId) {
            localStorage.setItem('telegramUserId', String(user.telegramUserId))
          }

          if (accessToken) {
            initSocket(accessToken, sessionId)
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(data)
          const { user, accessToken, refreshToken, sessionId } = response.data as { user: User; accessToken: string; refreshToken: string; sessionId?: string }

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            isSessionRevoked: false,
          })

          if (sessionId) {
            localStorage.setItem('currentSessionId', sessionId)
          }

          if (user.telegramUserId) {
            localStorage.setItem('telegramUserId', String(user.telegramUserId))
          }

          if (accessToken) {
            initSocket(accessToken, sessionId)
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async (silent = false) => {

        const { isLoggingOut } = get()
        if (isLoggingOut) {
          return
        }

        set({ isLoggingOut: true })

        try {
          const { refreshToken, isAuthenticated, accessToken } = get()
          const isOnLoginPage = window.location.pathname === '/login' || window.location.pathname === '/auth/login'

          const { isSessionRevoked } = get()
          if (!isAuthenticated || !refreshToken || !accessToken || isSessionRevoked) {

          disconnectSocket()
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            isSessionRevoked: false,
          })
          try {
            localStorage.removeItem('auth-storage')
            localStorage.removeItem('currentSessionId')

          } catch (e) {
            console.error('Ошибка очистки localStorage:', e)
          }
            if (!silent && !isOnLoginPage) {
              setTimeout(() => {
                toast.success('Вы успешно вышли')
              }, 0)
            }
            return
          }
          const savedRefreshToken = refreshToken
          disconnectSocket()
          try {

            await authApi.logout({ refreshToken: savedRefreshToken })
          } catch (error: any) {
            console.warn('[Logout] Ошибка при отправке запроса на сервер:', {
              message: error?.message,
              response: error?.response?.data,
              status: error?.response?.status,
              url: error?.config?.url,
            })

          }

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            isSessionRevoked: false,
          })

          try {
            localStorage.removeItem('auth-storage')
            localStorage.removeItem('currentSessionId')

          } catch (e) {
            console.error('Ошибка очистки localStorage:', e)
          }

          if (!silent && !isOnLoginPage) {
            setTimeout(() => {
              toast.success('Вы успешно вышли')
            }, 0)
          }
        } finally {

          set({ isLoggingOut: false })
        }
      },

      refreshAccessToken: async () => {

        const { isLoggingOut, isSessionRevoked, isRefreshing } = get()
        if (isLoggingOut) {
          throw new Error('Logout in progress')
        }

        if (isSessionRevoked) {
          throw new Error('Session revoked')
        }


        if (isRefreshing) {

          let attempts = 0
          while (get().isRefreshing && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++

            if (get().isSessionRevoked || get().isLoggingOut) {
              throw new Error('Session revoked or logout in progress')
            }
          }

          if (get().accessToken) {
            return
          }
          throw new Error('Token refresh failed')
        }

        const { refreshToken, isAuthenticated } = get()

        if (!isAuthenticated || !refreshToken) {
          throw new Error('No refresh token available or user is not authenticated')
        }

        set({ isRefreshing: true })

        try {
          const response = await authApi.refreshToken({ refreshToken })
          const { accessToken, refreshToken: newRefreshToken } = response.data

          set({
            accessToken,
            refreshToken: newRefreshToken,
            isRefreshing: false,
          })

          const storedSessionId = localStorage.getItem('currentSessionId')
          if (accessToken) {
            initSocket(accessToken, storedSessionId || undefined)
          }
        } catch (error: any) {

          set({ isRefreshing: false })

          const isSessionError = error?.response?.status === 401 ||
                                error?.response?.data?.message?.includes('Сессия') ||
                                error?.response?.data?.message?.includes('сессия') ||
                                error?.response?.data?.message?.includes('Недействительный refresh токен')

          const { isLoggingOut: isLoggingOutNow, isSessionRevoked: isSessionRevokedNow } = get()
          if (isSessionError && !isLoggingOutNow && !isSessionRevokedNow) {

            set({ isSessionRevoked: true })


            get().logout(true)
          }

          throw error
        }
      },
      checkAuth: async () => {
        const { accessToken, refreshToken } = get()

        if (!accessToken || !refreshToken) {
          set({ isLoading: true })

          const savedTelegramUserId = localStorage.getItem('telegramUserId')
          const botSecret = import.meta.env.VITE_TELEGRAM_BOT_SECRET

          if (savedTelegramUserId && botSecret) {
            try {

              const telegramUserId = Number(savedTelegramUserId)
              const response = await authApi.loginWithTelegramId(telegramUserId, botSecret)

              if (response?.data) {
                const { user, accessToken: newAccessToken, refreshToken: newRefreshToken, sessionId } = response.data

                set({
                  user,
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken,
                  isAuthenticated: true,
                  isLoading: false,
                  isSessionRevoked: false,
                })


                if (sessionId) {
                  localStorage.setItem('currentSessionId', sessionId)
                }
                if (user.telegramUserId) {
                  localStorage.setItem('telegramUserId', String(user.telegramUserId))
                }

                if (newAccessToken) {
                  initSocket(newAccessToken, sessionId)
                }

                return
              }
            } catch (telegramError) {

              console.error('Ошибка авторизации через Telegram:', telegramError)
            }
          }
          set({ isLoading: false })
          get().logout(true)
          return
        }
        set({ isLoading: true })
        try {
          const response = await authApi.getProfile(true)
          const user = response.data

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            isSessionRevoked: false,
          })

          if (user.telegramUserId) {
            localStorage.setItem('telegramUserId', String(user.telegramUserId))
          }

          const storedSessionId = localStorage.getItem('currentSessionId')
          if (accessToken) {
            initSocket(accessToken, storedSessionId || undefined)
          }
        } catch (error) {

          try {
            await get().refreshAccessToken()
            const response = await authApi.getProfile(true)
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
              isSessionRevoked: false,
            })

            if (response.data.telegramUserId) {
              localStorage.setItem('telegramUserId', String(response.data.telegramUserId))
            }

            const storedSessionId = localStorage.getItem('currentSessionId')
            const { accessToken: newAccessToken } = get()
            if (newAccessToken) {
              initSocket(newAccessToken, storedSessionId || undefined)
            }
          } catch (refreshError) {

            const savedTelegramUserId = localStorage.getItem('telegramUserId')
            const botSecret = import.meta.env.VITE_TELEGRAM_BOT_SECRET

            if (savedTelegramUserId && botSecret) {
              try {
                const telegramUserId = Number(savedTelegramUserId)
                const telegramResponse = await authApi.loginWithTelegramId(telegramUserId, botSecret)

                if (telegramResponse?.data) {
                  const { user, accessToken: newAccessToken, refreshToken: newRefreshToken, sessionId } = telegramResponse.data

                  set({
                    user,
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                    isAuthenticated: true,
                    isLoading: false,
                    isSessionRevoked: false,
                  })

                  if (sessionId) {
                    localStorage.setItem('currentSessionId', sessionId)
                  }
                  if (user.telegramUserId) {
                    localStorage.setItem('telegramUserId', String(user.telegramUserId))
                  }

                  if (newAccessToken) {
                    initSocket(newAccessToken, sessionId)
                  }

                  return
                }
              } catch (telegramError) {

                console.error('Ошибка авторизации через Telegram:', telegramError)
              }
            }
            get().logout(true)
          }
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      updateProfile: (userData: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...userData } })
        }
      },
      }
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
