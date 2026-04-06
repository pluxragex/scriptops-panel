export interface User {
  id: string
  email: string
  username: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  isBlocked: boolean
  emailVerified: boolean
  telegramUserId?: number | null
  twoFactorEnabled?: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    scripts: number
  }
}

export interface Session {
  id: string
  userId: string
  tokenHash: string
  ipAddress?: string | null
  userAgent?: string | null
  deviceInfo?: string | null
  location?: string | null
  createdAt: string
  lastActivityAt: string
  expiresAt: string
}

export interface Script {
  id: string
  name: string
  description?: string
  type: 'CUSTOM' | 'CYBER_LEAGUE' | 'WEEKLY_CUP' | 'ALLIANCE_BOT'
  repoUrl?: string
  uploadedPath?: string
  ownerId: string
  serverId: string
  pathOnServer: string
  pm2Name: string
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'ERROR' | 'UNKNOWN' | 'EXPIRED'
  pid?: number
  uptime?: number
  version?: string
  expiryDate?: string
  frozenAt?: string
  frozenUntil?: string
  ownerFrozenOnce?: boolean
  autoUpdate?: boolean
  createdAt: string
  updatedAt: string
  server: {
    id: string
    name: string
    host: string
  }
  owner?: {
    id: string
    username: string
    email: string
  }
  settings?: ScriptSettings
  _count?: {
    deployments: number
  }
}

export interface Server {
  id: string
  name: string
  host: string
  port: number
  sshUser: string
  authMethod: 'KEY' | 'PASSWORD'
  keyId?: string
  createdAt: string
  updatedAt: string
  note?: string
  isActive: boolean
  key?: {
    id: string
    label: string
  }
  _count?: {
    scripts: number
  }
}

export interface Deployment {
  id: string
  scriptId: string
  type: 'UPLOAD' | 'GIT_PULL' | 'MANUAL'
  version?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  details?: any
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface AuditLog {
  id: string
  actorId: string
  actionType: string
  targetScriptId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
  actor: {
    id: string
    username: string
    email: string
  }
  targetScript?: {
    id: string
    name: string
  }
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface TelegramLoginData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  hash: string
  auth_date: number
}

export interface LinkTelegramData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  hash: string
  auth_date: number
}


export interface CreateScriptData {
  name: string
  description?: string
  type: 'CUSTOM' | 'CYBER_LEAGUE' | 'WEEKLY_CUP' | 'ALLIANCE_BOT'
  serverId: string
  autoUpdate?: boolean
}

export interface ScriptSettings {
  id: string
  scriptId: string
  botToken?: string
  cyberLeagueSettings?: CyberLeagueSettings
  weeklyCupSettings?: WeeklyCupSettings
  familyBotSettings?: FamilyBotSettings
  createdAt: string
  updatedAt: string
}

export interface CyberLeagueSettings {
  servers: CyberLeagueServer[]
}

export interface CyberLeagueServer {
  id: string
  name: string
  channelId: string
  color: string
}

export interface WeeklyCupSettings {
  newsChannels: WeeklyCupNewsChannel[]
  guildTag: string
  newsChannelId: string
  registrationRoles: string[]
}

export interface WeeklyCupNewsChannel {
  id: string
  channelId: string
  serverName: string
}

export interface FamilyBotSettings {
  familyCount: number
  guildId: string
  roles: FamilyBotRole[]
  familyGuilds: FamilyBotGuild[]
}

export interface FamilyBotRole {
  id: string
  roleId: string
  name: string
}

export interface FamilyBotGuild {
  id: string
  guildId: string
  name: string
  requiredRoles: string[]
}

export interface DeployScriptData {
  type: 'UPLOAD' | 'GIT_PULL' | 'MANUAL'
  filePath?: string
  repoUrl?: string
  version?: string
}

export interface JobStatus {
  id: string
  data: any
  progress: number
  state: string
  returnvalue?: any
  failedReason?: string
}

export interface SystemStats {
  users: {
    total: number
    active: number
    blocked: number
  }
  scripts: {
    total: number
    running: number
  }
  servers: {
    total: number
    active: number
  }
  deployments: {
    total: number
  }
  activity: {
    recentLogs: number
  }
}


export interface News {
  id: string
  title: string
  content: string
  excerpt?: string
  imageUrl?: string
  videoUrl?: string
  slug: string
  isPublished: boolean
  isFeatured: boolean
  priority: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
  author: {
    id: string
    username: string
    email?: string
  }
  _count: {
    views: number
  }
}

export interface CreateNewsData {
  title: string
  content: string
  excerpt?: string
  imageUrl?: string
  videoUrl?: string
  isPublished?: boolean
  isFeatured?: boolean
  priority?: number
}

export interface UpdateNewsData extends Partial<CreateNewsData> {}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
