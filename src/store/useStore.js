import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // --- APP STATE ---
      isMemberFeatureEnabled: true,
      pointsRatio: 10000, // Rp 10.000 = 1 Point
      pointsValue: 1000,  // 1 Point = Rp 1.000
      
      // --- DATA ---
      menus: [
        { id: 1, name: 'Siomay Ayam', price: 15000, category: 'Dimsum Steamed' },
        { id: 2, name: 'Hakau Udang', price: 18000, category: 'Dimsum Steamed' },
        { id: 3, name: 'Pangsit Goreng', price: 12000, category: 'Dimsum Fried' },
        { id: 4, name: 'Bakpao Telur Asin', price: 20000, category: 'Bakpao' },
      ],
      members: [
        { id: 'M001', name: 'Budi Santoso', phone: '08123456789', points: 50 },
        { id: 'M002', name: 'Siti Aminah', phone: '08987654321', points: 25 },
      ],
      transactions: [],

      // --- ACTIONS: SETTINGS ---
      toggleMemberFeature: () => set((state) => ({ 
        isMemberFeatureEnabled: !state.isMemberFeatureEnabled 
      })),
      setPointsRatio: (ratio) => set({ pointsRatio: ratio }),
      setPointsValue: (value) => set({ pointsValue: value }),

      // --- ACTIONS: MENU ---
      addMenu: (menu) => set((state) => ({ 
        menus: [...state.menus, { ...menu, id: Date.now() }] 
      })),
      updateMenu: (id, updatedMenu) => set((state) => ({
        menus: state.menus.map(m => m.id === id ? { ...m, ...updatedMenu } : m)
      })),
      deleteMenu: (id) => set((state) => ({
        menus: state.menus.filter(m => m.id !== id)
      })),

      // --- ACTIONS: MEMBER ---
      addMember: (member) => set((state) => ({
        members: [...state.members, { ...member, points: 0 }]
      })),
      updateMemberPoints: (memberId, pointsToAdd, pointsToRemove = 0) => set((state) => ({
        members: state.members.map(m => 
          m.id === memberId 
            ? { ...m, points: Math.max(0, m.points + pointsToAdd - pointsToRemove) } 
            : m
        )
      })),

      // --- ACTIONS: TRANSACTION ---
      addTransaction: (transaction) => {
        const id = Date.now()
        const date = new Date().toISOString()
        
        set((state) => ({
          transactions: [...state.transactions, { ...transaction, id, date }]
        }))

        // Update member points if member is involved
        if (transaction.memberId) {
          const pointsEarned = Math.floor(transaction.total / get().pointsRatio)
          const pointsUsed = transaction.pointsUsed || 0
          get().updateMemberPoints(transaction.memberId, pointsEarned, pointsUsed)
        }
      },
    }),
    {
      name: 'dimsum-storage',
    }
  )
)