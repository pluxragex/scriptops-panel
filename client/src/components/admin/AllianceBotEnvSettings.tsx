import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Bot, Hash, Users, Shield, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import { scriptsApi } from '../../services/api'
import LoadingSpinner from '../LoadingSpinner'
import { showErrorToast, showSuccessToast } from '../../lib/toast'

interface FamilyConfig {
  id: string
  name: string
  guildId: string
  requiredRoles: string[]
  allianceRoleId: string
}

interface AdminConfig {
  id: string
  name: string
  roleId: string
  permissions: string[]
}

interface AllianceBotEnvSettingsProps {
  scriptId: string
  onClose?: () => void
}

export default function AllianceBotEnvSettings({ scriptId, onClose }: AllianceBotEnvSettingsProps) {
  const [botToken, setBotToken] = useState('')
  const [allianceGuildId, setAllianceGuildId] = useState('')
  const [adminConfigs, setAdminConfigs] = useState<AdminConfig[]>([{ id: '1', name: 'Администратор 1', roleId: '', permissions: [] }])
  const [families, setFamilies] = useState<FamilyConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set())
  const [familiesInitialized, setFamiliesInitialized] = useState(false)
  const [collapsedAdmins, setCollapsedAdmins] = useState<Set<string>>(new Set())
  const [adminsInitialized, setAdminsInitialized] = useState(false)

  useEffect(() => {
    loadEnvSettings()
  }, [scriptId])


  useEffect(() => {
    if (families.length > 0 && !familiesInitialized) {
      const allFamilyIds = new Set(families.map(f => f.id))
      setCollapsedFamilies(allFamilyIds)
      setFamiliesInitialized(true)
    }
  }, [families, familiesInitialized])


  useEffect(() => {
    if (adminConfigs.length > 0 && !adminsInitialized) {
      const allAdminIds = new Set(adminConfigs.map(a => a.id))
      setCollapsedAdmins(allAdminIds)
      setAdminsInitialized(true)
    }
  }, [adminConfigs, adminsInitialized])

  const loadEnvSettings = async () => {
    try {
      const response = await scriptsApi.getScriptEnvFile(scriptId)
      const envContent = response.data.content

      if (envContent) {
        parseEnvContent(envContent)
      } else {

        setBotToken('')
        setAllianceGuildId('')
        const defaultAdminConfigs = [{ id: '1', name: 'Администратор 1', roleId: '', permissions: [] }]
        setAdminConfigs(defaultAdminConfigs)

        setAdminsInitialized(false)
        setCollapsedAdmins(new Set(['1']))
        setFamilies([
          {
            id: '1',
            name: 'Семья 1',
            guildId: '',
            requiredRoles: [''],
            allianceRoleId: ''
          }
        ])
      }
    } catch (error) {
      console.error('Ошибка загрузки .env файла:', error)
      showErrorToast('Ошибка загрузки настроек')
    } finally {
      setIsLoading(false)
    }
  }

  const parseEnvContent = (content: string) => {
    const lines = content.split('\n')
    let token = ''
    let allianceGuild = ''
    const adminConfigList: AdminConfig[] = []
    const familyList: FamilyConfig[] = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('TOKEN=')) {
        token = trimmedLine.split('=')[1] || ''
      } else if (trimmedLine.startsWith('SERVER_B_ID=')) {
        allianceGuild = trimmedLine.split('=')[1] || ''
      } else if (trimmedLine.startsWith('ADMIN_COUNT=')) {
        const adminCount = parseInt(trimmedLine.split('=')[1]) || 0

        for (let i = 1; i <= adminCount; i++) {
          const name = getEnvValue(lines, `ADMIN_${i}_NAME`) || `Администратор ${i}`
          const roleId = getEnvValue(lines, `ADMIN_${i}_ROLE_ID`)
          const permissionsStr = getEnvValue(lines, `ADMIN_${i}_PERMISSIONS`, '')

          if (roleId) {
            const permissions: string[] = []
            if (permissionsStr.includes('ALL')) {
              permissions.push('STATS', 'CLEAR')
            } else {
              if (permissionsStr.includes('STATS')) permissions.push('STATS')
              if (permissionsStr.includes('CLEAR')) permissions.push('CLEAR')
            }

            adminConfigList.push({
              id: i.toString(),
              name,
              roleId,
              permissions
            })
          }
        }
      } else if (trimmedLine.startsWith('ADMIN_ROLE_ID=')) {

        const adminRolesStr = trimmedLine.split('=')[1] || ''
        if (adminRolesStr.trim() && adminConfigList.length === 0) {
          const adminRoles = adminRolesStr.split(',').map(role => role.trim()).filter(role => role)
          adminRoles.forEach((roleId, index) => {
            adminConfigList.push({
              id: (index + 1).toString(),
              name: `Администратор ${index + 1}`,
              roleId,
              permissions: ['STATS', 'CLEAR']
            })
          })
        }
      } else if (trimmedLine.startsWith('FAMILIES_COUNT=')) {
        const count = parseInt(trimmedLine.split('=')[1]) || 0

        for (let i = 1; i <= count; i++) {
          const name = getEnvValue(lines, `FAMILY_${i}_NAME`) || `Семья ${i}`
          const guildId = getEnvValue(lines, `FAMILY_${i}_GUILD_ID`)
          const allianceRoleId = getEnvValue(lines, `FAMILY_${i}_ALLIANCE_ROLE_ID`)
          const rolesCount = parseInt(getEnvValue(lines, `FAMILY_${i}_ROLES_COUNT`)) || 0

          const requiredRoles: string[] = []
          for (let j = 1; j <= rolesCount; j++) {
            const roleId = getEnvValue(lines, `FAMILY_${i}_ROLE_${j}_ID`)
            if (roleId) {
              requiredRoles.push(roleId)
            }
          }

          if (guildId) {
            familyList.push({
              id: i.toString(),
              name,
              guildId,
              requiredRoles: requiredRoles.length > 0 ? requiredRoles : [''],
              allianceRoleId
            })
          }
        }
      }
    }

    setBotToken(token)
    setAllianceGuildId(allianceGuild)
    const finalAdminConfigs = adminConfigList.length > 0 ? adminConfigList : [{ id: '1', name: 'Администратор 1', roleId: '', permissions: [] }]
    setAdminConfigs(finalAdminConfigs)

    setAdminsInitialized(false)
    const allAdminIds = new Set(finalAdminConfigs.map(a => a.id))
    setCollapsedAdmins(allAdminIds)
    setFamilies(familyList.length > 0 ? familyList : [
      {
        id: '1',
        name: 'Семья 1',
        guildId: '',
        requiredRoles: [''],
        allianceRoleId: ''
      }
    ])
  }

  const getEnvValue = (lines: string[], key: string, defaultValue: string = ''): string => {
    for (const line of lines) {
      if (line.trim().startsWith(`${key}=`)) {
        return line.split('=')[1] || defaultValue
      }
    }
    return defaultValue
  }

  const getAdminDisplayName = (admin: AdminConfig, index: number): string => {
    return admin.name.trim() || `Администратор ${index}`
  }

  const generateEnvContent = (): string => {
    let content = `# Токен Discord бота союзки\n`
    content += `TOKEN=${botToken}\n\n`
    content += `# ID гильдии союзки\n`
    content += `SERVER_B_ID=${allianceGuildId}\n\n`
    content += `# Количество администраторов\n`
    const validAdmins = adminConfigs.filter(admin => admin.roleId.trim())
    content += `ADMIN_COUNT=${validAdmins.length}\n\n`

    validAdmins.forEach((admin, index) => {
      const adminName = admin.name.trim() || `Администратор ${index + 1}`
      content += `# Администратор ${index + 1}\n`
      content += `ADMIN_${index + 1}_NAME=${adminName}\n`
      content += `ADMIN_${index + 1}_ROLE_ID=${admin.roleId}\n`
      const permissionsStr = admin.permissions.length === 2 ? 'ALL' : admin.permissions.join(',')
      content += `ADMIN_${index + 1}_PERMISSIONS=${permissionsStr}\n\n`
    })

    content += `# Количество семей в союзе\n`
    content += `FAMILIES_COUNT=${families.length}\n\n`

    families.forEach((family, index) => {
      content += `# Настройки семьи ${index + 1}\n`
      content += `FAMILY_${index + 1}_NAME=${family.name}\n`
      content += `FAMILY_${index + 1}_GUILD_ID=${family.guildId}\n`
      content += `FAMILY_${index + 1}_ALLIANCE_ROLE_ID=${family.allianceRoleId}\n`
      content += `FAMILY_${index + 1}_ROLES_COUNT=${family.requiredRoles.filter(role => role.trim()).length}\n`

      family.requiredRoles.forEach((roleId, roleIndex) => {
        if (roleId.trim()) {
          content += `FAMILY_${index + 1}_ROLE_${roleIndex + 1}_ID=${roleId}\n`
        }
      })
      content += '\n'
    })

    return content
  }

  const handleSave = async () => {
    if (!botToken.trim()) {
      showErrorToast('Введите токен бота')
      return
    }

    if (!allianceGuildId.trim()) {
      showErrorToast('Введите ID гильдии союзки')
      return
    }

    const hasEmptyFamilies = families.some(f => !f.guildId.trim() || !f.allianceRoleId.trim())
    if (hasEmptyFamilies) {
      showErrorToast('Заполните ID гильдии и роли союзки для всех семей')
      return
    }

    const hasEmptyRoles = families.some(f => f.requiredRoles.every(role => !role.trim()))
    if (hasEmptyRoles) {
      showErrorToast('Укажите хотя бы одну роль для каждой семьи')
      return
    }

    setIsSaving(true)
    try {
      const envContent = generateEnvContent()
      await scriptsApi.updateScriptEnvFile(scriptId, envContent)
      showSuccessToast('Настройки сохранены')
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addFamily = () => {
    const newId = (families.length + 1).toString()
    setFamilies([...families, {
      id: newId,
      name: `Семья ${families.length + 1}`,
      guildId: '',
      requiredRoles: [''],
      allianceRoleId: ''
    }])
  }

  const removeFamily = (id: string) => {
    if (families.length > 1) {
      setFamilies(families.filter(f => f.id !== id))
    }
  }

  const updateFamily = (id: string, field: keyof FamilyConfig, value: string | string[]) => {
    setFamilies(families.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ))
  }

  const addRole = (familyId: string) => {
    setFamilies(families.map(f =>
      f.id === familyId
        ? { ...f, requiredRoles: [...f.requiredRoles, ''] }
        : f
    ))
  }

  const removeRole = (familyId: string, roleIndex: number) => {
    setFamilies(families.map(f =>
      f.id === familyId
        ? {
            ...f,
            requiredRoles: f.requiredRoles.filter((_, index) => index !== roleIndex)
          }
        : f
    ))
  }

  const updateRole = (familyId: string, roleIndex: number, value: string) => {
    setFamilies(families.map(f =>
      f.id === familyId
        ? {
            ...f,
            requiredRoles: f.requiredRoles.map((role, index) =>
              index === roleIndex ? value : role
            )
          }
        : f
    ))
  }

  const addAdmin = () => {
    const newId = (adminConfigs.length + 1).toString()
    const newAdmin = { id: newId, name: `Администратор ${adminConfigs.length + 1}`, roleId: '', permissions: [] }
    setAdminConfigs([...adminConfigs, newAdmin])

    setCollapsedAdmins(prev => {
      const newSet = new Set(prev)
      newSet.delete(newId)
      return newSet
    })
  }

  const removeAdmin = (adminId: string) => {
    if (adminConfigs.length > 1) {
      setAdminConfigs(adminConfigs.filter(admin => admin.id !== adminId))
    }
  }

  const updateAdminRole = (adminId: string, roleId: string) => {
    setAdminConfigs(adminConfigs.map(admin =>
      admin.id === adminId ? { ...admin, roleId } : admin
    ))
  }

  const updateAdminName = (adminId: string, name: string) => {
    setAdminConfigs(adminConfigs.map(admin =>
      admin.id === adminId ? { ...admin, name } : admin
    ))
  }

  const toggleAdminPermission = (adminId: string, permission: 'STATS' | 'CLEAR') => {
    setAdminConfigs(adminConfigs.map(admin => {
      if (admin.id === adminId) {
        const hasPermission = admin.permissions.includes(permission)
        if (hasPermission) {
          return { ...admin, permissions: admin.permissions.filter(p => p !== permission) }
        } else {
          return { ...admin, permissions: [...admin.permissions, permission] }
        }
      }
      return admin
    }))
  }

  const toggleAllPermissions = (adminId: string) => {
    setAdminConfigs(adminConfigs.map(admin => {
      if (admin.id === adminId) {
        if (admin.permissions.length === 2) {
          return { ...admin, permissions: [] }
        } else {
          return { ...admin, permissions: ['STATS', 'CLEAR'] }
        }
      }
      return admin
    }))
  }

  const toggleAdminCollapse = (adminId: string) => {
    setCollapsedAdmins(prev => {
      const newSet = new Set(prev)
      if (newSet.has(adminId)) {
        newSet.delete(adminId)
      } else {
        newSet.add(adminId)
      }
      return newSet
    })
  }

  const toggleFamilyCollapse = (familyId: string) => {
    setCollapsedFamilies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(familyId)) {
        newSet.delete(familyId)
      } else {
        newSet.add(familyId)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#dfdfdf]">
          Настройки Союзного бота
        </h3>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Bot className="h-5 w-5 text-[#a476ff]" />
          <h4 className="text-sm font-medium text-[#dfdfdf]">Токен Discord бота</h4>
        </div>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Введите токен бота"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#f3f3f398] hover:text-[#dfdfdf]"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-[#f3f3f398]">
          Токен бота для управления союзным сервером
        </p>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Shield className="h-5 w-5 text-[#a476ff]" />
          <h4 className="text-sm font-medium text-[#dfdfdf]">ID гильдии союзки</h4>
        </div>
        <input
          type="text"
          value={allianceGuildId}
          onChange={(e) => setAllianceGuildId(e.target.value)}
          placeholder="123456789012345678"
          className="input"
        />
        <p className="mt-2 text-xs text-[#f3f3f398]">
          ID Discord сервера союзки, где будут выдаваться роли
        </p>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-[#a476ff]" />
            <h4 className="text-sm font-medium text-[#dfdfdf]">Администраторы с правами доступа</h4>
          </div>
          <button
            onClick={addAdmin}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="h-4 w-4" />
            Добавить админа
          </button>
        </div>

        <div className="space-y-4">
          {adminConfigs.map((admin, index) => {
            const isCollapsed = collapsedAdmins.has(admin.id)
            const hasAllPermissions = admin.permissions.length === 2
            const displayName = getAdminDisplayName(admin, index + 1)
            return (
              <div key={admin.id} className="border border-[#ffffff10] rounded-lg p-4 bg-[#1a1a1a]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleAdminCollapse(admin.id)}
                      className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <h5 className="text-sm font-medium text-[#dfdfdf]">
                      {displayName}
                    </h5>
                    {hasAllPermissions && (
                      <span className="text-xs text-green-400">(Все права)</span>
                    )}
                  </div>
                  {adminConfigs.length > 1 && (
                    <button
                      onClick={() => removeAdmin(admin.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                          Название администратора
                        </label>
                        <input
                          type="text"
                          value={admin.name}
                          onChange={(e) => updateAdminName(admin.id, e.target.value)}
                          placeholder={`Администратор ${index + 1}`}
                          className="input text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                          ID роли администратора
                        </label>
                        <input
                          type="text"
                          value={admin.roleId}
                          onChange={(e) => updateAdminRole(admin.id, e.target.value)}
                          placeholder="123456789012345678"
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#f3f3f398] mb-2">
                        Права доступа
                      </label>
                      <div className="space-y-2">
                        <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          hasAllPermissions
                            ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                            : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                        }`}>
                          <input
                            type="checkbox"
                            checked={hasAllPermissions}
                            onChange={() => toggleAllPermissions(admin.id)}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                            hasAllPermissions
                              ? 'border-[#a476ff] bg-[#a476ff]'
                              : 'border-[#ffffff20]'
                          }`}>
                            {hasAllPermissions && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                          <span className="text-sm font-medium text-[#dfdfdf]">
                            Все права (статистика + очистка)
                          </span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            admin.permissions.includes('STATS') && !hasAllPermissions
                              ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                              : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                          } ${hasAllPermissions ? 'opacity-50' : ''}`}>
                            <input
                              type="checkbox"
                              checked={admin.permissions.includes('STATS')}
                              onChange={() => toggleAdminPermission(admin.id, 'STATS')}
                              disabled={hasAllPermissions}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                              admin.permissions.includes('STATS')
                                ? 'border-[#a476ff] bg-[#a476ff]'
                                : 'border-[#ffffff20]'
                            }`}>
                              {admin.permissions.includes('STATS') && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="text-sm font-medium text-[#dfdfdf]">
                              Статистика участников войса
                            </span>
                          </label>

                          <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                            admin.permissions.includes('CLEAR') && !hasAllPermissions
                              ? 'border-[#a476ff] bg-[#a476ff]/10 hover:bg-[#a476ff]/15'
                              : 'border-[#ffffff10] hover:border-[#ffffff20] bg-[#1a1a1a]'
                          } ${hasAllPermissions ? 'opacity-50' : ''}`}>
                            <input
                              type="checkbox"
                              checked={admin.permissions.includes('CLEAR')}
                              onChange={() => toggleAdminPermission(admin.id, 'CLEAR')}
                              disabled={hasAllPermissions}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors ${
                              admin.permissions.includes('CLEAR')
                                ? 'border-[#a476ff] bg-[#a476ff]'
                                : 'border-[#ffffff20]'
                            }`}>
                              {admin.permissions.includes('CLEAR') && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="text-sm font-medium text-[#dfdfdf]">
                              Очистка союзного канала
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-[#f3f3f398]">
          Настройте права доступа для каждого администратора. Можно выбрать все права или отдельные разрешения.
        </p>
      </div>

      <div className="bg-[#151515] border border-[#ffffff10] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-[#a476ff]" />
            <h4 className="text-sm font-medium text-[#dfdfdf]">Семьи в союзе</h4>
          </div>
          <button
            onClick={addFamily}
            className="btn btn-secondary btn-sm"
          >
            <Plus className="h-4 w-4" />
            Добавить семью
          </button>
        </div>

        <div className="space-y-4">
          {families.map((family) => {
            const isCollapsed = collapsedFamilies.has(family.id)
            return (
              <div key={family.id} className="border border-[#ffffff10] rounded-lg p-4 bg-[#1a1a1a]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleFamilyCollapse(family.id)}
                      className="text-[#f3f3f398] hover:text-[#dfdfdf] transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <h5 className="text-sm font-medium text-[#dfdfdf]">
                      {family.name}
                    </h5>
                  </div>
                  {families.length > 1 && (
                    <button
                      onClick={() => removeFamily(family.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                          Название семьи
                        </label>
                        <input
                          type="text"
                          value={family.name}
                          onChange={(e) => updateFamily(family.id, 'name', e.target.value)}
                          placeholder="Название семьи"
                          className="input text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                          ID гильдии семьи
                        </label>
                        <input
                          type="text"
                          value={family.guildId}
                          onChange={(e) => updateFamily(family.id, 'guildId', e.target.value)}
                          placeholder="123456789012345678"
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-xs font-medium text-[#f3f3f398] mb-1">
                        ID роли в союзке
                      </label>
                      <input
                        type="text"
                        value={family.allianceRoleId}
                        onChange={(e) => updateFamily(family.id, 'allianceRoleId', e.target.value)}
                        placeholder="123456789012345678"
                        className="input text-sm"
                      />
                      <p className="mt-1 text-xs text-[#f3f3f398]">
                        Роль, которая будет выдаваться в союзке при наличии ролей семьи
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-[#f3f3f398]">
                          Роли семьи (для прохода)
                        </label>
                        <button
                          onClick={() => addRole(family.id)}
                          className="text-[#a476ff] hover:text-[#8c5eff] text-xs flex items-center"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Добавить роль
                        </button>
                      </div>
                      <div className="space-y-2">
                        {family.requiredRoles.map((roleId, roleIndex) => (
                          <div key={roleIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={roleId}
                              onChange={(e) => updateRole(family.id, roleIndex, e.target.value)}
                              placeholder="ID роли"
                              className="input text-sm flex-1"
                            />
                            {family.requiredRoles.length > 1 && (
                              <button
                                onClick={() => removeRole(family.id, roleIndex)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-[#f3f3f398]">
                        Роли в семье, которые дают доступ к союзке
                      </p>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[#a476ff20] border border-[#a476ff40] rounded-md p-4">
        <div className="flex">
          <Hash className="h-5 w-5 text-[#a476ff] mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-[#dfdfdf]">
              Как работает союзный бот
            </h4>
            <div className="mt-2 text-sm text-[#f3f3f398]">
              <p>Бот автоматически управляет доступом к союзному серверу на основе ролей в семьях.</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>При входе в союзку проверяет наличие ролей семьи</li>
                <li>Выдает соответствующую роль в союзке</li>
                <li>Кикает пользователей без ролей семьи</li>
                <li>Отслеживает изменения ролей и автоматически обновляет доступ</li>
                <li>При выходе из семьи автоматически удаляет из союзки</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary btn-xs flex items-center"
        >
          {isSaving ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-1">Сохранение...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Сохранить</span>
            </>
          )}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-secondary btn-xs flex items-center"
            disabled={isSaving}
          >
            <span>Закрыть</span>
          </button>
        )}
      </div>
    </div>
  )
}
