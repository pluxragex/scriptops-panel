import { useEffect, useRef } from 'react'
import { TelegramLoginData } from '../types'

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginData) => void
  }
}

interface TelegramLoginWidgetProps {
  botName: string
  onAuth: (data: TelegramLoginData) => void
  buttonSize?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: boolean
  usePic?: boolean
  lang?: string
}

export default function TelegramLoginWidget({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius = 0,
  requestAccess = true,
  usePic = false,
  lang = 'ru',
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!botName) {
      console.warn('TelegramLoginWidget: botName не указан')
      return
    }


    const cleanBotName = botName.replace(/^@/, '')

    if (cleanBotName !== botName) {
      console.warn(`TelegramLoginWidget: Удален символ @ из имени бота. Используется: ${cleanBotName}`)
    }


    window.onTelegramAuth = (user: TelegramLoginData) => {
      onAuth(user)
    }


    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', cleanBotName)
    script.setAttribute('data-size', buttonSize)
    script.setAttribute('data-corner-radius', cornerRadius.toString())
    script.setAttribute('data-request-access', requestAccess ? 'write' : '')
    script.setAttribute('data-userpic', usePic.toString())
    script.setAttribute('data-lang', lang)
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.async = true


    script.onerror = () => {
      console.error('TelegramLoginWidget: Ошибка загрузки скрипта telegram-widget.js')
    }

    script.onload = () => {

    }

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(script)
    }

    return () => {

      if (window.onTelegramAuth) {
        delete window.onTelegramAuth
      }
    }
  }, [botName, onAuth, buttonSize, cornerRadius, requestAccess, usePic, lang])

  return <div ref={containerRef} />
}

