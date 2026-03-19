import { create } from 'zustand'
import { nanoid } from 'nanoid'

const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ message, type = 'info', duration = 3000 }) => {
    const id = nanoid(6)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, duration)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export default useToastStore
