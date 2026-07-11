import type { ChromePatient } from './ProductionChrome'

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://familydoctor-backend-production.up.railway.app'

const DUMMY_PHONE = '+918888200005'
const DUMMY_OTP = '121212'
let dummyLoginPromise: Promise<VerifyOtpResponse> | null = null

type VerifyOtpResponse = {
  success?: boolean
  token?: string
  userId?: string
  name?: string
  mrn?: string
  code?: string
  role?: string
  roles?: string[]
  active_role?: string
  error?: string
}

type FamilyResponse = {
  self?: {
    id?: string
    full_name?: string | null
    code?: string | null
    gender?: string | null
    age?: number | null
    date_of_birth?: string | null
  }
  family_members?: Array<{
    id: string
    full_name: string
    code?: string | null
    relationship_type?: string
    gender?: string | null
    age?: number | null
    date_of_birth?: string | null
  }>
}

type ActivePatientResponse = {
  success?: boolean
  id?: string
  full_name?: string | null
  code?: string | null
  is_self?: boolean
}

async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
    credentials: 'include',
  })
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`)
  }
  return data
}

export async function loginDummyAccount() {
  await apiJson<{ success?: boolean; mocked?: boolean }>('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      mobile: DUMMY_PHONE,
      nmc_confirmed: true,
      terms_accepted: true,
    }),
  })

  const verified = await apiJson<VerifyOtpResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile: DUMMY_PHONE, otp: DUMMY_OTP }),
  })

  if (!verified.success || !verified.token) {
    throw new Error(verified.error || 'Dummy OTP verification failed')
  }

  localStorage.setItem('fd_token', verified.token)
  localStorage.setItem(
    'fd_user',
    JSON.stringify({
      id: verified.userId,
      name: verified.name || 'Test Patient',
      phone: DUMMY_PHONE,
      role: verified.role || 'PATIENT',
      mrn: verified.mrn,
      code: verified.code,
    }),
  )
  if (verified.roles?.length) localStorage.setItem('fd_roles', JSON.stringify(verified.roles))
  localStorage.setItem('fd_active_role', verified.active_role || verified.role || 'PATIENT')

  return verified
}

export function loginDummyAccountOnce() {
  if (!dummyLoginPromise) {
    dummyLoginPromise = loginDummyAccount().catch((error) => {
      dummyLoginPromise = null
      throw error
    })
  }
  return dummyLoginPromise
}

export async function fetchDummyPatients(token: string): Promise<{
  members: ChromePatient[]
  selectedId: string
}> {
  const [family, active] = await Promise.all([
    apiJson<FamilyResponse>('/api/patient/family', {
      headers: { Authorization: `Bearer ${token}` },
    }),
    apiJson<ActivePatientResponse>('/api/patient/me/active-patient', {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null),
  ])

  const ageFrom = (age?: number | null, dob?: string | null): number | undefined => {
    if (typeof age === 'number' && Number.isFinite(age)) return age
    if (dob) {
      const born = new Date(dob)
      if (!Number.isNaN(born.getTime())) {
        const now = new Date()
        let years = now.getFullYear() - born.getFullYear()
        const m = now.getMonth() - born.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < born.getDate())) years -= 1
        return years
      }
    }
    return undefined
  }
  const self: ChromePatient = {
    id: 'self',
    isPrimary: true,
    name: family.self?.full_name?.trim() || 'Test Patient',
    code: family.self?.code || '',
    gender: family.self?.gender || undefined,
    age: ageFrom(family.self?.age, family.self?.date_of_birth),
  }
  const familyMembers: ChromePatient[] = (family.family_members || []).map((member) => ({
    id: member.id,
    isPrimary: false,
    name: member.full_name,
    code: member.code || '',
    relationship: member.relationship_type,
    gender: member.gender || undefined,
    age: ageFrom(member.age, member.date_of_birth),
  }))
  const members = [self, ...familyMembers]
  const activeId =
    active?.success && active.id
      ? active.is_self
        ? 'self'
        : active.id
      : 'self'

  return {
    members,
    selectedId: members.some((member) => member.id === activeId) ? activeId : 'self',
  }
}

export { API_BASE, DUMMY_PHONE }
