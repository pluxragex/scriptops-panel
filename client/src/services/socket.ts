import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const WS_URL = API_BASE_URL.replace('/api', '')

let socket: Socket | null = null
let currentToken: string | null = null

export function initSocket(accessToken: string, sessionId?: string) {
  const storedSessionId = sessionId || localStorage.getItem('currentSessionId')
  if (socket?.connected && currentToken === accessToken) {
    return socket
  }

  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  currentToken = accessToken
  const queryParams: any = {
    token: accessToken,
  }

  if (storedSessionId) {
    queryParams.sessionId = storedSessionId
  }

  socket = io(WS_URL, {
    query: queryParams,
    extraHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000,
    forceNew: false,
    timeout: 20000,
    upgrade: true,
    rememberUpgrade: true,
  })

  socket.on('connect', () => {
  })

  socket.on('connected', () => {
  })

  socket.on('connect_error', (error: any) => {
    console.error('WebSocket connection error:', error)
  })

  socket.on('session-revoked', () => {
    const { isLoggingOut, isSessionRevoked } = useAuthStore.getState()
    if (isLoggingOut || isSessionRevoked) {
      return
    }

    useAuthStore.setState({ isSessionRevoked: true })
    disconnectSocket()
    toast.error('Сессия истекла. Пожалуйста, войдите снова.')

    try {
      localStorage.removeItem('auth-storage')
      sessionStorage.clear()
    } catch (e) {
      console.error('Ошибка очистки storage:', e)
    }
    useAuthStore.getState().logout(true)
    setTimeout(() => {
      try {
        localStorage.removeItem('auth-storage')
        sessionStorage.clear()
      } catch (e) {
        console.error('Ошибка повторной очистки storage:', e)
      }
      window.dispatchEvent(new CustomEvent('session-revoked-navigate', { detail: { path: '/login' } }))
    }, 100)
  })

  socket.on('sessions-revoked', (data: { message: string; revokedCount: number }) => {
    toast.error(`Все остальные сессии были завершены (${data.revokedCount} сессий)`)
  })

  socket.on('disconnect', (reason: string) => {
    if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
    }
  })

  socket.on('error', (error: any) => {
    console.error('WebSocket error:', error)
  })
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  currentToken = null
}

export function getSocket(): Socket | null {
  return socket
}

