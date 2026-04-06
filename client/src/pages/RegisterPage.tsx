import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bot, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { showSuccessToast } from '../lib/toast'
import LoadingSpinner from '../components/LoadingSpinner'

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  username: z.string()
    .min(3, 'Имя пользователя должно содержать минимум 3 символа')
    .max(20, 'Имя пользователя должно содержать максимум 20 символов')
    .regex(/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только буквы, цифры и подчеркивания'),
  password: z.string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Пароль должен содержать минимум одну строчную букву, одну заглавную букву и одну цифру'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
      })
      showSuccessToast('Аккаунт создан успешно!')
    } catch (error: any) {

      console.error('Ошибка регистрации:', error)
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
            Создание аккаунта
          </h2>
          <p className="mt-2 text-center text-sm text-[#f3f3f398]">
            Или{' '}
            <Link
              to="/login"
              className="font-medium text-[#a476ff] hover:text-[#8c5eff]"
            >
              войдите в существующий аккаунт
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
              <label htmlFor="username" className="block text-sm font-medium text-[#dfdfdf]">
                Имя пользователя
              </label>
              <input
                {...register('username')}
                type="text"
                autoComplete="username"
                className="mt-1 input"
                placeholder="Введите имя пользователя"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>
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
                  autoComplete="new-password"
                  className="input pr-10"
                  placeholder="Введите пароль"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#dfdfdf]">
                Подтверждение пароля
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="input pr-10"
                  placeholder="Подтвердите пароль"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-[#f3f3f398]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[#f3f3f398]" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
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
                'Создать аккаунт'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
