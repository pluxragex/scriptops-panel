import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usersApi } from '../services/api'
import { showSuccessToast } from '../lib/toast'

export default function TwoFactorActionWaitPage() {
  const [searchParams] = useSearchParams()
  const actionToken = searchParams.get('token')
  const action = searchParams.get('action')
  const navigate = useNavigate()
  const { updateProfile } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!actionToken) {
      setError('Неверный токен действия')
      return
    }


    const pollInterval = setInterval(async () => {
      try {
        const response = await usersApi.checkPendingAction(actionToken)
        const data = response.data

        if (data.approved) {

          clearInterval(pollInterval)

          if (data.user) {
            updateProfile(data.user)
            showSuccessToast(`2FA ${action === 'enable' ? 'включена' : 'выключена'}`)
            navigate('/profile')
          }
        } else if (data.status === 'REJECTED' || data.status === 'EXPIRED') {

          clearInterval(pollInterval)
          setError(data.status === 'EXPIRED' ? 'Время ожидания подтверждения истекло' : 'Действие было отклонено')
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
  }, [actionToken, action, navigate, updateProfile])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101010] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <Bot className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#dfdfdf]">{error}</h2>
          <button
            onClick={() => navigate('/profile')}
            className="btn btn-primary w-full"
          >
            Вернуться в профиль
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
            Отправлено вам в Telegram подтвердите {action === 'enable' ? 'включение' : 'выключение'} 2FA
          </p>
        </div>

        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 text-[#a476ff] animate-spin" />
        </div>

        <p className="text-xs text-[#f3f3f398]">
          Проверьте Telegram и нажмите кнопку "Разрешить" для завершения действия
        </p>
      </div>
    </div>
  )
}

