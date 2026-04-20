import React, { useState } from 'react'
import { useStore } from '../store/useStore'
import { ShoppingCart, Search, Trash2, CheckCircle } from 'lucide-react'

const CashierView = () => {
  const { 
    menus, addOns, categories, shifts, openShiftId, openShift, closeShift, addTransaction 
  } = useStore()

  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [paymentMethod, setPaymentMethod] = useState('') // 'Cash' or 'QRIS'
  const [customerName, setCustomerName] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptTransaction, setReceiptTransaction] = useState(null)
  const [expandedItemId, setExpandedItemId] = useState(null)
  const [pendingAddOnAction, setPendingAddOnAction] = useState(null)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [showCloseShift, setShowCloseShift] = useState(false)
  const [closingCash, setClosingCash] = useState('')

  const createLineId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const getAddOnKey = (selectedAddOnIds) => {
    return (selectedAddOnIds || []).slice().sort((a, b) => a - b).join(',')
  }

  const visibleMenus = selectedCategory === 'Semua'
    ? menus
    : menus.filter(m => m.category === selectedCategory)

  const addToCart = (menu) => {
    const key = getAddOnKey([])
    const existing = cart.find(item => item.menuId === menu.id && getAddOnKey(item.selectedAddOnIds) === key)
    if (existing) {
      setCart(cart.map(item => item.lineId === existing.lineId ? { ...item, qty: item.qty + 1 } : item))
      return
    }
    setCart([
      ...cart,
      {
        lineId: createLineId(),
        menuId: menu.id,
        name: menu.name,
        price: menu.price,
        hpp: menu.hpp || 0,
        category: menu.category,
        qty: 1,
        availableAddOnIds: menu.addOnIds || [],
        selectedAddOnIds: [],
      },
    ])
  }

  const removeFromCart = (lineId) => {
    if (expandedItemId === lineId) setExpandedItemId(null)
    setCart(cart.filter(item => item.lineId !== lineId))
  }

  const updateQty = (lineId, delta) => {
    setCart(cart.map(item => {
      if (item.lineId === lineId) {
        const newQty = Math.max(1, item.qty + delta)
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const addOnById = Object.fromEntries(addOns.map(a => [a.id, a]))

  const getSelectedAddOns = (selectedIds) => {
    return selectedIds.map(id => addOnById[id]).filter(Boolean)
  }

  const getUnitPrice = (item) => {
    const selected = getSelectedAddOns(item.selectedAddOnIds || [])
    const addOnTotal = selected.reduce((acc, a) => acc + a.price, 0)
    return item.price + addOnTotal
  }

  const toggleAddOnForItem = (lineId, addOnId) => {
    setCart(cart.map(item => {
      if (item.lineId !== lineId) return item
      const selected = item.selectedAddOnIds || []
      const nextSelected = selected.includes(addOnId)
        ? selected.filter(x => x !== addOnId)
        : [...selected, addOnId]
      return { ...item, selectedAddOnIds: nextSelected }
    }))
  }

  const splitLineItem = (sourceLineId, qtyToSplit, nextSelectedAddOnIds) => {
    setCart((prev) => {
      const source = prev.find(i => i.lineId === sourceLineId)
      if (!source) return prev
      if (qtyToSplit <= 0 || source.qty <= qtyToSplit) return prev

      const sourceNext = { ...source, qty: source.qty - qtyToSplit }
      const newLine = {
        ...source,
        lineId: createLineId(),
        qty: qtyToSplit,
        selectedAddOnIds: nextSelectedAddOnIds,
      }

      const merged = prev
        .filter(i => i.lineId !== sourceLineId)
        .map(i => i)

      const existingTarget = merged.find(i =>
        i.menuId === newLine.menuId &&
        getAddOnKey(i.selectedAddOnIds) === getAddOnKey(newLine.selectedAddOnIds)
      )

      if (existingTarget) {
        return merged
          .map(i => i.lineId === existingTarget.lineId ? { ...i, qty: i.qty + newLine.qty } : i)
          .concat(sourceNext)
      }

      return [...merged, sourceNext, newLine]
    })
  }

  const requestToggleAddOn = (lineId, addOnId) => {
    const item = cart.find(i => i.lineId === lineId)
    if (!item) return

    if (item.qty <= 1) {
      toggleAddOnForItem(lineId, addOnId)
      return
    }

    const selected = item.selectedAddOnIds || []
    const nextSelected = selected.includes(addOnId)
      ? selected.filter(x => x !== addOnId)
      : [...selected, addOnId]

    setPendingAddOnAction({
      lineId,
      addOnId,
      nextSelectedAddOnIds: nextSelected,
    })
  }

  const subtotal = cart.reduce((acc, item) => acc + (getUnitPrice(item) * item.qty), 0)
  const total = subtotal
  const changeAmount = paymentMethod === 'Cash' && Number(cashAmount) > total ? Number(cashAmount) - total : 0

  const openShiftData = openShiftId ? (shifts || []).find(s => s.id === openShiftId) : null

  const escapeHtml = (value) => {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  const getAddOnTotal = (addOnsList) => {
    return (addOnsList || []).reduce((acc, a) => acc + (a.price || 0), 0)
  }

  const getReceiptHtml = (transaction) => {
    const itemsHtml = (transaction.items || []).map((item) => {
      const addOnTotal = getAddOnTotal(item.addOns)
      const unit = (item.price || 0) + addOnTotal
      const lineTotal = unit * (item.qty || 0)
      const addOnsHtml = Array.isArray(item.addOns) && item.addOns.length > 0
        ? `<div class="muted small" style="margin-top:4px;">${item.addOns.map(a => `${escapeHtml(a.name)} (+Rp ${Number(a.price || 0).toLocaleString('id-ID')})`).join(', ')}</div>`
        : ''

      return `
        <div class="row">
          <div style="flex:1;">
            <div class="bold">${escapeHtml(item.name)}</div>
            ${addOnsHtml}
          </div>
          <div class="right mono">${Number(item.qty || 0)} x Rp ${Number(unit).toLocaleString('id-ID')}</div>
        </div>
        <div class="right mono" style="margin-top:4px;">Rp ${Number(lineTotal).toLocaleString('id-ID')}</div>
        <div class="divider"></div>
      `
    }).join('')

    const dateText = transaction.date ? new Date(transaction.date).toLocaleString('id-ID') : ''
    const txNo = transaction.id ? String(transaction.id).slice(-6) : ''

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Struk</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; padding: 16px; }
            .receipt { width: 320px; margin: 0 auto; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 800; }
            .muted { color: #666; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
            .small { font-size: 12px; }
            .divider { border-top: 1px dashed #bbb; margin: 10px 0; }
            .row { display: flex; gap: 12px; align-items: flex-start; }
            .totals { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; }
            @media print { body { padding: 0; } .receipt { width: 80mm; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="bold">DIMSUM DIMSAY</div>
              <div class="small muted">Premium Quality</div>
            </div>
            <div class="divider"></div>
            <div class="small">
              <div class="row"><div style="flex:1;">No</div><div class="mono">#${escapeHtml(txNo)}</div></div>
              <div class="row"><div style="flex:1;">Tanggal</div><div class="mono">${escapeHtml(dateText)}</div></div>
              ${transaction.customerName ? `<div class="row"><div style="flex:1;">Pelanggan</div><div class="mono">${escapeHtml(transaction.customerName)}</div></div>` : ''}
              <div class="row"><div style="flex:1;">Pembayaran</div><div class="mono">${escapeHtml(transaction.paymentMethod || '')}</div></div>
            </div>
            <div class="divider"></div>
            ${itemsHtml}
            <div class="totals small">
              <div class="muted">Subtotal</div><div class="mono right">Rp ${Number(transaction.subtotal || 0).toLocaleString('id-ID')}</div>
              <div class="bold">Total</div><div class="mono right bold">Rp ${Number(transaction.total || 0).toLocaleString('id-ID')}</div>
            </div>
            ${transaction.paymentMethod === 'Cash' ? `
            <div class="divider"></div>
            <div class="totals small">
              <div class="muted">Tunai</div><div class="mono right">Rp ${Number(transaction.cashAmount || 0).toLocaleString('id-ID')}</div>
              <div class="muted">Kembali</div><div class="mono right">Rp ${Number(transaction.changeAmount || 0).toLocaleString('id-ID')}</div>
            </div>
            ` : ''}
            <div class="divider"></div>
            <div class="center small muted">Terima kasih</div>
          </div>
        </body>
      </html>
    `
  }

  const printViaIframe = (html) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      alert('Gagal membuka konteks print.')
      return
    }

    doc.open()
    doc.write(html)
    doc.close()

    iframe.onload = () => {
      const w = iframe.contentWindow
      if (!w) return
      w.focus()
      w.print()
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }, 500)
    }
  }

  const openPrintWindow = (transaction) => {
    if (!transaction) return

    const html = getReceiptHtml(transaction)
    const win = window.open('about:blank', 'dimsum_print', 'popup=yes,width=480,height=720')
    if (!win) {
      printViaIframe(html)
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    try {
      win.focus()
      win.print()
    } catch {
      printViaIframe(html)
    }
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    if (!paymentMethod) return
    if (!openShiftId) return

    const itemsForTransaction = cart.map(item => ({
      id: item.menuId,
      name: item.name,
      category: item.category,
      price: item.price,
      hpp: item.hpp || 0,
      qty: item.qty,
      addOns: getSelectedAddOns(item.selectedAddOnIds || []).map(a => ({ id: a.id, name: a.name, price: a.price, hpp: a.hpp || 0 })),
    }))

    const transaction = {
      items: itemsForTransaction,
      subtotal,
      total,
      paymentMethod,
      customerName,
      cashAmount: paymentMethod === 'Cash' ? Number(cashAmount) : 0,
      changeAmount,
      shiftId: openShiftId,
    }

    addTransaction(transaction)
    const latest = useStore.getState().transactions.slice(-1)[0] || null
    setReceiptTransaction(latest)
    setShowReceipt(true)
    setCart([])
    setPaymentMethod('')
    setCustomerName('')
    setCashAmount('')
    setExpandedItemId(null)
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

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 border rounded-lg text-sm"
          >
            <option value="Semua">Semua</option>
            {(categories || [...new Set(menus.map(m => m.category))]).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {visibleMenus.map(menu => (
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
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-dimsum-red" />
            <h3 className="text-xl font-bold">Keranjang Belanja</h3>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shift</p>
              {openShiftId && openShiftData ? (
                <>
                  <p className="font-bold text-dimsum-dark">Aktif</p>
                  <p className="text-xs text-gray-500">Saldo awal: Rp {(openShiftData.openingBalance || 0).toLocaleString()}</p>
                </>
              ) : (
                <p className="font-bold text-red-700">Belum dibuka</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {!openShiftId ? (
                <button
                  type="button"
                  onClick={() => setShowOpenShift(true)}
                  className="px-4 py-2 rounded-lg bg-dimsum-red text-white font-bold hover:bg-red-700"
                >
                  Buka Shift
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCloseShift(true)}
                  disabled={cart.length > 0}
                  className={`px-4 py-2 rounded-lg font-bold ${cart.length > 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-dimsum-dark text-white hover:bg-black'}`}
                >
                  Tutup Shift
                </button>
              )}
              {openShiftId && cart.length > 0 && (
                <p className="text-[10px] text-gray-400 text-right">Kosongkan keranjang untuk tutup shift</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Nama Customer (Opsional)
            </label>
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Masukkan nama..." 
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-dimsum-red outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
              <p>Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.lineId} className="p-3 border border-gray-100 rounded-xl bg-white">
                <div className="flex justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Rp {getUnitPrice(item).toLocaleString()} / porsi
                    </p>
                    {getSelectedAddOns(item.selectedAddOnIds || []).length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {getSelectedAddOns(item.selectedAddOnIds || []).map(a => `${a.name} (+Rp ${a.price.toLocaleString()})`).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button onClick={() => updateQty(item.lineId, -1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100">-</button>
                      <span className="px-3 py-1 text-sm font-bold">{item.qty}</span>
                      <button onClick={() => updateQty(item.lineId, 1)} className="px-2 py-1 bg-gray-50 hover:bg-gray-100">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.lineId)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExpandedItemId(expandedItemId === item.lineId ? null : item.lineId)}
                    disabled={(item.availableAddOnIds || []).length === 0}
                    className={`text-xs font-bold px-3 py-1 rounded-lg border ${((item.availableAddOnIds || []).length === 0) ? 'border-gray-200 text-gray-300' : 'border-dimsum-red text-dimsum-red hover:bg-red-50'}`}
                  >
                    Add-on
                  </button>
                  <span className="text-xs font-mono text-gray-600">
                    Rp {(getUnitPrice(item) * item.qty).toLocaleString()}
                  </span>
                </div>

                {expandedItemId === item.lineId && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                    {(item.availableAddOnIds || []).map((addOnId) => addOnById[addOnId]).filter(Boolean).length === 0 ? (
                      <p className="text-xs text-gray-400">Tidak ada add-on untuk menu ini</p>
                    ) : (
                      (item.availableAddOnIds || []).map((addOnId) => {
                        const addOn = addOnById[addOnId]
                        if (!addOn) return null
                        return (
                          <label key={addOn.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-700">
                              {addOn.name}
                              <span className="text-gray-400 text-xs"> (+Rp {addOn.price.toLocaleString()})</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={(item.selectedAddOnIds || []).includes(addOn.id)}
                              onChange={() => requestToggleAddOn(item.lineId, addOn.id)}
                            />
                          </label>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t rounded-b-2xl space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-dimsum-dark pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-dimsum-red">Rp {total.toLocaleString()}</span>
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => { setPaymentMethod('Cash'); setCashAmount('') }}
                className={`py-2 rounded-lg border-2 font-bold transition-all ${paymentMethod === 'Cash' ? 'border-dimsum-red bg-red-50 text-dimsum-red' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                CASH
              </button>
              <button 
                onClick={() => { setPaymentMethod('QRIS'); setCashAmount('') }}
                className={`py-2 rounded-lg border-2 font-bold transition-all ${paymentMethod === 'QRIS' ? 'border-dimsum-red bg-red-50 text-dimsum-red' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
              >
                QRIS
              </button>
            </div>
          </div>

          {paymentMethod === 'Cash' && (
            <div className="pt-2 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Uang Diterima (Rp)
                </label>
                <input 
                  type="number" 
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border rounded-lg text-lg font-mono outline-none focus:ring-2 focus:ring-dimsum-red"
                />
              </div>
              <div className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                <span className="text-sm font-bold text-gray-600">Kembalian</span>
                <span className={`text-lg font-black font-mono ${changeAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  Rp {changeAmount.toLocaleString()}
                </span>
              </div>
            </div>
          )}
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || !paymentMethod || !openShiftId || (paymentMethod === 'Cash' && (Number(cashAmount) < total || !cashAmount))}
            className="w-full bg-dimsum-red text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all disabled:bg-gray-300 disabled:shadow-none mt-4"
          >
            {!openShiftId && cart.length > 0
              ? 'Buka Shift Dulu'
              : !paymentMethod && cart.length > 0
                ? 'Pilih Pembayaran'
                : paymentMethod === 'Cash' && Number(cashAmount) < total
                  ? 'Uang Kurang'
                  : 'Bayar Sekarang'}
          </button>
        </div>
      </div>

      {showSuccess && !showReceipt && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl text-center shadow-2xl scale-in-center">
            <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Transaksi Berhasil!</h3>
            <p className="text-gray-500">Pesanan telah disimpan dalam riwayat.</p>
          </div>
        </div>
      )}

      {showReceipt && receiptTransaction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-dimsum-dark">Cetak Struk</h3>
                  <p className="text-xs text-gray-500">Trans #{receiptTransaction.id.toString().slice(-6)} • {new Date(receiptTransaction.date).toLocaleString('id-ID')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReceipt(false)}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {receiptTransaction.customerName && (
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Pelanggan</span>
                  <span className="font-bold text-dimsum-dark">{receiptTransaction.customerName}</span>
                </div>
              )}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono">Rp {(receiptTransaction.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-dimsum-dark pt-3 mt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-dimsum-red font-mono">Rp {(receiptTransaction.total || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                {(receiptTransaction.items || []).map((item, idx) => {
                  const addOnTotal = getAddOnTotal(item.addOns)
                  const unit = (item.price || 0) + addOnTotal
                  return (
                    <div key={`${receiptTransaction.id}-${idx}`} className="p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-dimsum-dark">{item.name}</p>
                          {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              {item.addOns.map(a => `${a.name} (+Rp ${a.price.toLocaleString()})`).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-mono">{item.qty} x Rp {unit.toLocaleString()}</p>
                          <p className="text-sm font-black text-dimsum-red font-mono mt-1">Rp {(unit * item.qty).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {receiptTransaction.paymentMethod === 'Cash' && (
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Uang Tunai</span>
                    <span className="font-mono">Rp {(receiptTransaction.cashAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-dimsum-dark font-bold">
                    <span>Kembalian</span>
                    <span className="font-mono">Rp {(receiptTransaction.changeAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-white">
              <button
                type="button"
                onClick={() => openPrintWindow(receiptTransaction)}
                className="w-full bg-dimsum-red text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all"
              >
                Print Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAddOnAction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-black text-dimsum-dark">Terapkan Add-on</h3>
              <p className="text-xs text-gray-500 mt-1">Pilih add-on untuk 1 porsi atau semua porsi pada item ini</p>
            </div>
            <div className="p-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  splitLineItem(pendingAddOnAction.lineId, 1, pendingAddOnAction.nextSelectedAddOnIds)
                  setPendingAddOnAction(null)
                }}
                className="w-full bg-dimsum-yellow text-dimsum-dark py-3 rounded-xl font-bold hover:opacity-90 transition-all"
              >
                1 Porsi Saja
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleAddOnForItem(pendingAddOnAction.lineId, pendingAddOnAction.addOnId)
                  setPendingAddOnAction(null)
                }}
                className="w-full bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Semua Porsi
              </button>
              <button
                type="button"
                onClick={() => setPendingAddOnAction(null)}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {showOpenShift && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-black text-dimsum-dark">Buka Shift</h3>
              <p className="text-xs text-gray-500 mt-1">Masukkan saldo kasir awal</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red font-mono"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openShift(openingBalance)
                    setOpeningBalance('')
                    setShowOpenShift(false)
                  }}
                  className="flex-1 bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOpenShift(false); setOpeningBalance('') }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloseShift && openShiftId && openShiftData && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-black text-dimsum-dark">Tutup Shift</h3>
              <p className="text-xs text-gray-500 mt-1">Masukkan total uang tunai yang ada di kasir</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Saldo Awal</span>
                  <span className="font-mono">Rp {(openShiftData.openingBalance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Tunai Aktual (Rp)</label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red font-mono"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    closeShift(closingCash)
                    setClosingCash('')
                    setShowCloseShift(false)
                    setCart([])
                    setPaymentMethod('')
                    setCustomerName('')
                    setCashAmount('')
                    setExpandedItemId(null)
                    setPendingAddOnAction(null)
                  }}
                  disabled={!closingCash}
                  className="flex-1 bg-dimsum-dark text-white py-3 rounded-xl font-bold hover:bg-black transition-all disabled:bg-gray-300"
                >
                  Tutup Shift
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCloseShift(false); setClosingCash('') }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashierView
