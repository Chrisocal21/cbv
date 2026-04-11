export type StaffPersona = 'marco' | 'celeste' | 'nadia'

export const STAFF_PERSONAS: Record<StaffPersona, { name: string; role: string }> = {
  marco:   { name: 'Marco',   role: 'Executive Chef' },
  celeste: { name: 'Céleste', role: 'Pastry & Baking Lead' },
  nadia:   { name: 'Nadia',   role: 'Dietary & Wellness' },
}

export function isStaffPersona(value: string | null | undefined): value is StaffPersona {
  return value === 'marco' || value === 'celeste' || value === 'nadia'
}
