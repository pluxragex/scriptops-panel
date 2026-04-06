import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { showSuccessToast } from '../lib/toast'
import LoadingSpinner from '../components/LoadingSpinner'
import TelegramLoginWidget from '../components/TelegramLoginWidget'
import { TelegramLoginData } from '../types'

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Пароль обязателен'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, loginWithTelegram, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const telegramBotName = import.meta.env.VITE_TELEGRAM_BOT_NAME || ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data) as any
      
      if (result && result.requiresTwoFactor && result.loginToken) {
        navigate(`/auth/2fa-wait?token=${result.loginToken}`)
        return
      }

      showSuccessToast('Добро пожаловать!')
      navigate('/')
    } catch (error) {

      console.error('Ошибка входа:', error)
    }
  }

  const handleTelegramAuth = async (data: TelegramLoginData) => {
    try {
      await loginWithTelegram(data)
      showSuccessToast('Успешная авторизация через Telegram!')
      navigate('/')
    } catch (error: any) {


      if (error.response?.status !== 429) {
        console.error('Ошибка авторизации через Telegram:', error)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101010] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Bot className="h-12 w-12 text-[#a476ff]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#dfdfdf]">
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-[#f3f3f398]">
            Или{' '}
            <Link
              to="/register"
              className="font-medium text-[#a476ff] hover:text-[#8c5eff]"
            >
              создайте новый аккаунт
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#dfdfdf]">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="mt-1 input"
                placeholder="Введите ваш email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#dfdfdf]">
                Пароль
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="Введите ваш пароль"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-[#f3f3f398]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[#f3f3f398]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full block h-10 px-4 py-2 text-sm"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="text-[#101010]" />
              ) : (
                'Войти'
              )}
            </button>
          </div>
        </form>

        {telegramBotName && (
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#ffffff10]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#101010] text-[#f3f3f398]">Или</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-center items-center">
                <TelegramLoginWidget
                  botName={telegramBotName}
                  onAuth={handleTelegramAuth}
                  buttonSize="medium"
                  cornerRadius={8}
                  usePic={false}
                />
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-[#f3f3f398]">
              Войдите через Telegram, если ваш аккаунт уже привязан
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
