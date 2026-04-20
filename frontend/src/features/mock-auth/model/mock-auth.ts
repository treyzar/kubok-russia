export type AuthUser = {
  id: string
  name: string
  username: string
  email: string
  phone: string
  role: string
  balance: number
  accent: string
}

export type AuthLoginMethod = 'phone' | 'email'

type AuthRecord = AuthUser & {
  password: string
}

const STORAGE_KEY = 'kubok26.mock-auth.user'

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
    role: 'VIP игрок',
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
    role: 'VIP игрок',
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
    role: 'Эксперт демо',
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

  const authUser = toUser(foundUser)
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
    return JSON.parse(rawValue) as AuthUser
  } catch {
    storage?.removeItem(STORAGE_KEY)
    return null
  }
}

export function logoutMock(): void {
  const storage = getStorage()
  storage?.removeItem(STORAGE_KEY)
}

export function getMockPassword(username: string): string | null {
  const foundUser = MOCK_USERS.find((user) => user.username.toLowerCase() === username.trim().toLowerCase())
  return foundUser?.password ?? null
}
