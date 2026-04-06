import { useState } from 'react'
import { X, Key, Save, AlertCircle } from 'lucide-react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showSuccessToast } from '../../lib/toast'
import { User } from '../../types'
import { useTranslation } from '../../lib/i18n'

interface ChangePasswordModalProps {
  user: User
  onClose: () => void
  onSuccess: () => void
}

export default function ChangePasswordModal({ user, onClose, onSuccess }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [reason, setReason] = useState('')
  const [isChanging, setIsChanging] = useState(false)
  const [errors, setErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
    reason?: string
  }>({})
  const { t } = useTranslation()

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!newPassword) {
      newErrors.newPassword = t('admin.changePassword.errors.newPasswordRequired')
    } else if (newPassword.length < 6) {
      newErrors.newPassword = t('admin.changePassword.errors.newPasswordTooShort')
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('admin.changePassword.errors.confirmPasswordRequired')
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('admin.changePassword.errors.passwordsNotMatch')
    }

    if (!reason) {
      newErrors.reason = t('admin.changePassword.errors.reasonRequired')
    } else if (reason.length < 10) {
      newErrors.reason = t('admin.changePassword.errors.reasonTooShort')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsChanging(true)
      await adminApi.changeUserPassword(user.id, {
        newPassword,
        reason,
      })
      showSuccessToast(t('admin.changePassword.success'))
      onSuccess()
      onClose()
    } catch (error: any) {

      console.error('Ошибка изменения пароля:', error)
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#151515] rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#ffffff10]">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 text-[#a476ff]" />
            <div>
              <h2 className="text-xl font-semibold text-[#dfdfdf]">
                {t('admin.changePassword.title')}
              </h2>
              <p className="text-sm text-[#f3f3f398] mt-1">
                {t('admin.changePassword.userLabel')}{' '}
                <span className="font-medium text-[#dfdfdf]">{user.username}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form id="change-password-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium mb-1">{t('admin.changePassword.warningTitle')}</p>
                <p>{t('admin.changePassword.warningText')}</p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-[#dfdfdf] mb-2">
              {t('admin.changePassword.newPasswordLabel')} <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: undefined })
                }
              }}
              className={`input ${errors.newPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('admin.changePassword.newPasswordPlaceholder')}
              disabled={isChanging}
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#dfdfdf] mb-2">
              {t('admin.changePassword.confirmPasswordLabel')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined })
                }
              }}
              className={`input ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('admin.changePassword.confirmPasswordPlaceholder')}
              disabled={isChanging}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-[#dfdfdf] mb-2">
              {t('admin.changePassword.reasonLabel')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (errors.reason) {
                  setErrors({ ...errors, reason: undefined })
                }
              }}
              rows={3}
              className={`input ${errors.reason ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('admin.changePassword.reasonPlaceholder')}
              disabled={isChanging}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-400">{errors.reason}</p>
            )}
            <p className="mt-1 text-xs text-[#f3f3f398]">
              {t('admin.changePassword.reasonHint')}
            </p>
          </div>

        </form>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-[#ffffff10] bg-[#1a1a1a]">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            disabled={isChanging}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="change-password-form"
            disabled={isChanging}
            className="btn btn-primary btn-sm"
          >
            {isChanging ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">{t('admin.changePassword.changing')}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="ml-2">{t('admin.changePassword.submit')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

