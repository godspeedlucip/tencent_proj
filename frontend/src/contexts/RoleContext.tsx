import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Role, UserInfo } from '../types'

interface RoleContextType {
  role: Role | null
  user: { id: string; name: string; department: string } | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: UserInfo) => void
  logout: () => void
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'))
  const [role, setRole] = useState<Role | null>(() => (sessionStorage.getItem('role') as Role) || null)
  const [user, setUser] = useState<{ id: string; name: string; department: string } | null>(() => {
    const stored = sessionStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback((newToken: string, newUser: UserInfo) => {
    sessionStorage.setItem('token', newToken)
    sessionStorage.setItem('role', newUser.role)
    sessionStorage.setItem('user', JSON.stringify(newUser.profile))
    setToken(newToken)
    setRole(newUser.role)
    setUser(newUser.profile)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('user')
    setToken(null)
    setRole(null)
    setUser(null)
  }, [])

  return (
    <RoleContext.Provider value={{ role, user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
