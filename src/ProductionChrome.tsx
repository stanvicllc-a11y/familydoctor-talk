import { Check, ChevronDown, Home, ShoppingBag, Stethoscope, User, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'

export type ChromePatient = {
  id: string
  isPrimary: boolean
  name: string
  code: string
  relationship?: string
}

type NavKey = 'home' | 'consult' | 'orders' | 'account'

const NAV_ITEMS: Array<{
  id: NavKey
  label: string
  icon: ReactNode
}> = [
  { id: 'home', label: 'Home', icon: <Home size={21} aria-hidden="true" /> },
  { id: 'consult', label: 'Consult', icon: <Stethoscope size={21} aria-hidden="true" /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingBag size={21} aria-hidden="true" /> },
  { id: 'account', label: 'Account', icon: <User size={21} aria-hidden="true" /> },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function PatientSwitcherModal({
  activeId,
  members,
  onClose,
  onSwitch,
}: {
  activeId: string
  members: ChromePatient[]
  onClose: () => void
  onSwitch: (memberId: string) => void
}) {
  return (
    <div className="patient-switcher-modal" data-testid="patient-switcher-modal">
      <button
        type="button"
        className="patient-switcher-backdrop"
        onClick={onClose}
        aria-label="Close patient switcher"
      />
      <div className="patient-switcher-card">
        <div className="patient-switcher-head">
          <span>Switch patient</span>
          <button type="button" className="patient-switcher-close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="patient-switcher-list">
          {members.map((patient) => {
            const active = patient.id === activeId
            return (
              <button
                key={patient.id}
                type="button"
                className={`patient-option ${active ? 'active' : ''}`}
                onClick={() => {
                  onSwitch(patient.id)
                  onClose()
                }}
              >
                <span className="patient-option-avatar">{initials(patient.name)}</span>
                <span className="patient-option-copy">
                  <span>{patient.isPrimary ? `Self - ${patient.name}` : patient.name}</span>
                  <span>{patient.code}</span>
                </span>
                {active ? <Check size={17} aria-label="Selected" /> : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ProductionChrome({
  children,
  members,
  selectedId,
  activeNav,
  onSwitchPatient,
}: {
  children: ReactNode
  members: ChromePatient[]
  selectedId: string
  activeNav: NavKey
  onSwitchPatient: (memberId: string) => void
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const selected = members.find((member) => member.id === selectedId) || members[0]
  const hasDependents = members.some((member) => !member.isPrimary)

  return (
    <div className="production-chrome">
      <div className="global-header-compact" data-testid="global-header-compact">
        <button type="button" className="role-switcher-trigger" aria-label="Open role switcher">
          <span>P</span>
          <strong>Patient</strong>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      <header className="patient-context-banner" data-testid="patient-context-banner">
        <span className="patient-avatar">{initials(selected.name)}</span>
        {hasDependents ? (
          <button
            type="button"
            className="patient-context-trigger"
            onClick={() => setSwitcherOpen(true)}
            aria-label="Open patient switcher"
            data-testid="patient-context-switch-trigger"
          >
            <span>
              <span>{selected.name}</span>
              <ChevronDown size={20} aria-hidden="true" />
            </span>
            {selected.code ? <small>{selected.code.startsWith('MRN-') ? selected.code : `MRN: ${selected.code}`}</small> : null}
          </button>
        ) : (
          <span className="patient-context-static">
            <span>{selected.name}</span>
            {selected.code ? <small>{selected.code.startsWith('MRN-') ? selected.code : `MRN: ${selected.code}`}</small> : null}
          </span>
        )}
      </header>

      <div className="chrome-content" data-testid="chrome-content">
        {children}
      </div>

      <nav className="patient-bottom-nav" data-testid="patient-bottom-nav">
        <div>
          {NAV_ITEMS.map((item) => {
            const active = item.id === activeNav
            return (
              <button key={item.id} type="button" className={active ? 'active' : ''}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {switcherOpen ? (
        <PatientSwitcherModal
          activeId={selected.id}
          members={members}
          onClose={() => setSwitcherOpen(false)}
          onSwitch={onSwitchPatient}
        />
      ) : null}
    </div>
  )
}
