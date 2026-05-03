import React, { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { Plus, Trash2, Edit2, Save, X, Utensils, Menu, Receipt } from 'lucide-react'

const OwnerView = () => {
  const { 
    menus, addMenu, updateMenu, deleteMenu, 
    addOns, addAddOn, updateAddOn, deleteAddOn,
    categories, addCategory, updateCategory, deleteCategory,
    users, fetchUsers, createUser, updateUserPassword, resetUserPassword,
    coupons, fetchCoupons, createCoupon, updateCoupon,
    receiptSettings, updateReceiptSettings,
    changeMyPassword,
  } = useStore()

  const toDigits = (value) => String(value || '').replace(/\D/g, '')
  const formatIdr = (digits) => digits ? Number(digits).toLocaleString('id-ID') : ''

  const compressImageFile = async (file) => {
    if (!file) return null
    if (!file.type.startsWith('image/')) return null
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('READ_FAILED'))
      reader.readAsDataURL(file)
    })

    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'))
      i.src = dataUrl
    })

    const maxSize = 160
    const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1))
    const w = Math.max(1, Math.round((img.width || 1) * scale))
    const h = Math.max(1, Math.round((img.height || 1) * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)

    const out = canvas.toDataURL('image/jpeg', 0.75)
    if (out.length > 200_000) return null
    return out
  }

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  const [isAdding, setIsAdding] = useState(false)
  const [newMenu, setNewMenu] = useState({ name: '', price: '', hpp: '', category: 'Dimsum Steamed', addOnIds: [], image: null })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', hpp: '', category: '', addOnIds: [], image: null })

  const [isAddingAddOn, setIsAddingAddOn] = useState(false)
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '', hpp: '' })
  const [editingAddOnId, setEditingAddOnId] = useState(null)
  const [editAddOnForm, setEditAddOnForm] = useState({ name: '', price: '', hpp: '' })

  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '' })
  const [userError, setUserError] = useState('')
  const [passwordEditUserId, setPasswordEditUserId] = useState(null)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [lastReset, setLastReset] = useState(null)
  const [ownerPasswordCurrent, setOwnerPasswordCurrent] = useState('')
  const [ownerPasswordNew, setOwnerPasswordNew] = useState('')
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('')
  const [ownerPasswordStatus, setOwnerPasswordStatus] = useState('')

  const [isAddingCoupon, setIsAddingCoupon] = useState(false)
  const [newCoupon, setNewCoupon] = useState({ code: '', type: 'amount', value: '', isRepeatable: false, maxUses: '', validFrom: '', validTo: '' })
  const [couponError, setCouponError] = useState('')

  const [activeTab, setActiveTab] = useState('menu')
  const [receiptHeaderText, setReceiptHeaderText] = useState('')
  const [receiptFooterText, setReceiptFooterText] = useState('')
  const [receiptStatus, setReceiptStatus] = useState('')

  useEffect(() => {
    if (activeTab === 'user') {
      fetchUsers().catch((err) => {
        setUserError(err?.data?.error || err?.message || 'Gagal memuat user')
      })
      return
    }
    if (activeTab === 'coupon') {
      fetchCoupons().catch((err) => {
        setCouponError(err?.data?.error || err?.message || 'Gagal memuat kupon')
      })
    }
    if (activeTab === 'receipt') {
      setReceiptStatus('')
    }
  }, [activeTab, fetchUsers, fetchCoupons])

  useEffect(() => {
    if (activeTab !== 'receipt') return
    setReceiptHeaderText(String(receiptSettings?.headerText || ''))
    setReceiptFooterText(String(receiptSettings?.footerText || ''))
  }, [activeTab, receiptSettings])

  const handleSaveReceipt = async () => {
    setReceiptStatus('')
    try {
      await updateReceiptSettings({ headerText: receiptHeaderText, footerText: receiptFooterText })
      setReceiptStatus('Tersimpan')
    } catch (err) {
      setReceiptStatus(err?.data?.error || err?.message || 'Gagal menyimpan')
    }
  }

  const toggleIdInArray = (array, id) => {
    if (array.includes(id)) return array.filter(x => x !== id)
    return [...array, id]
  }

  const getAddOnNamesByIds = (ids) => {
    return addOns.filter(a => ids.includes(a.id)).map(a => a.name)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newMenu.name || !newMenu.price) return
    await addMenu({ ...newMenu, price: Number(newMenu.price) || 0, hpp: Number(newMenu.hpp) || 0 })
    setNewMenu({ name: '', price: '', hpp: '', category: 'Dimsum Steamed', addOnIds: [], image: null })
    setIsAdding(false)
  }

  const startEdit = (menu) => {
    setEditingId(menu.id)
    setEditForm({ name: menu.name, price: String(menu.price || ''), hpp: String(menu.hpp || ''), category: menu.category, addOnIds: menu.addOnIds || [], image: menu.image ?? null })
  }

  const handleUpdate = async (id) => {
    await updateMenu(id, { ...editForm, price: Number(editForm.price) || 0, hpp: Number(editForm.hpp) || 0 })
    setEditingId(null)
  }

  const handleAddAddOn = async (e) => {
    e.preventDefault()
    if (!newAddOn.name || !newAddOn.price) return
    await addAddOn({ ...newAddOn, price: Number(newAddOn.price) || 0, hpp: Number(newAddOn.hpp) || 0 })
    setNewAddOn({ name: '', price: '', hpp: '' })
    setIsAddingAddOn(false)
  }

  const startEditAddOn = (addOn) => {
    setEditingAddOnId(addOn.id)
    setEditAddOnForm({ name: addOn.name, price: String(addOn.price || ''), hpp: String(addOn.hpp || '') })
  }

  const handleUpdateAddOn = async (id) => {
    await updateAddOn(id, { ...editAddOnForm, price: Number(editAddOnForm.price) || 0, hpp: Number(editAddOnForm.hpp) || 0 })
    setEditingAddOnId(null)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    await addCategory(newCategory)
    setNewCategory('')
    setIsAddingCategory(false)
  }

  const startEditCategory = (name) => {
    setEditingCategory(name)
    setEditCategoryName(name)
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    if (!editCategoryName.trim()) return
    await updateCategory(editingCategory, editCategoryName)
    setEditingCategory(null)
    setEditCategoryName('')
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setUserError('')
    setLastReset(null)
    try {
      await createUser({ username: newUser.username, password: newUser.password, role: 'cashier' })
      setNewUser({ username: '', password: '' })
      setIsAddingUser(false)
    } catch (err) {
      setUserError(err?.data?.error || err?.message || 'Gagal membuat user')
    }
  }

  const handleSaveUserPassword = async (id) => {
    if (!newPasswordValue) return
    setUserError('')
    setLastReset(null)
    try {
      await updateUserPassword(id, newPasswordValue)
      setPasswordEditUserId(null)
      setNewPasswordValue('')
    } catch (err) {
      setUserError(err?.data?.error || err?.message || 'Gagal mengganti password')
    }
  }

  const handleResetUserPassword = async (u) => {
    setUserError('')
    try {
      const tempPassword = await resetUserPassword(u.id)
      setLastReset({ username: u.username, tempPassword })
    } catch (err) {
      setUserError(err?.data?.error || err?.message || 'Gagal reset password')
    }
  }

  const getOwnerPasswordErrorText = (code) => {
    const c = String(code || '')
    if (c === 'INVALID_CREDENTIALS') return 'Password lama salah.'
    if (c === 'PASSWORD_TOO_SHORT') return 'Password baru minimal 6 karakter.'
    if (c === 'UNAUTHORIZED') return 'Sesi login tidak valid. Silakan login ulang.'
    if (c === 'INVALID_INPUT') return 'Input tidak valid.'
    return 'Gagal mengganti password.'
  }

  const handleChangeOwnerPassword = async (e) => {
    e.preventDefault()
    setOwnerPasswordStatus('')
    if (!ownerPasswordCurrent || !ownerPasswordNew) return
    if (ownerPasswordNew !== ownerPasswordConfirm) {
      setOwnerPasswordStatus('Konfirmasi password baru tidak sama.')
      return
    }
    try {
      await changeMyPassword({ currentPassword: ownerPasswordCurrent, newPassword: ownerPasswordNew })
      setOwnerPasswordCurrent('')
      setOwnerPasswordNew('')
      setOwnerPasswordConfirm('')
      setOwnerPasswordStatus('Tersimpan')
    } catch (err) {
      setOwnerPasswordStatus(getOwnerPasswordErrorText(err?.data?.error || err?.message))
    }
  }

  const handleCreateCoupon = async (e) => {
    e.preventDefault()
    setCouponError('')
    const code = String(newCoupon.code || '').trim()
    const value = Number(String(newCoupon.value || '').replace(/\D/g, '')) || Number(newCoupon.value) || 0
    const maxUses = Number(String(newCoupon.maxUses || '').replace(/\D/g, '')) || Number(newCoupon.maxUses) || 0
    if (!code || !value) return
    if (newCoupon.isRepeatable && maxUses < 1) return
    try {
      await createCoupon({
        code,
        type: newCoupon.type,
        value,
        active: true,
        isRepeatable: Boolean(newCoupon.isRepeatable),
        maxUses: newCoupon.isRepeatable ? maxUses : 1,
        validFrom: newCoupon.validFrom ? newCoupon.validFrom : null,
        validTo: newCoupon.validTo ? newCoupon.validTo : null,
      })
      setNewCoupon({ code: '', type: 'amount', value: '', isRepeatable: false, maxUses: '', validFrom: '', validTo: '' })
      setIsAddingCoupon(false)
    } catch (err) {
      setCouponError(err?.data?.error || err?.message || 'Gagal membuat kupon')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'menu' ? 'bg-dimsum-red text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          Menu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('category')}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'category' ? 'bg-dimsum-red text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          Kategori
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('addon')}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'addon' ? 'bg-dimsum-red text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          Add-on
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('coupon'); setCouponError('') }}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'coupon' ? 'bg-dimsum-red text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          Kupon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('user')}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'user' ? 'bg-dimsum-red text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          User
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receipt')}
          className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'receipt' ? 'bg-dimsum-red text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          Struk
        </button>
      </div>

      {activeTab === 'receipt' && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Receipt className="text-dimsum-red" />
            <h3 className="text-xl font-bold text-dimsum-dark">Manajemen Struk</h3>
          </div>
          <button
            type="button"
            onClick={handleSaveReceipt}
            className="bg-dimsum-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <Save size={20} /> Simpan
          </button>
        </div>

        {receiptStatus && (
          <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${receiptStatus === 'Tersimpan' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {receiptStatus}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Header Struk (tiap baris jadi 1 baris)
            </label>
            <textarea
              value={receiptHeaderText}
              onChange={(e) => setReceiptHeaderText(e.target.value)}
              rows={8}
              className="w-full p-3 border rounded-lg text-sm font-mono"
              placeholder="Contoh:\nDIMSUM DIMSAY\nBy Mahia\nAlamat...\nWhatsapp..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Footer Struk (tiap baris jadi 1 baris)
            </label>
            <textarea
              value={receiptFooterText}
              onChange={(e) => setReceiptFooterText(e.target.value)}
              rows={8}
              className="w-full p-3 border rounded-lg text-sm font-mono"
              placeholder='Contoh:\n"Terima kasih"\nInstagram...\nInfo lain...'
            />
          </div>
        </div>
      </section>
      )}

      {activeTab === 'coupon' && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Menu className="text-dimsum-red" />
            <h3 className="text-xl font-bold text-dimsum-dark">Manajemen Kupon</h3>
          </div>
          <button
            onClick={() => { setIsAddingCoupon(true); setCouponError('') }}
            className="bg-dimsum-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <Plus size={20} /> Tambah Kupon
          </button>
        </div>

        {couponError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">
            {couponError}
          </div>
        )}

        {isAddingCoupon && (
          <form onSubmit={handleCreateCoupon} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Kode</label>
              <input
                type="text"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="misal: DISKON10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipe</label>
              <select
                value={newCoupon.type}
                onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="amount">Potongan (Rp)</option>
                <option value="percent">Persen (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nilai</label>
              <input
                type="text"
                inputMode="numeric"
                value={newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder={newCoupon.type === 'percent' ? '10' : '5000'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pemakaian</label>
              <select
                value={newCoupon.isRepeatable ? 'repeat' : 'once'}
                onChange={(e) => setNewCoupon({ ...newCoupon, isRepeatable: e.target.value === 'repeat', maxUses: e.target.value === 'repeat' ? (newCoupon.maxUses || '2') : '' })}
                className="w-full p-2 border rounded"
              >
                <option value="once">Sekali</option>
                <option value="repeat">Berulang</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Batas Pakai</label>
              <input
                type="text"
                inputMode="numeric"
                disabled={!newCoupon.isRepeatable}
                value={newCoupon.maxUses}
                onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                className={`w-full p-2 border rounded ${newCoupon.isRepeatable ? '' : 'bg-gray-100 text-gray-500'}`}
                placeholder={newCoupon.isRepeatable ? 'misal: 20' : '-'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mulai</label>
              <input
                type="datetime-local"
                value={newCoupon.validFrom}
                onChange={(e) => setNewCoupon({ ...newCoupon, validFrom: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sampai</label>
              <input
                type="datetime-local"
                value={newCoupon.validTo}
                onChange={(e) => setNewCoupon({ ...newCoupon, validTo: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="md:col-span-7 flex gap-2">
              <button type="submit" className="flex-1 bg-dimsum-red text-white p-2 rounded hover:bg-red-700">Simpan</button>
              <button type="button" onClick={() => setIsAddingCoupon(false)} className="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">Batal</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left">Kode</th>
                <th className="py-3 px-4 text-left">Tipe</th>
                <th className="py-3 px-4 text-left">Nilai</th>
                <th className="py-3 px-4 text-left">Pakai</th>
                <th className="py-3 px-4 text-left">Mulai</th>
                <th className="py-3 px-4 text-left">Sampai</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const now = Date.now()
                const validFromMs = c.validFrom ? new Date(c.validFrom).getTime() : null
                const validToMs = c.validTo ? new Date(c.validTo).getTime() : null
                const expired = validToMs !== null && validToMs < now
                const notYet = validFromMs !== null && validFromMs > now
                const usedCount = Number(c.usedCount) || 0
                const maxUses = Math.max(1, Number(c.maxUses) || 1)
                const limitReached = usedCount >= maxUses
                const status = limitReached ? (maxUses === 1 ? 'Sudah Dipakai' : 'Limit Habis') : expired ? 'Expired' : notYet ? 'Belum Aktif' : c.active ? 'Aktif' : 'Nonaktif'
                return (
                  <tr key={c.id} className="border-b">
                    <td className="py-3 px-4 font-mono font-bold">{c.code}</td>
                    <td className="py-3 px-4">{c.type === 'percent' ? 'Persen' : 'Potongan'}</td>
                    <td className="py-3 px-4">
                      {c.type === 'percent' ? `${c.value}%` : `Rp ${Number(c.value || 0).toLocaleString('id-ID')}`}
                    </td>
                    <td className="py-3 px-4">{`${usedCount}/${maxUses}`}</td>
                    <td className="py-3 px-4">{c.validFrom ? new Date(c.validFrom).toLocaleString('id-ID') : '-'}</td>
                    <td className="py-3 px-4">{c.validTo ? new Date(c.validTo).toLocaleString('id-ID') : '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${status === 'Aktif' ? 'bg-green-50 text-green-700' : status === 'Sudah Dipakai' ? 'bg-gray-100 text-gray-700' : status === 'Expired' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-800'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={async () => { await updateCoupon(c.id, { active: !c.active }) }}
                        className={`text-sm font-bold px-3 py-1 rounded ${c.active ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                      >
                        {c.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeTab === 'user' && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Menu className="text-dimsum-red" />
            <h3 className="text-xl font-bold text-dimsum-dark">Manajemen User</h3>
          </div>
          <button
            onClick={() => { setIsAddingUser(true); setUserError(''); setLastReset(null) }}
            className="bg-dimsum-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <Plus size={20} /> Tambah User
          </button>
        </div>

        <div className="mb-8 p-4 rounded-xl border border-gray-100 bg-gray-50">
          <h4 className="font-black text-dimsum-dark mb-3">Ganti Password Owner</h4>
          <form onSubmit={handleChangeOwnerPassword} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password Lama</label>
              <input
                type="password"
                value={ownerPasswordCurrent}
                onChange={(e) => setOwnerPasswordCurrent(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="password lama"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password Baru</label>
              <input
                type="password"
                value={ownerPasswordNew}
                onChange={(e) => setOwnerPasswordNew(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="password baru"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Konfirmasi</label>
              <input
                type="password"
                value={ownerPasswordConfirm}
                onChange={(e) => setOwnerPasswordConfirm(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="konfirmasi password"
              />
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                className="bg-dimsum-dark text-white px-4 py-2 rounded-lg font-bold hover:bg-black"
              >
                Simpan Password
              </button>
              {ownerPasswordStatus && (
                <div className={`text-sm font-bold ${ownerPasswordStatus === 'Tersimpan' ? 'text-green-700' : 'text-red-700'}`}>
                  {ownerPasswordStatus}
                </div>
              )}
            </div>
          </form>
        </div>

        {userError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">
            {userError}
          </div>
        )}

        {lastReset?.tempPassword && (
          <div className="mb-4 p-3 rounded-xl bg-yellow-50 text-yellow-800 text-sm font-bold">
            Password baru untuk {lastReset.username}: <span className="font-mono">{lastReset.tempPassword}</span>
          </div>
        )}

        {isAddingUser && (
          <form onSubmit={handleCreateUser} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="misal: kasir2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="password"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700">Simpan</button>
              <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">Batal</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Dibuat</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">{u.username}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleString('id-ID') : '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {passwordEditUserId === u.id ? (
                        <>
                          <input
                            type="password"
                            value={newPasswordValue}
                            onChange={(e) => setNewPasswordValue(e.target.value)}
                            className="p-1 border rounded"
                            placeholder="password baru"
                          />
                          <button onClick={async () => { await handleSaveUserPassword(u.id) }} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                          <button onClick={() => { setPasswordEditUserId(null); setNewPasswordValue('') }} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setPasswordEditUserId(u.id); setNewPasswordValue(''); setUserError(''); setLastReset(null) }} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          <button onClick={async () => { await handleResetUserPassword(u) }} className="text-dimsum-red hover:text-red-800 font-bold text-xs px-2 py-1 rounded bg-red-50">Reset</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(users || []).length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-gray-400" colSpan={3}>Belum ada user</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeTab === 'category' && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Menu className="text-dimsum-red" />
            <h3 className="text-xl font-bold text-dimsum-dark">Manajemen Kategori</h3>
          </div>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="bg-dimsum-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <Plus size={20} /> Tambah Kategori
          </button>
        </div>

        {isAddingCategory && (
          <form onSubmit={handleAddCategory} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nama Kategori</label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Misal: Paket"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700">Simpan</button>
              <button type="button" onClick={() => setIsAddingCategory(false)} className="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">Batal</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4">Nama Kategori</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(categories || []).map((c) => (
                <tr key={c} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    {editingCategory === c ? (
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="w-full p-1 border rounded"
                      />
                    ) : c}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingCategory === c ? (
                        <>
                          <button onClick={handleUpdateCategory} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                          <button onClick={() => { setEditingCategory(null); setEditCategoryName('') }} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditCategory(c)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          <button onClick={async () => { await deleteCategory(c) }} disabled={c === 'Lainnya'} className={`hover:text-red-800 ${c === 'Lainnya' ? 'text-gray-300 cursor-not-allowed' : 'text-red-600'}`}><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(categories || []).length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-gray-400" colSpan={2}>Belum ada kategori</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeTab === 'addon' && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Menu className="text-dimsum-red" />
            <h3 className="text-xl font-bold text-dimsum-dark">Manajemen Add-on</h3>
          </div>
          <button
            onClick={() => setIsAddingAddOn(true)}
            className="bg-dimsum-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <Plus size={20} /> Tambah Add-on
          </button>
        </div>

        {isAddingAddOn && (
          <form onSubmit={handleAddAddOn} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Add-on</label>
              <input
                type="text"
                value={newAddOn.name}
                onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Misal: Extra Saus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Harga Jual (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatIdr(newAddOn.price)}
                onChange={(e) => setNewAddOn({ ...newAddOn, price: toDigits(e.target.value) })}
                className="w-full p-2 border rounded"
                placeholder="2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HPP (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatIdr(newAddOn.hpp)}
                onChange={(e) => setNewAddOn({ ...newAddOn, hpp: toDigits(e.target.value) })}
                className="w-full p-2 border rounded"
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700">Simpan</button>
              <button type="button" onClick={() => setIsAddingAddOn(false)} className="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">Batal</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4">Nama Add-on</th>
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">HPP</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {addOns.map((addOn) => (
                <tr key={addOn.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    {editingAddOnId === addOn.id ? (
                      <input
                        type="text"
                        value={editAddOnForm.name}
                        onChange={(e) => setEditAddOnForm({ ...editAddOnForm, name: e.target.value })}
                        className="w-full p-1 border rounded"
                      />
                    ) : addOn.name}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {editingAddOnId === addOn.id ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatIdr(editAddOnForm.price)}
                        onChange={(e) => setEditAddOnForm({ ...editAddOnForm, price: toDigits(e.target.value) })}
                        className="w-full p-1 border rounded"
                      />
                    ) : `Rp ${addOn.price.toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {editingAddOnId === addOn.id ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatIdr(editAddOnForm.hpp)}
                        onChange={(e) => setEditAddOnForm({ ...editAddOnForm, hpp: toDigits(e.target.value) })}
                        className="w-full p-1 border rounded"
                      />
                    ) : `Rp ${(addOn.hpp || 0).toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingAddOnId === addOn.id ? (
                        <>
                          <button onClick={async () => { await handleUpdateAddOn(addOn.id) }} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                          <button onClick={() => setEditingAddOnId(null)} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditAddOn(addOn)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          <button onClick={async () => { await deleteAddOn(addOn.id) }} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {addOns.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-gray-400" colSpan={4}>Belum ada add-on</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Menu Management */}
      {activeTab === 'menu' && (
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Utensils className="text-dimsum-red" />
            <h3 className="text-xl font-bold text-dimsum-dark">Manajemen Menu</h3>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-dimsum-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <Plus size={20} /> Tambah Menu
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAdd} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Menu</label>
              <input 
                type="text" 
                value={newMenu.name}
                onChange={(e) => setNewMenu({...newMenu, name: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Misal: Siomay Udang"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Harga Jual (Rp)</label>
              <input 
                type="text"
                inputMode="numeric"
                value={formatIdr(newMenu.price)}
                onChange={(e) => setNewMenu({...newMenu, price: toDigits(e.target.value)})}
                className="w-full p-2 border rounded"
                placeholder="15000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HPP (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatIdr(newMenu.hpp)}
                onChange={(e) => setNewMenu({ ...newMenu, hpp: toDigits(e.target.value) })}
                className="w-full p-2 border rounded"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select 
                value={newMenu.category}
                onChange={(e) => setNewMenu({...newMenu, category: e.target.value})}
                className="w-full p-2 border rounded"
              >
                {(categories || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gambar</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0] || null
                  const img = file ? await compressImageFile(file) : null
                  setNewMenu({ ...newMenu, image: img })
                }}
                className="w-full p-2 border rounded bg-white"
              />
              {newMenu.image && (
                <img src={newMenu.image} alt="preview" className="mt-2 w-12 h-12 rounded object-cover border" />
              )}
            </div>
            <div className="md:col-span-6">
              <label className="block text-sm font-medium mb-1">Add-on Tersedia</label>
              {addOns.length === 0 ? (
                <div className="p-2 border rounded bg-white text-sm text-gray-400">Buat add-on dulu</div>
              ) : (
                <div className="p-2 border rounded bg-white max-h-28 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                  {addOns.map((addOn) => (
                    <label key={addOn.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-700">{addOn.name}</span>
                      <input
                        type="checkbox"
                        checked={(newMenu.addOnIds || []).includes(addOn.id)}
                        onChange={() => setNewMenu({ ...newMenu, addOnIds: toggleIdInArray(newMenu.addOnIds || [], addOn.id) })}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 md:col-span-6">
              <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700">Simpan</button>
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-gray-400 text-white p-2 rounded hover:bg-gray-500">Batal</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4">Nama Menu</th>
                <th className="py-3 px-4">Gambar</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">HPP</th>
                <th className="py-3 px-4">Add-on</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => (
                <tr key={menu.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium">
                    {editingId === menu.id ? (
                      <input 
                        type="text" 
                        value={editForm.name}
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full p-1 border rounded"
                      />
                    ) : menu.name}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === menu.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0] || null
                            const img = file ? await compressImageFile(file) : null
                            setEditForm({ ...editForm, image: img })
                          }}
                          className="w-full p-1 border rounded bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, image: null })}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      menu.image ? <img src={menu.image} alt={menu.name} className="w-10 h-10 rounded object-cover border" /> : <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === menu.id ? (
                      <select 
                        value={editForm.category}
                        onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                        className="w-full p-1 border rounded"
                      >
                        {(categories || []).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {menu.category}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {editingId === menu.id ? (
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={formatIdr(editForm.price)}
                        onChange={(e) => setEditForm({...editForm, price: toDigits(e.target.value)})}
                        className="w-full p-1 border rounded"
                      />
                    ) : `Rp ${menu.price.toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {editingId === menu.id ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatIdr(editForm.hpp)}
                        onChange={(e) => setEditForm({ ...editForm, hpp: toDigits(e.target.value) })}
                        className="w-full p-1 border rounded"
                      />
                    ) : `Rp ${(menu.hpp || 0).toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === menu.id ? (
                      addOns.length === 0 ? (
                        <span className="text-sm text-gray-400">Buat add-on dulu</span>
                      ) : (
                        <div className="max-h-24 overflow-y-auto space-y-2 pr-2">
                          {addOns.map((addOn) => (
                            <label key={addOn.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-gray-700">{addOn.name}</span>
                              <input
                                type="checkbox"
                                checked={(editForm.addOnIds || []).includes(addOn.id)}
                                onChange={() => setEditForm({ ...editForm, addOnIds: toggleIdInArray(editForm.addOnIds || [], addOn.id) })}
                              />
                            </label>
                          ))}
                        </div>
                      )
                    ) : (
                      (() => {
                        const selectedNames = getAddOnNamesByIds(menu.addOnIds || [])
                        if (selectedNames.length === 0) return <span className="text-sm text-gray-400">-</span>
                        return (
                          <span className="text-sm text-gray-700">
                            {selectedNames.slice(0, 2).join(', ')}
                            {selectedNames.length > 2 ? ` +${selectedNames.length - 2}` : ''}
                          </span>
                        )
                      })()
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      {editingId === menu.id ? (
                        <>
                          <button onClick={async () => { await handleUpdate(menu.id) }} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(menu)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          <button onClick={async () => { await deleteMenu(menu.id) }} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  )
}

export default OwnerView
