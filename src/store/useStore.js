import { create } from 'zustand'

const API_BASE_URL = String(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '')

const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const url = typeof path === 'string' && /^https?:\/\//i.test(path)
    ? path
    : API_BASE_URL
      ? `${API_BASE_URL}${path}`
      : path

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const rawText = await res.text().catch(() => '')
  const data = rawText ? (() => {
    try {
      return JSON.parse(rawText)
    } catch {
      return { rawText }
    }
  })() : {}
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP_${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const useStore = create((set, get) => ({
  currentUser: null,
  isAuthLoading: true,
  isDataLoading: false,

  categories: [],
  menus: [],
  addOns: [],
  transactions: [],
  shifts: [],
  openShiftId: null,
  users: [],
  coupons: [],
  receiptSettings: { headerText: '', footerText: '' },
  pendingOrders: [],

  hydrateFromBootstrap: (data) => {
    set({
      categories: data.categories || [],
      menus: data.menus || [],
      addOns: data.addOns || [],
      transactions: data.transactions || [],
      shifts: data.shifts || [],
      openShiftId: data.openShiftId ?? null,
      users: data.users || [],
      coupons: data.coupons || [],
      receiptSettings: data.receiptSettings || { headerText: '', footerText: '' },
      pendingOrders: data.pendingOrders || [],
    })
  },

  init: async () => {
    set({ isAuthLoading: true })
    try {
      const { user } = await apiRequest('/api/auth/me')
      if (!user) {
        set({
          currentUser: null,
          isAuthLoading: false,
          categories: [],
          menus: [],
          addOns: [],
          transactions: [],
          shifts: [],
          openShiftId: null,
          users: [],
          coupons: [],
          receiptSettings: { headerText: '', footerText: '' },
          pendingOrders: [],
        })
        return
      }
      set({ currentUser: user, isDataLoading: true })
      const data = await apiRequest('/api/bootstrap')
      get().hydrateFromBootstrap(data)
      set({ currentUser: data.user || user, isAuthLoading: false, isDataLoading: false })
    } catch {
      set({
        currentUser: null,
        isAuthLoading: false,
        isDataLoading: false,
        categories: [],
        menus: [],
        addOns: [],
        transactions: [],
        shifts: [],
        openShiftId: null,
        users: [],
        coupons: [],
        receiptSettings: { headerText: '', footerText: '' },
        pendingOrders: [],
      })
    }
  },

  login: async (username, password) => {
    try {
      const { user } = await apiRequest('/api/auth/login', { method: 'POST', body: { username, password } })
      set({ currentUser: user, isDataLoading: true })
      const data = await apiRequest('/api/bootstrap')
      get().hydrateFromBootstrap(data)
      set({ currentUser: data.user || user, isDataLoading: false })
      return true
    } catch {
      return false
    }
  },

  logout: async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    set({
      currentUser: null,
      categories: [],
      menus: [],
      addOns: [],
      transactions: [],
      shifts: [],
      openShiftId: null,
      users: [],
      coupons: [],
    })
  },

  refresh: async () => {
    set({ isDataLoading: true })
    try {
      const data = await apiRequest('/api/bootstrap')
      get().hydrateFromBootstrap(data)
      set({ currentUser: data.user || get().currentUser, isDataLoading: false })
    } catch {
      set({ isDataLoading: false })
    }
  },

  addCategory: async (categoryName) => {
    const name = String(categoryName || '').trim()
    if (!name) return
    const data = await apiRequest('/api/categories', { method: 'POST', body: { name } })
    get().hydrateFromBootstrap(data)
  },

  updateCategory: async (oldName, newName) => {
    const prev = String(oldName || '').trim()
    const next = String(newName || '').trim()
    if (!prev || !next) return
    const data = await apiRequest('/api/categories', { method: 'PATCH', body: { oldName: prev, newName: next } })
    get().hydrateFromBootstrap(data)
  },

  deleteCategory: async (categoryName) => {
    const name = String(categoryName || '').trim()
    if (!name) return
    const data = await apiRequest(`/api/categories?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    get().hydrateFromBootstrap(data)
  },

  addMenu: async (menu) => {
    const payload = {
      name: String(menu?.name || '').trim(),
      price: Number(menu?.price) || 0,
      hpp: Number(menu?.hpp) || 0,
      category: String(menu?.category || '').trim(),
      addOnIds: Array.isArray(menu?.addOnIds) ? menu.addOnIds : [],
      image: menu?.image ?? undefined,
    }
    if (!payload.name) return
    const data = await apiRequest('/api/menus', { method: 'POST', body: payload })
    get().hydrateFromBootstrap(data)
  },

  updateMenu: async (id, updatedMenu) => {
    const payload = {
      name: String(updatedMenu?.name || '').trim(),
      price: Number(updatedMenu?.price) || 0,
      hpp: Number(updatedMenu?.hpp) || 0,
      category: String(updatedMenu?.category || '').trim(),
      addOnIds: Array.isArray(updatedMenu?.addOnIds) ? updatedMenu.addOnIds : [],
      image: updatedMenu?.image ?? undefined,
    }
    if (!payload.name) return
    const data = await apiRequest(`/api/menus/${encodeURIComponent(id)}`, { method: 'PUT', body: payload })
    get().hydrateFromBootstrap(data)
  },

  deleteMenu: async (id) => {
    const data = await apiRequest(`/api/menus/${encodeURIComponent(id)}`, { method: 'DELETE' })
    get().hydrateFromBootstrap(data)
  },

  addAddOn: async (addOn) => {
    const payload = {
      name: String(addOn?.name || '').trim(),
      price: Number(addOn?.price) || 0,
      hpp: Number(addOn?.hpp) || 0,
    }
    if (!payload.name) return
    const data = await apiRequest('/api/addons', { method: 'POST', body: payload })
    get().hydrateFromBootstrap(data)
  },

  updateAddOn: async (id, updatedAddOn) => {
    const payload = {
      name: String(updatedAddOn?.name || '').trim(),
      price: Number(updatedAddOn?.price) || 0,
      hpp: Number(updatedAddOn?.hpp) || 0,
    }
    if (!payload.name) return
    const data = await apiRequest(`/api/addons/${encodeURIComponent(id)}`, { method: 'PUT', body: payload })
    get().hydrateFromBootstrap(data)
  },

  deleteAddOn: async (id) => {
    const data = await apiRequest(`/api/addons/${encodeURIComponent(id)}`, { method: 'DELETE' })
    get().hydrateFromBootstrap(data)
  },

  openShift: async (openingBalance) => {
    const opening = Number(openingBalance) || 0
    const { shiftId } = await apiRequest('/api/shifts/open', { method: 'POST', body: { openingBalance: opening } })
    await get().refresh()
    return shiftId
  },

  closeShift: async (closingCash) => {
    const closing = Number(closingCash) || 0
    const data = await apiRequest('/api/shifts/close', { method: 'POST', body: { closingCash: closing } })
    await get().refresh()
    return {
      shiftId: Number(data?.shiftId) || null,
      openingBalance: Number(data?.openingBalance) || 0,
      cashSales: Number(data?.cashSales) || 0,
      qrisSales: Number(data?.qrisSales) || 0,
      closingCash: Number(data?.closingCash) || 0,
      difference: Number(data?.difference) || 0,
    }
  },

  addTransaction: async (transaction) => {
    const payload = {
      paymentMethod: String(transaction?.paymentMethod || ''),
      customerName: String(transaction?.customerName || ''),
      subtotal: Number(transaction?.subtotal) || 0,
      total: Number(transaction?.total) || 0,
      couponCode: String(transaction?.couponCode || ''),
      pendingOrderId: transaction?.pendingOrderId ?? null,
      cashAmount: transaction?.cashAmount ?? null,
      changeAmount: transaction?.changeAmount ?? null,
      items: Array.isArray(transaction?.items) ? transaction.items : [],
    }
    const data = await apiRequest('/api/transactions', { method: 'POST', body: payload })
    get().hydrateFromBootstrap(data)
    const createdId = data?.createdTransactionId ? Number(data.createdTransactionId) : null
    const tx = createdId
      ? (data.transactions || []).find(t => Number(t.id) === createdId) || null
      : (data.transactions || [])[0] || null
    return tx
  },

  deleteTransaction: async (id) => {
    const txId = Number(id)
    if (!txId) return false
    const data = await apiRequest(`/api/transactions/${encodeURIComponent(txId)}`, { method: 'DELETE' })
    get().hydrateFromBootstrap(data)
    return true
  },

  fetchUsers: async () => {
    const data = await apiRequest('/api/users')
    set({ users: data.users || [] })
  },

  createUser: async ({ username, password, role }) => {
    const data = await apiRequest('/api/users', { method: 'POST', body: { username, password, role } })
    set({ users: data.users || [] })
  },

  updateUserPassword: async (id, password) => {
    await apiRequest(`/api/users/${encodeURIComponent(id)}/password`, { method: 'PATCH', body: { password } })
  },

  resetUserPassword: async (id, password) => {
    const body = password === undefined ? {} : { password }
    const data = await apiRequest(`/api/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body })
    return data?.tempPassword || ''
  },

  fetchCoupons: async () => {
    const data = await apiRequest('/api/coupons')
    set({ coupons: data.coupons || [] })
  },

  createCoupon: async ({ code, type, value, active, validFrom, validTo, isRepeatable, maxUses, maxDiscount }) => {
    const payload = {
      code: String(code || ''),
      type: String(type || 'amount'),
      value: Number(value) || 0,
      active: active === undefined ? true : Boolean(active),
      isRepeatable: Boolean(isRepeatable),
      maxUses: maxUses === undefined ? undefined : Number(maxUses) || 0,
      maxDiscount: maxDiscount === undefined || maxDiscount === null ? null : Number(maxDiscount) || null,
      validFrom: validFrom ?? null,
      validTo: validTo ?? null,
    }
    const data = await apiRequest('/api/coupons', { method: 'POST', body: payload })
    set({ coupons: data.coupons || [] })
  },

  updateCoupon: async (id, patch) => {
    const payload = {
      active: patch?.active === undefined ? undefined : Boolean(patch.active),
      isRepeatable: patch?.isRepeatable === undefined ? undefined : Boolean(patch.isRepeatable),
      maxUses: patch?.maxUses === undefined ? undefined : Number(patch.maxUses) || 0,
      maxDiscount: patch?.maxDiscount === undefined ? undefined : (patch.maxDiscount === null ? null : Number(patch.maxDiscount) || null),
      validFrom: patch?.validFrom === undefined ? undefined : patch.validFrom,
      validTo: patch?.validTo === undefined ? undefined : patch.validTo,
    }
    const data = await apiRequest(`/api/coupons/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload })
    set({ coupons: data.coupons || [] })
  },

  previewCoupon: async ({ code, subtotal }) => {
    const payload = { code: String(code || ''), subtotal: Number(subtotal) || 0 }
    return apiRequest('/api/coupons/preview', { method: 'POST', body: payload })
  },

  updateReceiptSettings: async ({ headerText, footerText }) => {
    const payload = {
      headerText: headerText ?? '',
      footerText: footerText ?? '',
    }
    const data = await apiRequest('/api/settings/receipt', { method: 'PATCH', body: payload })
    get().hydrateFromBootstrap(data)
    return data.receiptSettings || null
  },

  generateQrisDynamic: async ({ amount }) => {
    const payload = { amount: Number(amount) || 0 }
    const data = await apiRequest('/api/qris/dynamic', { method: 'POST', body: payload })
    return { qris: String(data?.qris || '') }
  },

  createPendingOrder: async ({ customerName, couponCode, items }) => {
    const payload = {
      customerName: String(customerName || ''),
      couponCode: String(couponCode || ''),
      items: Array.isArray(items) ? items : [],
    }
    const data = await apiRequest('/api/pending-orders?lite=1', { method: 'POST', body: payload })
    if (Array.isArray(data?.pendingOrders)) {
      set({ pendingOrders: data.pendingOrders })
    } else {
      get().hydrateFromBootstrap(data)
    }
    return data?.createdPendingOrderId ? Number(data.createdPendingOrderId) : null
  },

  deletePendingOrder: async (id) => {
    const pid = Number(id)
    if (!pid) return false
    const data = await apiRequest(`/api/pending-orders/${encodeURIComponent(pid)}?lite=1`, { method: 'DELETE' })
    if (Array.isArray(data?.pendingOrders)) {
      set({ pendingOrders: data.pendingOrders })
    } else {
      get().hydrateFromBootstrap(data)
    }
    return true
  },

  changeMyPassword: async ({ currentPassword, newPassword }) => {
    const payload = {
      currentPassword: String(currentPassword || ''),
      newPassword: String(newPassword || ''),
    }
    const data = await apiRequest('/api/auth/password', { method: 'PATCH', body: payload })
    return Boolean(data?.ok)
  },
}))
