import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { Plus, Trash2, Edit2, Save, X, Settings, Users, Utensils } from 'lucide-react'

const OwnerView = () => {
  const { 
    menus, addMenu, updateMenu, deleteMenu, 
    isMemberFeatureEnabled, toggleMemberFeature,
    pointsRatio, setPointsRatio,
    pointsValue, setPointsValue,
    members
  } = useStore()

  const [isAdding, setIsAdding] = useState(false)
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'Dimsum Steamed' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', category: '' })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newMenu.name || !newMenu.price) return
    addMenu({ ...newMenu, price: parseInt(newMenu.price) })
    setNewMenu({ name: '', price: '', category: 'Dimsum Steamed' })
    setIsAdding(false)
  }

  const startEdit = (menu) => {
    setEditingId(menu.id)
    setEditForm({ name: menu.name, price: menu.price, category: menu.category })
  }

  const handleUpdate = (id) => {
    updateMenu(id, { ...editForm, price: parseInt(editForm.price) })
    setEditingId(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Settings Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="text-dimsum-red" />
          <h3 className="text-xl font-bold text-dimsum-dark">Pengaturan Sistem</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold">Fitur Member</p>
              <p className="text-sm text-gray-500">Aktifkan diskon otomatis untuk member</p>
            </div>
            <button 
              onClick={toggleMemberFeature}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isMemberFeatureEnabled ? 'bg-dimsum-red' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isMemberFeatureEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold">Rasio Poin (Rp)</p>
              <p className="text-sm text-gray-500">Belanja Rp X = 1 Poin</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 text-nowrap">Rp</span>
              <input 
                type="number" 
                value={pointsRatio}
                onChange={(e) => setPointsRatio(parseInt(e.target.value) || 0)}
                disabled={!isMemberFeatureEnabled}
                className="w-24 p-2 border rounded text-right disabled:bg-gray-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-semibold">Nilai Poin (Rp)</p>
              <p className="text-sm text-gray-500">1 Poin = Potongan Rp X</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 text-nowrap">Rp</span>
              <input 
                type="number" 
                value={pointsValue}
                onChange={(e) => setPointsValue(parseInt(e.target.value) || 0)}
                disabled={!isMemberFeatureEnabled}
                className="w-24 p-2 border rounded text-right disabled:bg-gray-200"
              />
            </div>
          </div>
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
          <form onSubmit={handleAdd} className="mb-8 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
              <label className="block text-sm font-medium mb-1">Harga (Rp)</label>
              <input 
                type="number" 
                value={newMenu.price}
                onChange={(e) => setNewMenu({...newMenu, price: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="15000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select 
                value={newMenu.category}
                onChange={(e) => setNewMenu({...newMenu, category: e.target.value})}
                className="w-full p-2 border rounded"
              >
                <option>Dimsum Steamed</option>
                <option>Dimsum Fried</option>
                <option>Bakpao</option>
                <option>Minuman</option>
              </select>
            </div>
            <div className="flex gap-2">
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
                <th className="py-3 px-4">Harga</th>
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
                        <option>Dimsum Steamed</option>
                        <option>Dimsum Fried</option>
                        <option>Bakpao</option>
                        <option>Minuman</option>
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
                        type="number" 
                        value={editForm.price}
                        onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                        className="w-full p-1 border rounded"
                      />
                    ) : `Rp ${menu.price.toLocaleString()}`}
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

      {/* Members Section (Summary) */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-dimsum-red" />
          <h3 className="text-xl font-bold text-dimsum-dark">Daftar Member ({members.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="py-3 px-4">Nama Member</th>
                <th className="py-3 px-4">ID / No HP</th>
                <th className="py-3 px-4 text-right">Poin</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-bold">{member.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{member.id} • {member.phone}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="bg-dimsum-yellow text-dimsum-dark px-3 py-1 rounded-full font-bold">
                      {member.points} Pts
                    </span>
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