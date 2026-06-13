import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Role } from '../types'

interface RoleContextType {
  role: Role
  user: { id: string; name: string; department: string } | null
  setRole: (role: Role, user?: { id: string; name: string; department: string }) => void
}

const RoleContext = createContext<RoleContextType>({
  role: 'intern',
  user: null,
  setRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('intern')
  const [user, setUser] = useState<{ id: string; name: string; department: string } | null>(null)

  const setRole = useCallback((newRole: Role, newUser?: { id: string; name: string; department: string }) => {
    setRoleState(newRole)
    if (newUser) setUser(newUser)
  }, [])

  return (
    <RoleContext.Provider value={{ role, user, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
