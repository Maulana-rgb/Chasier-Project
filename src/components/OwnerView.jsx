import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { Plus, Trash2, Edit2, Save, X, Utensils, Menu } from 'lucide-react'

const OwnerView = () => {
  const { 
    menus, addMenu, updateMenu, deleteMenu, 
    addOns, addAddOn, updateAddOn, deleteAddOn,
    categories, addCategory, updateCategory, deleteCategory,
  } = useStore()

  const toDigits = (value) => String(value || '').replace(/\D/g, '')
  const formatIdr = (digits) => digits ? Number(digits).toLocaleString('id-ID') : ''

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editCategoryName, setEditCategoryName] = useState('')

  const [isAdding, setIsAdding] = useState(false)
  const [newMenu, setNewMenu] = useState({ name: '', price: '', hpp: '', category: 'Dimsum Steamed', addOnIds: [] })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', hpp: '', category: '', addOnIds: [] })

  const [isAddingAddOn, setIsAddingAddOn] = useState(false)
  const [newAddOn, setNewAddOn] = useState({ name: '', price: '', hpp: '' })
  const [editingAddOnId, setEditingAddOnId] = useState(null)
  const [editAddOnForm, setEditAddOnForm] = useState({ name: '', price: '', hpp: '' })

  const toggleIdInArray = (array, id) => {
    if (array.includes(id)) return array.filter(x => x !== id)
    return [...array, id]
  }

  const getAddOnNamesByIds = (ids) => {
    return addOns.filter(a => ids.includes(a.id)).map(a => a.name)
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newMenu.name || !newMenu.price) return
    addMenu({ ...newMenu, price: Number(newMenu.price) || 0, hpp: Number(newMenu.hpp) || 0 })
    setNewMenu({ name: '', price: '', hpp: '', category: 'Dimsum Steamed', addOnIds: [] })
    setIsAdding(false)
  }

  const startEdit = (menu) => {
    setEditingId(menu.id)
    setEditForm({ name: menu.name, price: String(menu.price || ''), hpp: String(menu.hpp || ''), category: menu.category, addOnIds: menu.addOnIds || [] })
  }

  const handleUpdate = (id) => {
    updateMenu(id, { ...editForm, price: Number(editForm.price) || 0, hpp: Number(editForm.hpp) || 0 })
    setEditingId(null)
  }

  const handleAddAddOn = (e) => {
    e.preventDefault()
    if (!newAddOn.name || !newAddOn.price) return
    addAddOn({ ...newAddOn, price: Number(newAddOn.price) || 0, hpp: Number(newAddOn.hpp) || 0 })
    setNewAddOn({ name: '', price: '', hpp: '' })
    setIsAddingAddOn(false)
  }

  const startEditAddOn = (addOn) => {
    setEditingAddOnId(addOn.id)
    setEditAddOnForm({ name: addOn.name, price: String(addOn.price || ''), hpp: String(addOn.hpp || '') })
  }

  const handleUpdateAddOn = (id) => {
    updateAddOn(id, { ...editAddOnForm, price: Number(editAddOnForm.price) || 0, hpp: Number(editAddOnForm.hpp) || 0 })
    setEditingAddOnId(null)
  }

  const handleAddCategory = (e) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    addCategory(newCategory)
    setNewCategory('')
    setIsAddingCategory(false)
  }

  const startEditCategory = (name) => {
    setEditingCategory(name)
    setEditCategoryName(name)
  }

  const handleUpdateCategory = () => {
    if (!editingCategory) return
    if (!editCategoryName.trim()) return
    updateCategory(editingCategory, editCategoryName)
    setEditingCategory(null)
    setEditCategoryName('')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
                          <button onClick={() => deleteCategory(c)} disabled={c === 'Lainnya'} className={`hover:text-red-800 ${c === 'Lainnya' ? 'text-gray-300 cursor-not-allowed' : 'text-red-600'}`}><Trash2 size={18} /></button>
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
                          <button onClick={() => handleUpdateAddOn(addOn.id)} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                          <button onClick={() => setEditingAddOnId(null)} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditAddOn(addOn)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          <button onClick={() => deleteAddOn(addOn.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
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

      {/* Menu Management */}
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
          <form onSubmit={handleAdd} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
            <div className="md:col-span-5">
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
            <div className="flex gap-2 md:col-span-5">
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
                          <button onClick={() => handleUpdate(menu.id)} className="text-green-600 hover:text-green-800"><Save size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(menu)} className="text-blue-600 hover:text-blue-800"><Edit2 size={18} /></button>
                          <button onClick={() => deleteMenu(menu.id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
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
    </div>
  )
}

export default OwnerView
