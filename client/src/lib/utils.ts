import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'только что'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} мин. назад`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} ч. назад`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} дн. назад`
  }

  return formatDate(date)
}

export function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}д ${hours}ч ${minutes}м`
  } else if (hours > 0) {
    return `${hours}ч ${minutes}м`
  } else {
    return `${minutes}м`
  }
}

export function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'RUNNING':
      return 'text-green-400 bg-green-500/20 border border-green-500/40'
    case 'STOPPED':
      return 'text-red-400 bg-red-500/20 border border-red-500/40'
    case 'STARTING':
      return 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40 animate-pulse'
    case 'STOPPING':
      return 'text-orange-400 bg-orange-500/20 border border-orange-500/40 animate-pulse'
    case 'ERROR':
      return 'text-red-400 bg-red-500/20 border border-red-500/40'
    case 'EXPIRED':
      return 'text-red-400 bg-red-500/20 border border-red-500/40'
    case 'UNKNOWN':
      return 'text-gray-400 bg-gray-500/20 border border-gray-500/40'
    default:
      return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
  }
}

export function getStatusText(status: string) {
  switch (status.toUpperCase()) {
    case 'RUNNING':
      return 'Запущен'
    case 'STOPPED':
      return 'Остановлен'
    case 'STARTING':
      return 'Запускается'
    case 'STOPPING':
      return 'Останавливается'
    case 'ERROR':
      return 'Ошибка'
    case 'EXPIRED':
      return 'Истек'
    case 'UNKNOWN':
      return 'Неизвестно'
    default:
      return status
  }
}

export function getFrozenStatusColor() {
  return 'text-blue-400 bg-blue-500/20 border border-blue-500/40'
}

export function getExpiryStatusColor(status: 'expired' | 'expiring-soon' | 'valid' | 'no-expiry') {
  switch (status) {
    case 'expired':
      return 'text-red-400 bg-red-500/20 border border-red-500/40'
    case 'expiring-soon':
      return 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/40'
    case 'valid':
      return 'text-green-400 bg-green-500/10 border border-green-500/20'
    case 'no-expiry':
      return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
    default:
      return 'text-[#f3f3f398] bg-[#151515] border border-[#ffffff10]'
  }
}

export function getExpiryStatusText(expiryDate?: string): string {
  if (!expiryDate) return 'Бессрочный'

  const status = getExpiryStatus(expiryDate)
  switch (status) {
    case 'expired':
      return 'Истек'
    case 'expiring-soon':
      const now = new Date()
      const expiry = new Date(expiryDate)
      const diffInDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return `Истекает через ${diffInDays} ${diffInDays === 1 ? 'день' : diffInDays < 5 ? 'дня' : 'дней'}`
    case 'valid':
      return 'Активен'
    case 'no-expiry':
      return 'Бессрочный'
    default:
      return 'Неизвестно'
  }
}

export interface ScriptStatusInfo {
  primaryStatus: {
    text: string
    color: string
    icon?: string
  }
}

export function getScriptStatusInfo(script: {
  status: string
  frozenAt?: string
  frozenUntil?: string
  expiryDate?: string
}): ScriptStatusInfo {
  const primaryStatus = {
    text: getStatusText(script.status),
    color: getStatusColor(script.status)
  }

  return {
    primaryStatus
  }
}

export function isScriptExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false
  return new Date() > new Date(expiryDate)
}

export function getExpiryStatus(expiryDate?: string): 'valid' | 'expired' | 'expiring-soon' | 'no-expiry' {
  if (!expiryDate) return 'no-expiry'

  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffInDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays < 0) return 'expired'
  if (diffInDays <= 7) return 'expiring-soon'
  return 'valid'
}

export function isScriptFrozen(frozenAt?: string, frozenUntil?: string): boolean {
  if (!frozenAt) return false

  if (!frozenUntil) return true

  return new Date(frozenUntil) > new Date()
}