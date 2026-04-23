export type UserRole = 'USER' | 'ADMIN'

export type AuthUser = {
  id: string
  name: string
  username: string
  email: string
  phone: string
  role: UserRole
  /** Free-text label shown in the profile dropdown (e.g. «VIP игрок»). */
  displayRole: string
  balance: number
  accent: string
}

export type AuthLoginMethod = 'phone' | 'email'

type AuthRecord = AuthUser & {
  password: string
}

const STORAGE_KEY = 'kubok26.mock-auth.user'
const BALANCE_FORMATTER = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Hard-coded admin emails (per ТЗ). */
const ADMIN_EMAILS: ReadonlySet<string> = new Set(['expert@stoloto-demo.ru'])

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(email.trim().toLowerCase())
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const MOCK_USERS: AuthRecord[] = [
  {
    id: 'vip-arina',
    name: 'Арина Христофорова',
    username: 'arina',
    email: 'arina@stoloto-demo.ru',
    phone: '+7 (916) 120-26-01',
    password: 'arina2026',
    role: 'USER',
    displayRole: 'VIP игрок',
    balance: 14200,
    accent: 'from-fuchsia-500 to-orange-400',
  },
  {
    id: 'vip-ivan',
    name: 'Иван Крылов',
    username: 'ivan',
    email: 'ivan@stoloto-demo.ru',
    phone: '+7 (926) 870-26-02',
    password: 'qwerty',
    role: 'USER',
    displayRole: 'VIP игрок',
    balance: 8700,
    accent: 'from-amber-500 to-red-500',
  },
  {
    id: 'analyst',
    name: 'Елизавета Демина',
    username: 'expert',
    email: 'expert@stoloto-demo.ru',
    phone: '+7 (905) 300-26-03',
    password: 'expert',
    role: 'ADMIN',
    displayRole: 'Администратор',
    balance: 30000,
    accent: 'from-cyan-500 to-blue-500',
  },
]

function toUser(record: AuthRecord): AuthUser {
  return {
    id: record.id,
    name: record.name,
    username: record.username,
    email: record.email,
    phone: record.phone,
    role: record.role,
    displayRole: record.displayRole,
    balance: record.balance,
    accent: record.accent,
  }
}

export function getMockUsers(): ReadonlyArray<AuthUser> {
  return MOCK_USERS.map(toUser)
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }
  if (digits.length === 10) {
    return `7${digits}`
  }
  return digits
}

export function loginWithMock(
  login: string,
  password: string,
  method: AuthLoginMethod = 'email',
): AuthUser | null {
  const normalizedLogin = login.trim().toLowerCase()

  const foundUser = MOCK_USERS.find((user) => {
    if (user.password !== password) {
      return false
    }

    if (method === 'phone') {
      return normalizePhone(user.phone) === normalizePhone(login) || user.username.toLowerCase() === normalizedLogin
    }

    return user.email.toLowerCase() === normalizedLogin || user.username.toLowerCase() === normalizedLogin
  })

  if (!foundUser) {
    return null
  }

  // Defence in depth: even if the mock list ever drifts, the hard-coded
  // ADMIN_EMAILS set is the single source of truth for admin status.
  const role: UserRole = isAdminEmail(foundUser.email) ? 'ADMIN' : foundUser.role

  const authUser = toUser({ ...foundUser, role })
  const storage = getStorage()
  storage?.setItem(STORAGE_KEY, JSON.stringify(authUser))
  return authUser
}

export function getStoredUser(): AuthUser | null {
  const storage = getStorage()
  const rawValue = storage?.getItem(STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as AuthUser
    // Migrate stored users from the previous schema where `role` was a free
    // text label and `displayRole` did not exist.
    if (parsed && (parsed.role !== 'USER' && parsed.role !== 'ADMIN')) {
      return {
        ...parsed,
        displayRole: typeof parsed.role === 'string' ? parsed.role : 'Игрок',
        role: isAdminEmail(parsed.email ?? '') ? 'ADMIN' : 'USER',
      }
    }
    if (!parsed.displayRole) {
      parsed.displayRole = parsed.role === 'ADMIN' ? 'Администратор' : 'Игрок'
    }
    return parsed
  } catch {
    storage?.removeItem(STORAGE_KEY)
    return null
  }
}

export function logoutMock(): void {
  const storage = getStorage()
  storage?.removeItem(STORAGE_KEY)
}

export function setStoredUser(user: AuthUser): void {
  const storage = getStorage()
  storage?.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function getMockPassword(username: string): string | null {
  const foundUser = MOCK_USERS.find((user) => user.username.toLowerCase() === username.trim().toLowerCase())
  return foundUser?.password ?? null
}

export function formatUserBalance(balance: number): string {
  return `${BALANCE_FORMATTER.format(balance)} STL`
}
