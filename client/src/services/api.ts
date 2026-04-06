import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { showErrorToast, createErrorKey } from '../lib/toast'

import {
  User,
  Script,
  Server,
  Deployment,
  AuditLog,
  SystemStats,
  LoginCredentials,
  RegisterData,
  TelegramLoginData,
  LinkTelegramData,
  CreateScriptData,
  DeployScriptData,
  JobStatus,
  PaginatedResponse,
  ScriptSettings,
  News,
  CreateNewsData,
  UpdateNewsData,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
let csrfToken: string | null = null

export async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/auth/csrf-token`, {
      withCredentials: true,
    })
    csrfToken = response.data.csrfToken || null
    return csrfToken
  } catch (error) {
    console.error('Failed to get CSRF token:', error)
    return null
  }
}

getCsrfToken().catch(() => {

})

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})


api.interceptors.request.use(
  async (config: any) => {

    const isLogoutRequest = config.url?.includes('/auth/logout') || config._isLogoutRequest
    const { accessToken, isSessionRevoked, isLoggingOut } = useAuthStore.getState()


    if (isSessionRevoked && !isLogoutRequest) {
      return Promise.reject(new Error('Session revoked'))
    }

    if (isLoggingOut && !isLogoutRequest) {
      return Promise.reject(new Error('Logout in progress'))
    }

    if (isLogoutRequest) {
      config._isLogoutRequest = true
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    const method = config.method?.toUpperCase()
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {

      if (!csrfToken && !config.url?.includes('/auth/csrf-token')) {
        await getCsrfToken()
      }

      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    const newCsrfToken = response.headers['x-csrf-token']
    if (newCsrfToken) {
      csrfToken = newCsrfToken
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.headers['x-csrf-token']) {
      csrfToken = error.response.headers['x-csrf-token']
    }

    if (error.response?.status === 401) {

      const isLogoutRequest = originalRequest?.url?.includes('/auth/logout') || originalRequest?._isLogoutRequest

      if (isLogoutRequest) {
        return Promise.resolve({
          data: { message: 'Logged out successfully' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: originalRequest,
        } as AxiosResponse)
      }

      const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh')
      if (isRefreshRequest) {
        const { isLoggingOut, isSessionRevoked } = useAuthStore.getState()
        if (!isLoggingOut && !isSessionRevoked) {
          useAuthStore.setState({ isSessionRevoked: true, isRefreshing: false })
          useAuthStore.getState().logout(true)
        } else if (isSessionRevoked) {
          useAuthStore.setState({ isRefreshing: false })
        }
        return Promise.reject(error)
      }

      const { isAuthenticated, isLoggingOut, isSessionRevoked } = useAuthStore.getState()
      if (isSessionRevoked) {
        return Promise.reject(error)
      }

      if (isLoggingOut || !isAuthenticated) {
        return Promise.reject(error)
      }

      if (originalRequest._retry) {
        const { isLoggingOut: isLoggingOutNow, isSessionRevoked: isSessionRevokedNow } = useAuthStore.getState()
        if (!isLoggingOutNow && !isSessionRevokedNow) {
          useAuthStore.setState({ isSessionRevoked: true })
          useAuthStore.getState().logout(true)
        }
        return Promise.reject(error)
      }
      originalRequest._retry = true

      try {
        await useAuthStore.getState().refreshAccessToken()
        const { accessToken } = useAuthStore.getState()

        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError: any) {
        const { isLoggingOut, isSessionRevoked } = useAuthStore.getState()

        if (isLoggingOut || isSessionRevoked) {
          return Promise.reject(refreshError)
        }
        useAuthStore.setState({ isSessionRevoked: true, isRefreshing: false })
        useAuthStore.getState().logout(true)

        return Promise.reject(refreshError)
      }
    }

    const isLogoutRequest = originalRequest?.url?.includes('/auth/logout')
    const isTelegramAuth = originalRequest?.url?.includes('/auth/telegram')
    const isSshApi = originalRequest?.url?.includes('/ssh/')

    if (error.response?.status === 429) {
      const errorMessage = isTelegramAuth
        ? 'Слишком много попыток авторизации. Пожалуйста, подождите минуту и попробуйте снова.'
        : 'Слишком много запросов. Пожалуйста, подождите и попробуйте снова.'
      showErrorToast(errorMessage, createErrorKey(originalRequest?.url || '', 429))
      return Promise.reject(error)
    }

    if (error.response?.status !== 401 && !originalRequest?.url?.includes('/server-stats') && !isLogoutRequest && !isSshApi) {
      const errorKey = createErrorKey(originalRequest?.url || '', error.response?.status || 0)
      const errorMessage = error.response?.data?.message || error.message || 'Произошла ошибка'
      showErrorToast(errorMessage, errorKey)
    }

    return Promise.reject(error)
  }
)


export const authApi = {
  login: (credentials: LoginCredentials): Promise<AxiosResponse<{ user: User; accessToken: string; refreshToken: string } | { requiresTwoFactor: boolean; message: string; loginToken: string }>> =>
    api.post('/auth/login', credentials),

  register: (data: RegisterData): Promise<AxiosResponse<{ user: User; accessToken: string; refreshToken: string }>> =>
    api.post('/auth/register', data),

  refreshToken: (data: { refreshToken: string }): Promise<AxiosResponse<{ accessToken: string; refreshToken: string }>> =>
    api.post('/auth/refresh', data),

  logout: (data: { refreshToken: string }): Promise<AxiosResponse<{ message: string }>> => {

    const config: any = {
      _isLogoutRequest: true,
    }
    return api.post('/auth/logout', data, config)
  },

  logoutAll: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/logout-all'),

  getProfile: (silent?: boolean): Promise<AxiosResponse<User>> => {
    const config = silent ? { headers: { 'X-Silent-Auth-Check': 'true' } } : {}
    return api.get('/users/me', config)
  },

  loginWithTelegram: (data: TelegramLoginData): Promise<AxiosResponse<{ user: User; accessToken: string; refreshToken: string; sessionId?: string }>> =>
    api.post('/auth/telegram', data),

  loginWithTelegramId: (telegramUserId: number, botSecret?: string): Promise<AxiosResponse<{ user: User; accessToken: string; refreshToken: string; sessionId?: string }>> =>
    api.post('/auth/telegram/bot', { telegramUserId, botSecret }),

  checkPendingLogin: (loginToken: string): Promise<AxiosResponse<{ approved: boolean; user?: User; accessToken?: string; refreshToken?: string; status?: string; sessionId?: string }>> =>
    api.post('/auth/check-pending-login', { loginToken }),
}


export const usersApi = {
  getProfile: (): Promise<AxiosResponse<User>> =>
    api.get('/users/me'),

  updateProfile: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }): Promise<AxiosResponse<{ message: string }>> =>
    api.put('/users/me/password', data),

  getUserScripts: (): Promise<AxiosResponse<Script[]>> =>
    api.get('/users/me/scripts'),

  getUserStats: (): Promise<AxiosResponse<{ totalScripts: number; runningScripts: number; totalDeployments: number }>> =>
    api.get('/users/me/stats'),

  linkTelegram: (data: LinkTelegramData): Promise<AxiosResponse<User>> =>
    api.post('/users/me/telegram/link', data),

  unlinkTelegram: (): Promise<AxiosResponse<User>> =>
    api.post('/users/me/telegram/unlink'),


  toggleTwoFactor: (enabled: boolean): Promise<AxiosResponse<User | { requiresConfirmation: boolean; message: string; actionToken: string }>> =>
    api.post('/users/me/two-factor/toggle', { enabled }),

  checkPendingAction: (actionToken: string): Promise<AxiosResponse<{ approved: boolean; status?: string; user?: User }>> =>
    api.get(`/users/me/pending-action/check?actionToken=${actionToken}`),

  getUserSessions: (): Promise<AxiosResponse<any[]>> =>
    api.get('/users/me/sessions'),

  revokeSession: (sessionId: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/users/me/sessions/${sessionId}`),

  revokeAllOtherSessions: (refreshToken: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/users/me/sessions/revoke-all', { refreshToken }),
}


export const scriptsApi = {
  getScripts: (): Promise<AxiosResponse<Script[]>> =>
    api.get('/scripts'),

  getScript: (id: string): Promise<AxiosResponse<Script>> =>
    api.get(`/scripts/${id}`),

  getUserScriptAccess: (id: string): Promise<AxiosResponse<{
    canView: boolean;
    canStart: boolean;
    canStop: boolean;
    canRestart: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
    isOwner: boolean;
  }>> =>
    api.get(`/scripts/${id}/access`),

  createScript: (data: CreateScriptData): Promise<AxiosResponse<Script>> =>
    api.post('/scripts', data),

  deployScript: (id: string, data: DeployScriptData): Promise<AxiosResponse<{ deployment: Deployment; job: JobStatus }>> =>
    api.post(`/scripts/${id}/deploy`, data),

  startScript: (id: string): Promise<AxiosResponse<{ message: string; job: JobStatus }>> =>
    api.post(`/scripts/${id}/start`),

  stopScript: (id: string): Promise<AxiosResponse<{ message: string; job: JobStatus }>> =>
    api.post(`/scripts/${id}/stop`),

  restartScript: (id: string): Promise<AxiosResponse<{ message: string; job: JobStatus }>> =>
    api.post(`/scripts/${id}/restart`),

  getScriptLogs: (id: string, lines: number = 200): Promise<AxiosResponse<{ logs: string }>> =>
    api.get(`/scripts/${id}/logs?lines=${lines}`),

  clearScriptLogs: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/scripts/${id}/logs`),

  getScriptStatus: (id: string): Promise<AxiosResponse<{ scriptId: string; status: string; processInfo?: any; error?: string }>> =>
    api.get(`/scripts/${id}/status`),

  deleteScript: (id: string): Promise<AxiosResponse<{ message: string; job: JobStatus }>> =>
    api.delete(`/scripts/${id}`),

  grantScriptAccess: (scriptId: string, data: { userId: string; permissions: any }): Promise<AxiosResponse<any>> =>
    api.post(`/scripts/${scriptId}/access`, data),

  revokeScriptAccess: (scriptId: string, userId: string): Promise<AxiosResponse<any>> =>
    api.delete(`/scripts/${scriptId}/access/${userId}`),

  getScriptAccessList: (scriptId: string): Promise<AxiosResponse<any[]>> =>
    api.get(`/scripts/${scriptId}/access-list`),

  searchUsers: (query: string): Promise<AxiosResponse<User[]>> => {
    return api.get(`/scripts/search-users?q=${encodeURIComponent(query)}`);
  },

  getJobStatus: (jobId: string): Promise<AxiosResponse<JobStatus & { type: string }>> =>
    api.get(`/scripts/jobs/${jobId}/status`),


  getScriptSettings: (scriptId: string): Promise<AxiosResponse<ScriptSettings>> =>
    api.get(`/scripts/${scriptId}/settings`),

  updateScriptSettings: (scriptId: string, settings: any): Promise<AxiosResponse<ScriptSettings>> =>
    api.put(`/scripts/${scriptId}/settings`, settings),

  getScriptEnvFile: (scriptId: string): Promise<AxiosResponse<{ content: string }>> =>
    api.get(`/scripts/${scriptId}/env`),

  updateScriptEnvFile: (scriptId: string, content: string): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/scripts/${scriptId}/env`, { content }),

  toggleAutoUpdate: (scriptId: string, autoUpdate: boolean): Promise<AxiosResponse<Script>> =>
    api.put(`/scripts/${scriptId}/auto-update`, { autoUpdate }),

  freezeScript: (scriptId: string): Promise<AxiosResponse<{ message: string; script: Script }>> =>
    api.post(`/scripts/${scriptId}/freeze`),

  unfreezeScript: (scriptId: string): Promise<AxiosResponse<{ message: string; script: Script }>> =>
    api.post(`/scripts/${scriptId}/unfreeze`),
}

export const newsApi = {
  getNews: (query: {
    page?: number;
    limit?: number;
    published?: boolean;
    featured?: boolean;
    search?: string
  }): Promise<AxiosResponse<{ news: News[]; pagination: any }>> => {
    const params = new URLSearchParams()
    if (query.page) params.append('page', query.page.toString())
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.published !== undefined) params.append('published', query.published.toString())
    if (query.featured !== undefined) params.append('featured', query.featured.toString())
    if (query.search) params.append('search', query.search)

    return api.get(`/news?${params.toString()}`)
  },

  getNewsById: (idOrSlug: string): Promise<AxiosResponse<News>> =>
    api.get(`/news/${idOrSlug}`),

  getFeaturedNews: (limit?: number): Promise<AxiosResponse<News[]>> => {
    const params = limit ? `?limit=${limit}` : ''
    return api.get(`/news/featured${params}`)
  },

  getLatestNews: (limit?: number): Promise<AxiosResponse<News[]>> => {
    const params = limit ? `?limit=${limit}` : ''
    return api.get(`/news/latest${params}`)
  },

  getNewsStats: (id: string): Promise<AxiosResponse<{ totalViews: number; uniqueViews: number; recentViews: number }>> =>
    api.get(`/news/${id}/stats`),
}


export const adminApi = {

  checkAccess: (): Promise<AxiosResponse<{ hasAccess: boolean; user: User }>> =>
    api.get('/admin/check-access'),

  getUsers: (page: number = 1, limit: number = 20, search?: string): Promise<AxiosResponse<PaginatedResponse<User>>> => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (search && search.trim()) {
      params.append('search', search.trim())
    }
    return api.get(`/admin/users?${params.toString()}`)
  },

  getUser: (id: string): Promise<AxiosResponse<User>> =>
    api.get(`/admin/users/${id}`),

  toggleUserBlock: (id: string): Promise<AxiosResponse<User>> =>
    api.put(`/admin/users/${id}/block`),

  changeUserRole: (id: string, role: string): Promise<AxiosResponse<User>> =>
    api.put(`/admin/users/${id}/role`, { role }),

  changeUserPassword: (id: string, data: { newPassword: string; reason: string }): Promise<AxiosResponse<User>> =>
    api.put(`/admin/users/${id}/password`, data),

  getUserScripts: (userId: string): Promise<AxiosResponse<Script[]>> =>
    api.get(`/admin/users/${userId}/scripts`),

  createUser: (data: { email: string; username: string; password: string; role?: string }): Promise<AxiosResponse<User>> =>
    api.post('/admin/users', data),


  getScripts: (page: number = 1, limit: number = 20, search?: string): Promise<AxiosResponse<PaginatedResponse<Script>>> => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (search && search.trim()) {
      params.append('search', search.trim())
    }
    return api.get(`/admin/scripts?${params.toString()}`)
  },

  issueScript: (id: string, data: { userId: string; serverId: string; expiryDays: number }): Promise<AxiosResponse<Script>> =>
    api.post(`/admin/scripts/${id}/issue`, data),

  revokeScript: (id: string): Promise<AxiosResponse<{ message: string; job: JobStatus }>> =>
    api.post(`/admin/scripts/${id}/revoke`),

  extendScript: (id: string, data: { days: number | null }): Promise<AxiosResponse<Script>> =>
    api.post(`/admin/scripts/${id}/extend`, data),

  updateScriptName: (id: string, name: string): Promise<AxiosResponse<Script>> =>
    api.put(`/admin/scripts/${id}/name`, { name }),

  updateScriptOwner: (id: string, ownerId: string): Promise<AxiosResponse<Script>> =>
    api.put(`/admin/scripts/${id}/owner`, { ownerId }),

  getServerScriptsStats: (serverId: string): Promise<AxiosResponse<{ total: number; byType: { CUSTOM: number; CYBER_LEAGUE: number; WEEKLY_CUP: number; ALLIANCE_BOT: number } }>> =>
    api.get(`/admin/servers/${serverId}/scripts-stats`),

  getServers: (): Promise<AxiosResponse<Server[]>> =>
    api.get('/admin/servers'),

  createServer: (data: { name: string; host: string; port?: number; sshUser?: string; keyId?: string }): Promise<AxiosResponse<Server>> =>
    api.post('/admin/servers', data),

  testServerConnection: (id: string): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.post(`/admin/servers/${id}/test-connection`),

  getServerKeys: (): Promise<AxiosResponse<Server[]>> =>
    api.get('/admin/server-keys'),

  createServerKey: (data: { label: string; privateKey: string; publicKey?: string }): Promise<AxiosResponse<Server>> =>
    api.post('/admin/server-keys', data),

  updateServerKey: (id: string, data: { label?: string; privateKey?: string; publicKey?: string }): Promise<AxiosResponse<any>> =>
    api.put(`/admin/server-keys/${id}`, data),

  deleteServerKey: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/server-keys/${id}`),

  updateServer: (id: string, data: { name?: string; host?: string; port?: number; sshUser?: string; keyId?: string }): Promise<AxiosResponse<Server>> =>
    api.put(`/admin/servers/${id}`, data),

  deleteServer: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/servers/${id}`),

  getAuditLogs: (
    page: number = 1,
    limit: number = 50,
    actionType?: string,
    userId?: string,
  ): Promise<AxiosResponse<PaginatedResponse<AuditLog>>> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (actionType) params.append('actionType', actionType);
    if (userId) params.append('userId', userId);
    return api.get(`/admin/audit-logs?${params.toString()}`);
  },

  getSystemStats: (): Promise<AxiosResponse<SystemStats>> =>
    api.get('/admin/stats'),

  getServerStats: (): Promise<AxiosResponse<any>> =>
    api.get('/admin/server-stats', { timeout: 15000 }),

  getQueueStats: (): Promise<AxiosResponse<any>> =>
    api.get('/admin/queues/stats'),

  getQueueJobs: (
    queueName: 'deployment' | 'script' | 'expiry',
    state?: string,
    limit?: number,
  ): Promise<AxiosResponse<any[]>> => {
    const params = new URLSearchParams();
    if (state) params.append('state', state);
    if (limit) params.append('limit', limit.toString());
    return api.get(`/admin/queues/${queueName}/jobs?${params.toString()}`);
  },

  clearQueue: (
    queueName: 'deployment' | 'script' | 'expiry',
    states?: string[],
  ): Promise<AxiosResponse<{ message: string; removed: number }>> =>
    api.post(`/admin/queues/${queueName}/clear`, { states }),

  clearAllQueues: (): Promise<AxiosResponse<{
    removed: {
      deployment: number;
      script: number;
      expiry: number;
      total: number;
    };
    message: string;
  }>> =>
    api.post('/admin/queues/clear'),

  getNews: (page: number = 1, limit: number = 20): Promise<AxiosResponse<{ news: News[]; pagination: any }>> =>
    api.get(`/admin/news?page=${page}&limit=${limit}`),

  getNewsById: (id: string): Promise<AxiosResponse<News>> =>
    api.get(`/admin/news/${id}`),

  createNews: (data: CreateNewsData): Promise<AxiosResponse<News>> =>
    api.post('/admin/news', data),

  updateNews: (id: string, data: UpdateNewsData): Promise<AxiosResponse<News>> =>
    api.put(`/admin/news/${id}`, data),

  deleteNews: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/news/${id}`),

  getScheduledTasks: (): Promise<AxiosResponse<any[]>> =>
    api.get('/admin/scheduled-tasks'),

  getScheduledTask: (id: string): Promise<AxiosResponse<any>> =>
    api.get(`/admin/scheduled-tasks/${id}`),

  createScheduledTask: (data: any): Promise<AxiosResponse<any>> =>
    api.post('/admin/scheduled-tasks', data),

  updateScheduledTask: (id: string, data: any): Promise<AxiosResponse<any>> =>
    api.put(`/admin/scheduled-tasks/${id}`, data),

  deleteScheduledTask: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/scheduled-tasks/${id}`),

  runScheduledTask: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/admin/scheduled-tasks/${id}/run`),
}

export const sshApi = {
  testConnection: (data: { serverId: string }): Promise<AxiosResponse<{ success: boolean; message: string }>> =>
    api.post('/ssh/test-connection', data),

  listFiles: (serverId: string, path?: string): Promise<AxiosResponse<any[]>> => {
    const params = new URLSearchParams();
    params.append('serverId', serverId);
    if (path) params.append('path', path);
    return api.get(`/ssh/files?${params.toString()}`);
  },

  createDirectory: (data: { serverId: string; path: string }): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/ssh/directory', data),

  deleteFile: (data: { serverId: string; path: string }): Promise<AxiosResponse<{ message: string }>> =>
    api.delete('/ssh/file', { data }),

  uploadFile: (serverId: string, path: string, file: File): Promise<AxiosResponse<{ message: string; path: string }>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('serverId', serverId);
    formData.append('path', path);
    return api.post('/ssh/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  downloadFile: (serverId: string, path: string): Promise<Blob> => {
    return api.get(`/ssh/download?serverId=${encodeURIComponent(serverId)}&path=${encodeURIComponent(path)}`, {
      responseType: 'blob',
    }).then(response => response.data);
  },

  executeCommand: (data: { serverId: string; command: string; cwd?: string }): Promise<AxiosResponse<{ stdout: string; stderr: string; code: number; success: boolean }>> =>
    api.post('/ssh/execute-command', data),
}

export default api
