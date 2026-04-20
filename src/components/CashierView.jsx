import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { ShoppingCart, User, Search, Trash2, CheckCircle } from 'lucide-react'

const CashierView = () => {
  const { 
    menus, isMemberFeatureEnabled, members, 
    pointsRatio, pointsValue, addTransaction 
  } = useStore()

  const [cart, setCart] = useState([])
  const [memberId, setMemberId] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [usePoints, setUsePoints] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('') // 'Cash' or 'QRIS'
  const [showSuccess, setShowSuccess] = useState(false)

  // Filter menu by category for better UI (optional enhancement)
  const categories = [...new Set(menus.map(m => m.category))]

  const addToCart = (menu) => {
    const existing = cart.find(item => item.id === menu.id)
    if (existing) {
      setCart(cart.map(item => item.id === menu.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { ...menu, qty: 1 }])
    }
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta)
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const handleSearchMember = () => {
    const found = members.find(m => m.id === memberId || m.phone === memberId)
    if (found) {
      setSelectedMember(found)
    } else {
      alert('Member tidak ditemukan')
      setSelectedMember(null)
    }
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0)
  const discountFromPoints = usePoints * pointsValue
  const total = subtotal - discountFromPoints
  const potentialPoints = Math.floor(total / pointsRatio)

  const handleCheckout = () => {
    if (cart.length === 0) return

    const transaction = {
      items: cart,
      subtotal,
      pointsUsed: usePoints,
      discount: discountFromPoints,
      total,
      paymentMethod,
      memberId: selectedMember ? selectedMember.id : null,
      pointsEarned: selectedMember ? potentialPoints : 0
    }

    addTransaction(transaction)
    setCart([])
    setSelectedMember(null)
    setMemberId('')
    setUsePoints(0)
    setPaymentMethod('')
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Menu List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold text-dimsum-dark">Menu Dimsum</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari menu..." 
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-dimsum-red outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {menus.map(menu => (
            <div 
              key={menu.id} 
              onClick={() => addToCart(menu)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-dimsum-red hover:shadow-md transition-all group"
            >
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
                {/* Placeholder image */}
                <span className="text-xs">No Image</span>
              </div>
              <h4 className="font-bold text-dimsum-dark group-hover:text-dimsum-red">{menu.name}</h4>
              <p className="text-sm text-gray-500 mb-2">{menu.category}</p>
              <p className="font-mono text-dimsum-red font-bold">Rp {menu.price.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col min-h-[500px]">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="text-dimsum-red" />
            <h3 className="text-xl font-bold">Keranjang Belanja</h3>
          </div>

          {isMemberFeatureEnabled && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <User size={14} /> Member (Opsional)
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="ID atau No HP"
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
                <button 
                  onClick={handleSearchMember}
                  className="bg-dimsum-dark text-white px-3 py-2 rounded-lg text-sm hover:bg-black"
                >
                  Cek
                </button>
              </div>
              {selectedMember && (
                <div className="space-y-2">
                  <div className="p-2 bg-green-50 text-green-700 rounded-lg text-xs flex justify-between items-center">
                    <span>Member: <b>{selectedMember.name}</b> ({selectedMember.points} Pts)</span>
                    <button onClick={() => { setSelectedMember(null); setUsePoints(0); }} className="text-green-900 font-bold">X</button>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-dimsum-yellow/20 rounded-lg">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-dimsum-dark uppercase">Gunakan Poin</p>
                      <input 
                        type="range" 
                        min="0" 
                        max={selectedMember.points} 
                        value={usePoints}
                        onChange={(e) => setUsePoints(parseInt(e.target.value))}
                        className="w-full h-1 bg-dimsum-yellow rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <span className="font-bold text-sm text-dimsum-dark w-12 text-center">{usePoints}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 text-center italic">
                    Potongan harga: Rp {(usePoints * pointsValue).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
              <p>Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">Rp {item.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100">-</button>
                    <span className="px-3 py-1 text-sm font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t rounded-b-2xl space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          {usePoints > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Potongan Poin ({usePoints} Pts)</span>
              <span>-Rp {discountFromPoints.toLocaleString()}</span>
            </div>
          )}
          {selectedMember && (
            <div className="flex justify-between text-dimsum-yellow font-bold text-xs bg-dimsum-dark/5 p-2 rounded">
              <span>Estimasi Poin Baru</span>
              <span>+{potentialPoints} Pts</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-dimsum-dark pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-dimsum-red">Rp {total.toLocaleString()}</span>
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setPaymentMethod('Cash')}
                className={`py-2 rounded-lg border-2 font-bold transition-all ${paymentMethod === 'Cash' ? 'border-dimsum-red bg-red-50 text-dimsum-red' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                CASH
              </button>
              <button 
                onClick={() => setPaymentMethod('QRIS')}
                className={`py-2 rounded-lg border-2 font-bold transition-all ${paymentMethod === 'QRIS' ? 'border-dimsum-red bg-red-50 text-dimsum-red' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                QRIS
              </button>
            </div>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || !paymentMethod}
            className="w-full bg-dimsum-red text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all disabled:bg-gray-300 disabled:shadow-none mt-4"
          >
            {!paymentMethod && cart.length > 0 ? 'Pilih Pembayaran' : 'Bayar Sekarang'}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl text-center shadow-2xl scale-in-center">
            <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Transaksi Berhasil!</h3>
            <p className="text-gray-500">Pesanan telah disimpan dalam riwayat.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashierView