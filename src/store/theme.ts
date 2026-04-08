import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  set: (theme: Theme) => void
}

const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('whorl-theme') : null) as Theme | null
const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
const initial: Theme = saved || (prefersDark ? 'dark' : 'light')

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: initial,
  toggle: () => set((s) => {
    const next = s.theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('whorl-theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    return { theme: next }
  }),
  set: (theme) => {
    localStorage.setItem('whorl-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },
}))

// Apply initial theme
document.documentElement.classList.toggle('dark', initial === 'dark')
