import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      users: [
        { username: 'kasir', password: 'kasir123', role: 'cashier' },
        { username: 'owner', password: 'owner123', role: 'owner' },
      ],
      currentUser: null,
      login: (username, password) => {
        const u = String(username || '').trim()
        const p = String(password || '')
        const user = get().users.find(x => x.username === u && x.password === p)
        if (!user) return false
        set({ currentUser: { username: user.username, role: user.role } })
        return true
      },
      logout: () => set({ currentUser: null }),

      shifts: [],
      openShiftId: null,
      openShift: (openingBalance) => {
        const opening = Number(openingBalance) || 0
        if (get().openShiftId) return null
        const id = Date.now()
        const openedAt = new Date().toISOString()
        set((state) => ({
          shifts: [...state.shifts, { id, openedAt, openingBalance: opening, closedAt: null, closingCash: null, cashSales: 0, qrisSales: 0, expectedCash: 0, difference: 0 }],
          openShiftId: id,
        }))
        return id
      },
      closeShift: (closingCash) => {
        const openShiftId = get().openShiftId
        if (!openShiftId) return null

        const closing = Number(closingCash) || 0
        const closedAt = new Date().toISOString()

        const shiftTransactions = get().transactions.filter(t => t.shiftId === openShiftId)
        const cashSales = shiftTransactions
          .filter(t => t.paymentMethod === 'Cash')
          .reduce((acc, t) => acc + (Number(t.total) || 0), 0)
        const qrisSales = shiftTransactions
          .filter(t => t.paymentMethod === 'QRIS')
          .reduce((acc, t) => acc + (Number(t.total) || 0), 0)

        const shift = get().shifts.find(s => s.id === openShiftId)
        const opening = Number(shift?.openingBalance) || 0
        const expectedCash = opening + cashSales
        const difference = closing - expectedCash

        set((state) => ({
          shifts: state.shifts.map(s => s.id === openShiftId
            ? { ...s, closedAt, closingCash: closing, cashSales, qrisSales, expectedCash, difference }
            : s
          ),
          openShiftId: null,
        }))

        return openShiftId
      },

      categories: ['Dimsum Steamed', 'Dimsum Fried', 'Bakpao', 'Minuman', 'Lainnya'],
      menus: [
        { id: 1, name: 'Siomay Ayam', price: 15000, hpp: 8000, category: 'Dimsum Steamed', addOnIds: [] },
        { id: 2, name: 'Hakau Udang', price: 18000, hpp: 10000, category: 'Dimsum Steamed', addOnIds: [] },
        { id: 3, name: 'Pangsit Goreng', price: 12000, hpp: 6500, category: 'Dimsum Fried', addOnIds: [] },
        { id: 4, name: 'Bakpao Telur Asin', price: 20000, hpp: 12000, category: 'Bakpao', addOnIds: [] },
      ],
      addOns: [
        { id: 101, name: 'Extra Saus', price: 2000, hpp: 700 },
        { id: 102, name: 'Extra Chili Oil', price: 3000, hpp: 1200 },
        { id: 103, name: 'Extra Mayonnaise', price: 2500, hpp: 1000 },
      ],
      transactions: [],

      addCategory: (categoryName) => set((state) => {
        const trimmed = String(categoryName || '').trim()
        if (!trimmed) return state
        if (state.categories.includes(trimmed)) return state
        return { categories: [...state.categories, trimmed] }
      }),
      updateCategory: (oldName, newName) => set((state) => {
        const next = String(newName || '').trim()
        const prev = String(oldName || '').trim()
        if (!prev || !next) return state
        if (prev === next) return state
        if (state.categories.includes(next)) return state

        return {
          categories: state.categories.map(c => c === prev ? next : c),
          menus: state.menus.map(m => m.category === prev ? { ...m, category: next } : m),
        }
      }),
      deleteCategory: (categoryName) => set((state) => {
        const name = String(categoryName || '').trim()
        if (!name) return state
        if (name === 'Lainnya') return state

        const nextCategories = state.categories.filter(c => c !== name)
        const ensureOthers = nextCategories.includes('Lainnya') ? nextCategories : [...nextCategories, 'Lainnya']

        return {
          categories: ensureOthers,
          menus: state.menus.map(m => m.category === name ? { ...m, category: 'Lainnya' } : m),
        }
      }),

      addMenu: (menu) => set((state) => ({ 
        categories: menu.category && !state.categories.includes(menu.category) ? [...state.categories, menu.category] : state.categories,
        menus: [
          ...state.menus,
          {
            ...menu,
            price: Number(menu.price) || 0,
            hpp: Number(menu.hpp) || 0,
            category: menu.category || 'Lainnya',
            addOnIds: menu.addOnIds || [],
            id: Date.now(),
          }
        ],
      })),
      updateMenu: (id, updatedMenu) => set((state) => ({
        categories: updatedMenu.category && !state.categories.includes(updatedMenu.category) ? [...state.categories, updatedMenu.category] : state.categories,
        menus: state.menus.map(m => m.id === id ? { ...m, ...updatedMenu, price: Number(updatedMenu.price) || 0, hpp: Number(updatedMenu.hpp) || 0, category: updatedMenu.category || 'Lainnya' } : m)
      })),
      deleteMenu: (id) => set((state) => ({
        menus: state.menus.filter(m => m.id !== id)
      })),

      addAddOn: (addOn) => set((state) => ({
        addOns: [...state.addOns, { ...addOn, price: Number(addOn.price) || 0, hpp: Number(addOn.hpp) || 0, id: Date.now() }]
      })),
      updateAddOn: (id, updatedAddOn) => set((state) => ({
        addOns: state.addOns.map(a => a.id === id ? { ...a, ...updatedAddOn, price: Number(updatedAddOn.price) || 0, hpp: Number(updatedAddOn.hpp) || 0 } : a)
      })),
      deleteAddOn: (id) => set((state) => ({
        addOns: state.addOns.filter(a => a.id !== id),
        menus: state.menus.map(m => ({
          ...m,
          addOnIds: (m.addOnIds || []).filter(addOnId => addOnId !== id),
        })),
      })),

      addTransaction: (transaction) => {
        const id = Date.now()
        const date = new Date().toISOString()

        set((state) => ({
          transactions: [...state.transactions, { ...transaction, id, date }]
        }))
      },
    }),
    {
      name: 'dimsum-storage',
    }
  )
)
