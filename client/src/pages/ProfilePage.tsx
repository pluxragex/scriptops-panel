import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Calendar, Shield, Hash, Lock, Eye, EyeOff, X, Check, MessageSquare, Unlink, Smartphone, LogOut, KeyRound, Monitor, Tablet, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usersApi } from '../services/api'
import { formatDate } from '../lib/utils'
import LoadingSpinner from '../components/LoadingSpinner'
import { TelegramLoginData, LinkTelegramData, Session } from '../types'
import toast from 'react-hot-toast'
import { useTranslation } from '../lib/i18n'

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginData) => void
  }
}

const profileSchema = z.object({
  username: z.string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(20, 'Имя пользователя должно содержать максимум 20 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  email: z.string().email('Некорректный email'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Пароль должен содержать минимум одну строчную букву, одну заглавную букву и одну цифру'),
  confirmPassword: z.string().min(1, 'Подтвердите пароль'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, updateProfile, refreshToken, logout, accessToken } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [currentTokenHash, setCurrentTokenHash] = useState<string | null>(null)
  const [pendingActionToken, setPendingActionToken] = useState<string | null>(null)
  const [isWaiting2FA, setIsWaiting2FA] = useState(false)
  const telegramBotName = import.meta.env.VITE_TELEGRAM_BOT_NAME || ''
  const widgetContainerRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        email: user.email,
      })
    }
  }, [user, reset])


  const hasCheckedRef = useRef(false)

  useEffect(() => {

    if (hasCheckedRef.current || !user) return

    const checkTelegramStatus = async () => {
      try {

        const response = await usersApi.getProfile()
        updateProfile(response.data)
        hasCheckedRef.current = true
      } catch (error) {
        console.error('Ошибка проверки статуса Telegram:', error)
        hasCheckedRef.current = true
      }
    }

    checkTelegramStatus()

  }, [user?.id])

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true)
    try {
      await usersApi.updateProfile(data)

      if (user) {
        updateProfile({
          ...user,
          username: data.username,
          email: data.email,
        })
      }
      setIsEditing(false)
      toast.success(t('profile.updateSuccess'))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка обновления профиля')
    } finally {
      setIsLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsLoading(true)
    try {
      await usersApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setIsChangingPassword(false)
      resetPassword()
      toast.success(t('profile.passwordChangeSuccess'))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTelegramLink = useCallback(async (data: TelegramLoginData) => {
    setIsLoading(true)
    try {
      const linkData: LinkTelegramData = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        photo_url: data.photo_url,
        hash: data.hash,
        auth_date: data.auth_date,
      }
      const updatedUser = await usersApi.linkTelegram(linkData)
      updateProfile(updatedUser.data)
      toast.success(t('profile.telegramLinkSuccess'))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка привязки Telegram аккаунта')
    } finally {
      setIsLoading(false)
    }
  }, [updateProfile])


  useEffect(() => {
    if (!user?.telegramUserId && telegramBotName && widgetContainerRef.current) {

      widgetContainerRef.current.innerHTML = ''


      window.onTelegramAuth = (user: TelegramLoginData) => {
        handleTelegramLink(user)
      }


      const script = document.createElement('script')
      const cleanBotName = telegramBotName.replace(/^@/, '')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', cleanBotName)
      script.setAttribute('data-size', 'medium')
      script.setAttribute('data-corner-radius', '8')
      script.setAttribute('data-request-access', 'write')
      script.setAttribute('data-userpic', 'false')
      script.setAttribute('data-lang', 'ru')
      script.setAttribute('data-onauth', 'onTelegramAuth(user)')
      script.async = true

      widgetContainerRef.current.appendChild(script)

      return () => {
        if (window.onTelegramAuth) {
          delete window.onTelegramAuth
        }
        if (widgetContainerRef.current) {
          widgetContainerRef.current.innerHTML = ''
        }
      }
    }
  }, [user?.telegramUserId, telegramBotName, handleTelegramLink])

  const handleTelegramUnlink = async () => {
    if (!confirm(t('profile.confirmUnlink'))) {
      return
    }

    setIsLoading(true)
    try {
      const updatedUser = await usersApi.unlinkTelegram()
      updateProfile(updatedUser.data)
      toast.success(t('profile.telegramUnlinkSuccess'))
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка отвязки Telegram аккаунта')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleTwoFactor = async (enabled: boolean) => {
    if (enabled && !user?.telegramUserId) {
      toast.error('Для включения 2FA необходимо привязать Telegram аккаунт')
      return
    }

    setIsLoading(true)
    try {
      const response = await usersApi.toggleTwoFactor(enabled)
      const data = response.data as any


      if (data.requiresConfirmation && data.actionToken) {
        setPendingActionToken(data.actionToken)
        setIsWaiting2FA(true)
        toast.success('Подтверждение отправлено в Telegram')
        setIsLoading(false)

        return
      }


      updateProfile(data)
      toast.success(`2FA ${enabled ? t('profile.enable') : t('profile.disable')}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка изменения 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!pendingActionToken || !isWaiting2FA) {
      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await usersApi.checkPendingAction(pendingActionToken)
        const data = response.data

        if (data.approved) {

          clearInterval(pollInterval)
          setIsWaiting2FA(false)
          setPendingActionToken(null)

          if (data.user) {
            updateProfile(data.user)
            toast.success(`2FA ${data.user.twoFactorEnabled ? t('profile.enable') : t('profile.disable')}`)
          }
        } else if (data.status === 'REJECTED' || data.status === 'EXPIRED') {

          clearInterval(pollInterval)
          setIsWaiting2FA(false)
          setPendingActionToken(null)
          toast.error(data.status === 'EXPIRED' ? 'Время ожидания подтверждения истекло' : 'Действие было отклонено')
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Ошибка проверки статуса'
        if (errorMessage.includes('истек') || errorMessage.includes('expired')) {
          clearInterval(pollInterval)
          setIsWaiting2FA(false)
          setPendingActionToken(null)
          toast.error('Время ожидания подтверждения истекло')
        }

      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [pendingActionToken, isWaiting2FA, updateProfile])

  const loadSessions = async () => {
    setIsLoadingSessions(true)
    try {
      const response = await usersApi.getUserSessions()
      const sessionsData = response.data
      setSessions(sessionsData)


      const activeSessions = sessionsData.filter((s: Session) => new Date(s.expiresAt) > new Date())
      if (activeSessions.length > 0) {

        activeSessions.sort((a: Session, b: Session) =>
          new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
        )
        const currentSession = activeSessions[0]
        if (currentSession) {
          localStorage.setItem('currentSessionId', currentSession.id)

          const { initSocket } = await import('../services/socket')
          if (accessToken) {
            initSocket(accessToken, currentSession.id)
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка загрузки сессий')
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const handleRevokeSession = async (sessionId: string, isCurrentSession: boolean = false) => {
    if (!confirm(t('profile.confirmRevoke'))) {
      return
    }

    if (isCurrentSession) {
      if (!confirm(t('profile.confirmRevokeCurrent'))) {
        return
      }
    }

    setIsLoading(true)
    try {
      await usersApi.revokeSession(sessionId)
      toast.success(t('profile.sessionRevokedSuccess'))


      if (isCurrentSession) {
        logout()
        navigate('/login')
        return
      }

      await loadSessions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка завершения сессии')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    if (!confirm(t('profile.confirmRevokeAll'))) {
      return
    }

    if (!refreshToken) {
      toast.error('Не удалось получить refresh token')
      return
    }

    setIsLoading(true)
    try {
      await usersApi.revokeAllOtherSessions(refreshToken)
      toast.success(t('profile.allSessionsRevokedSuccess'))
      await loadSessions()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Ошибка завершения сессий')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])


  useEffect(() => {
    if (refreshToken) {
      const calculateTokenHash = async (token: string): Promise<string> => {
        const encoder = new TextEncoder()
        const data = encoder.encode(token)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      }

      calculateTokenHash(refreshToken).then(hash => {
        setCurrentTokenHash(hash)
      }).catch(() => {
        setCurrentTokenHash(null)
      })
    } else {
      setCurrentTokenHash(null)
    }
  }, [refreshToken])

  const getDeviceIcon = (deviceInfo?: string | null) => {
    if (!deviceInfo) return <Monitor className="h-4 w-4" />
    const device = deviceInfo.toLowerCase()
    if (device.includes('mobile') || device.includes('android') || device.includes('iphone') || device.includes('ios')) {
      return <Smartphone className="h-4 w-4" />
    }
    if (device.includes('tablet') || device.includes('ipad')) {
      return <Tablet className="h-4 w-4" />
    }
    if (device.includes('telegram')) {
      return <MessageSquare className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return t('profile.role.admin')
      case 'SUPER_ADMIN':
        return t('profile.role.superAdmin')
      default:
        return t('profile.role.user')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'text-blue-400 bg-blue-500/20 border border-blue-500/40'
      case 'SUPER_ADMIN':
        return 'text-purple-400 bg-purple-500/20 border border-purple-500/40'
      default:
        return 'text-[#f3f3f398] bg-[#1a1a1a] border border-[#ffffff10]'
    }
  }

  if (!user) {
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
            {t('profile.title')}
          </h2>
          <p className="mt-1 text-sm text-[#f3f3f398]">
            {t('profile.description')}
          </p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
              {t('profile.personalInfo')}
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="btn btn-secondary btn-sm flex items-center justify-center space-x-2"
              >
                <Lock className="h-4 w-4" />
                <span>{isChangingPassword ? t('common.cancel') : t('profile.changePassword')}</span>
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-secondary btn-sm flex items-center justify-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>{isEditing ? t('common.cancel') : t('profile.edit')}</span>
              </button>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('profile.username')}
                </label>
                <input
                  {...register('username')}
                  type="text"
                  className="mt-1 input w-full"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('profile.email')}
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="mt-1 input w-full"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary btn-sm flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>{t('common.cancel')}</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary btn-sm flex items-center space-x-2"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : <Check className="h-4 w-4" />}
                  <span>{isLoading ? t('profile.saving') : t('profile.save')}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
                <div className="flex items-center space-x-4 pb-4 border-b border-[#ffffff10]">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#a476ff] rounded-full blur-md opacity-30"></div>
                    <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-[#a476ff] to-[#8c5eff] flex items-center justify-center shadow-lg">
                      <User className="h-8 w-8 text-[#101010]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-[#dfdfdf]">{user.username}</h4>
                    <p className="text-sm text-[#f3f3f398]">{user.email}</p>
                  </div>
                </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <Hash className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide">{t('profile.userId')}</p>
                    <p className="text-sm text-[#dfdfdf] font-mono truncate mt-1">{user.id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <Mail className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide">{t('profile.email')}</p>
                    <p className="text-sm text-[#dfdfdf] truncate mt-1">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <Shield className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide mb-1">{t('profile.role')}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {t(`profile.role.${user.role.toLowerCase()}` as any) || getRoleText(user.role)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                  <div className="flex-shrink-0 p-2 rounded-lg bg-[#a476ff20] border border-[#a476ff40]">
                    <Calendar className="h-4 w-4 text-[#a476ff]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide">{t('profile.registrationDate')}</p>
                    <p className="text-sm text-[#dfdfdf] mt-1">{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                {user.telegramUserId && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                      <MessageSquare className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide">{t('profile.telegram')}</p>
                      <p className="text-sm text-[#dfdfdf] truncate mt-1">
                        {t('profile.telegramLinkedId')} {user.telegramUserId})
                      </p>
                    </div>
                  </div>
                )}

                {user.twoFactorEnabled && (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#ffffff10]">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                      <KeyRound className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#f3f3f398] uppercase tracking-wide">{t('profile.twoFactor')}</p>
                      <p className="text-sm text-green-400 mt-1">
                        {t('profile.twoFactorEnabledStatus')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isChangingPassword && (
        <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {t('profile.passwordChange')}
              </h3>
            </div>

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('profile.currentPassword')}
                </label>
                <div className="mt-1 relative">
                  <input
                    {...registerPassword('currentPassword')}
                    type={showPasswords.current ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder={t('profile.enterCurrentPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4 text-[#f3f3f398]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#f3f3f398]" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-sm text-red-400">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('profile.newPassword')}
                </label>
                <div className="mt-1 relative">
                  <input
                    {...registerPassword('newPassword')}
                    type={showPasswords.new ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder={t('profile.enterNewPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-[#f3f3f398]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#f3f3f398]" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-400">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#dfdfdf]">
                  {t('profile.confirmPassword')}
                </label>
                <div className="mt-1 relative">
                  <input
                    {...registerPassword('confirmPassword')}
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder={t('profile.confirmNewPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-[#f3f3f398]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[#f3f3f398]" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false)
                    resetPassword()
                  }}
                  className="btn btn-secondary btn-sm flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>{t('common.cancel')}</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary btn-sm flex items-center space-x-2"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : <Check className="h-4 w-4" />}
                  <span>{isLoading ? t('profile.changing') : t('profile.changePasswordBtn')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {telegramBotName && (
        <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
          <div className="px-6 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                  {t('profile.telegramIntegration')}
                </h3>
                <p className="mt-1 text-sm text-[#f3f3f398]">
                  {t('profile.telegramDescription')}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {user.telegramUserId ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500/30 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                      <MessageSquare className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#dfdfdf] mb-1">{t('profile.telegramLinked')}</p>
                      <p className="text-xs text-[#f3f3f398] break-all">ID: {user.telegramUserId}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTelegramUnlink}
                    disabled={isLoading}
                    className="btn btn-secondary btn-sm flex items-center space-x-2 flex-shrink-0"
                  >
                    <Unlink className="h-4 w-4" />
                    <span>{t('profile.unlink')}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500/30 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-red-500/20 border border-red-500/40">
                      <MessageSquare className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#dfdfdf] mb-1">{t('profile.linkTelegram')}</p>
                      <p className="text-xs text-[#f3f3f398]">{t('profile.useWidget')}</p>
                    </div>
                  </div>
                  <div ref={widgetContainerRef} className="flex-shrink-0"></div>
                </div>
              )}

              <div className="border-t border-[#ffffff10] pt-4">
                {user.twoFactorEnabled ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500/30 transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 border border-green-500/40">
                        <KeyRound className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#dfdfdf] mb-1">{t('profile.twoFactorEnabled')}</p>
                        <p className="text-xs text-[#f3f3f398]">
                          {t('profile.twoFactorDescription')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleTwoFactor(false)}
                      disabled={isLoading || isWaiting2FA}
                      className="btn btn-secondary btn-sm flex items-center space-x-2 flex-shrink-0"
                    >
                      {isWaiting2FA ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('profile.waiting')}</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          <span>{t('profile.disable')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500/30 transition-colors">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-red-500/20 border border-red-500/40">
                        <KeyRound className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#dfdfdf] mb-1">{t('profile.twoFactorDisabled')}</p>
                        <p className="text-xs text-[#f3f3f398]">
                          {user.telegramUserId
                            ? t('profile.enable2FADescription')
                            : t('profile.telegramRequired')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleTwoFactor(true)}
                      disabled={isLoading || isWaiting2FA || !user.telegramUserId}
                      className="btn btn-primary btn-sm flex items-center space-x-2 flex-shrink-0"
                    >
                      {isWaiting2FA ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('profile.waiting')}</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>{t('profile.enable')}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {user.telegramUserId && (
                <p className="text-xs text-[#f3f3f398]">
                  {t('profile.telegramLoginInfo')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#151515] to-[#1a1a1a] border border-[#ffffff10] shadow-lg rounded-xl">
        <div className="px-6 py-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg leading-6 font-medium text-[#dfdfdf]">
                {t('profile.activeSessions')}
              </h3>
              <p className="mt-1 text-sm text-[#f3f3f398]">
                {t('profile.sessionsDescription')}
              </p>
            </div>
            <button
              onClick={loadSessions}
              disabled={isLoadingSessions}
              className="btn btn-secondary btn-sm flex items-center space-x-2 flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              <span>{t('profile.refresh')}</span>
            </button>
          </div>

          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <LogOut className="mx-auto h-8 w-8 text-[#f3f3f398] mb-2" />
              <p className="text-sm text-[#f3f3f398]">{t('profile.noSessions')}</p>
              <p className="text-xs text-[#f3f3f398] mt-1">
                {t('profile.sessionsWillAppear')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .map((session) => {
                  const isExpired = new Date(session.expiresAt) < new Date();

                  const isCurrentSession = currentTokenHash
                    ? session.tokenHash === currentTokenHash && !isExpired
                    : false;

                  return { session, isCurrentSession, isExpired };
                })
                .sort((a, b) => {

                  if (a.isCurrentSession && !b.isCurrentSession) return -1;
                  if (!a.isCurrentSession && b.isCurrentSession) return 1;

                  return new Date(b.session.createdAt).getTime() - new Date(a.session.createdAt).getTime();
                })
                .map(({ session, isCurrentSession, isExpired }) => {

                return (
                  <div
                    key={session.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-xl transition-all ${
                      isExpired
                        ? 'bg-[#1a1a1a]/50 border-[#ffffff05] opacity-60'
                        : isCurrentSession
                        ? 'bg-[#1a1a1a] border-green-500/30 hover:border-green-500/40'
                        : 'bg-[#1a1a1a] border-[#ffffff10] hover:border-[#ffffff20]'
                    }`}
                  >
                    <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        isExpired
                          ? 'bg-gray-500/20 text-gray-400'
                          : isCurrentSession
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {getDeviceIcon(session.deviceInfo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <p className="text-sm font-medium text-[#dfdfdf] break-words">
                            {session.deviceInfo || t('profile.unknownDevice')}
                          </p>
                          {isCurrentSession && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded border border-green-500/30 whitespace-nowrap">
                              {t('profile.currentSession')}
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-400 rounded border border-gray-500/30 whitespace-nowrap">
                              {t('profile.expired')}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-[#f3f3f398]">
                            {session.location && (
                              <p className="break-words">
                                <span className="text-[#f3f3f398]/60">📍</span> {session.location}
                              </p>
                            )}
                            {session.ipAddress && (
                              <p className="break-all">
                                <span className="text-[#f3f3f398]/60">IP:</span> {session.ipAddress}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-[#f3f3f398]">
                            <p>
                              <span className="text-[#f3f3f398]/60">{t('profile.created')}</span> {formatDate(session.createdAt)}
                            </p>
                            <p>
                              <span className="text-[#f3f3f398]/60">{t('profile.active')}</span> {formatDate(session.lastActivityAt)}
                            </p>
                            {!isExpired && (
                              <p className="text-green-400">
                                <span className="text-[#f3f3f398]/60">{t('profile.until')}</span> {formatDate(session.expiresAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!isExpired && (
                      <button
                        onClick={() => handleRevokeSession(session.id, isCurrentSession)}
                        disabled={isLoading || isCurrentSession}
                        className="btn btn-secondary btn-sm flex items-center space-x-2 flex-shrink-0 sm:ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isCurrentSession ? t('profile.cannotRevokeCurrent') : t('profile.revokeSession')}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{t('profile.revokeSession')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {sessions.length > 1 && (
                <div className="pt-3 border-t border-[#ffffff10]">
                  <button
                    onClick={handleRevokeAllOtherSessions}
                    disabled={isLoading}
                    className="btn btn-secondary btn-sm w-full flex items-center justify-center space-x-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-center">{t('profile.revokeAllOther')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
