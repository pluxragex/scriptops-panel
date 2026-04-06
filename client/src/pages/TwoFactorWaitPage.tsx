import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../services/api'
import { showSuccessToast } from '../lib/toast'
import { initSocket } from '../services/socket'

export default function TwoFactorWaitPage() {
  const [searchParams] = useSearchParams()
  const loginToken = searchParams.get('token')
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loginToken) {
      setError('Неверный токен входа')
      return
    }


    const pollInterval = setInterval(async () => {
      try {
        const response = await authApi.checkPendingLogin(loginToken)
        const data = response.data

        if (data.approved) {

          clearInterval(pollInterval)

          if (data.user && data.accessToken && data.refreshToken) {
            const sessionId = (data as any).sessionId

            useAuthStore.setState({
              user: data.user,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            })


            if (sessionId) {
              localStorage.setItem('currentSessionId', sessionId)
            }


            if (data.user.telegramUserId) {
              localStorage.setItem('telegramUserId', String(data.user.telegramUserId))
            }


            initSocket(data.accessToken, sessionId)

            showSuccessToast('Добро пожаловать!')
            navigate('/')
          }
        } else if (data.status === 'REJECTED' || data.status === 'EXPIRED') {

          clearInterval(pollInterval)
          setError(data.status === 'EXPIRED' ? 'Время ожидания подтверждения истекло' : 'Вход был отклонен')
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Ошибка проверки статуса'
        if (errorMessage.includes('истек') || errorMessage.includes('expired')) {
          clearInterval(pollInterval)
          setError('Время ожидания подтверждения истекло')
        }

      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [loginToken, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101010] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <Bot className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#dfdfdf]">{error}</h2>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary w-full"
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101010] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <Bot className="h-12 w-12 text-[#a476ff]" />
        </div>
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-[#dfdfdf]">
            Ожидание подтверждения
          </h2>
          <p className="mt-4 text-sm text-[#f3f3f398]">
            Отправлено вам в Telegram подтвердите вход
          </p>
        </div>

        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 text-[#a476ff] animate-spin" />
        </div>

        <p className="text-xs text-[#f3f3f398]">
          Проверьте Telegram и нажмите кнопку "Разрешить вход" для завершения авторизации
        </p>
      </div>
    </div>
  )
}

