import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '@/services/authService'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'employee' | 'manager'
  avatar?: string
  employeeId?: string
  username?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  loginTimestamp: number | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  checkSessionExpiry: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      loginTimestamp: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authService.login(username, password)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            loginTimestamp: Date.now()
          })
          toast.success(`Welcome back, ${response.user.name}!`)
        } catch (error: any) {
          set({ isLoading: false })
          toast.error(error.message || 'Login failed')
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loginTimestamp: null
        })
        toast.success('Logged out successfully')
      },

      updateUser: (updatedUser: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null
        }))
      },

      checkSessionExpiry: () => {
        const state = get()
        if (!state.loginTimestamp) return true

        const twentyFourHours = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        const now = Date.now()
        const isExpired = now - state.loginTimestamp > twentyFourHours

        if (isExpired) {
          state.logout()
          toast.error('Session expired. Please login again.')
        }

        return isExpired
      }
    }),
    {
      name: 'auth-storage',
      // pahle  ZUSTAND storage auth in local which create login issue now i clear it with session storage 
      
      // Use sessionStorage instead of localStorage
      // This will clear the session when the browser tab is closed
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        // perfect it make sense all done 
        // agar auth mmei kuch issue aata hai to mai local storage ko bhi clear kar dunga
        removeItem: (name) => {
          sessionStorage.removeItem(name)
        }
      }
    }
  )
)