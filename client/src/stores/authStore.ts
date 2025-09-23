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
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authService.login(username, password)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
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
          isAuthenticated: false
        })
        toast.success('Logged out successfully')
      },

      updateUser: (updatedUser: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null
        }))
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)