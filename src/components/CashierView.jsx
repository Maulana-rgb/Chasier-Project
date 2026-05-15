import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { ShoppingCart, Search, Trash2, CheckCircle, Clock, Download } from 'lucide-react'
import QRCode from 'qrcode'

const CashierView = ({ view = 'pos' }) => {
  const { 
    menus, addOns, categories, shifts, openShiftId, openShift, closeShift, addTransaction, previewCoupon, receiptSettings, generateQrisDynamic, pendingOrders, createPendingOrder, deletePendingOrder
  } = useStore()

  const [cart, setCart] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
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
  const [closeShiftSummary, setCloseShiftSummary] = useState(null)
  const [shiftNotice, setShiftNotice] = useState(null)
  const [shiftBusy, setShiftBusy] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)
  const [qrisBusy, setQrisBusy] = useState(false)
  const [qrisError, setQrisError] = useState('')
  const [qrisPayload, setQrisPayload] = useState('')
  const [qrisDataUrl, setQrisDataUrl] = useState('')
  const [activePendingId, setActivePendingId] = useState(null)
  const [expandedPendingId, setExpandedPendingId] = useState(null)
  const [pendingBusy, setPendingBusy] = useState(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)

  const toDigits = (value) => String(value || '').replace(/\D/g, '')
  const formatIdr = (digits) => digits ? Number(digits).toLocaleString('id-ID') : ''

  const createLineId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const getAddOnKey = (selectedAddOnIds) => {
    return (selectedAddOnIds || []).slice().sort((a, b) => a - b).join(',')
  }

  const normalizedQuery = String(searchQuery || '').trim().toLowerCase()
  const visibleMenus = menus.filter((m) => {
    if (selectedCategory !== 'Semua' && m.category !== selectedCategory) return false
    if (!normalizedQuery) return true
    return String(m.name || '').toLowerCase().includes(normalizedQuery)
  })

  const addToCart = (menu) => {
    const key = getAddOnKey([])
    const existing = cart.find(item =>
      item.menuId === menu.id &&
      getAddOnKey(item.selectedAddOnIds) === key &&
      String(item.note || '').trim() === ''
    )
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
        note: '',
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

  const updateNote = (lineId, note) => {
    setCart(cart.map(item => item.lineId === lineId ? { ...item, note } : item))
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
        getAddOnKey(i.selectedAddOnIds) === getAddOnKey(newLine.selectedAddOnIds) &&
        String(i.note || '').trim() === String(newLine.note || '').trim()
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
  const cartItemCount = cart.reduce((acc, item) => acc + (Number(item.qty) || 0), 0)
  const discountAmount = Math.max(0, Math.min(subtotal, Number(appliedCoupon?.discountAmount) || 0))
  const total = Math.max(0, subtotal - discountAmount)
  const changeAmount = paymentMethod === 'Cash' && Number(cashAmount) > total ? Number(cashAmount) - total : 0

  const openShiftData = openShiftId ? (shifts || []).find(s => s.id === openShiftId) : null
  const hasPendingOrders = (pendingOrders || []).length > 0
  const prevSubtotalRef = useRef(subtotal)

  useEffect(() => {
    const prevSubtotal = prevSubtotalRef.current
    prevSubtotalRef.current = subtotal
    if (!appliedCoupon) return
    if (prevSubtotal === subtotal) return
    setAppliedCoupon(null)
    setCouponError('Kupon perlu di-apply ulang karena subtotal berubah.')
  }, [subtotal, appliedCoupon])

  const getCouponErrorText = (code) => {
    const c = String(code || '')
    if (c === 'COUPON_NOT_FOUND') return 'Kupon tidak ditemukan.'
    if (c === 'COUPON_INACTIVE') return 'Kupon nonaktif.'
    if (c === 'COUPON_USED') return 'Kupon sudah dipakai.'
    if (c === 'COUPON_USAGE_LIMIT') return 'Kupon sudah mencapai batas pemakaian.'
    if (c === 'COUPON_EXPIRED') return 'Kupon sudah expired.'
    if (c === 'COUPON_NOT_YET_VALID') return 'Kupon belum berlaku.'
    return 'Kupon tidak valid.'
  }

  const clearCoupon = () => {
    setAppliedCoupon(null)
    setCouponError('')
    setCouponCode('')
  }

  const handleApplyCoupon = async () => {
    const code = String(couponCode || '').trim()
    if (!code) return
    if (couponBusy) return
    setCouponError('')
    setCouponBusy(true)
    try {
      const result = await previewCoupon({ code, subtotal })
      if (result?.valid) {
        setAppliedCoupon({ code: result.code, discountAmount: Number(result.discountAmount) || 0 })
        return
      }
      setAppliedCoupon(null)
      setCouponError(getCouponErrorText(result?.error))
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(getCouponErrorText(err?.data?.error || err?.message))
    } finally {
      setCouponBusy(false)
    }
  }

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
    const headerText = String(receiptSettings?.headerText || '').trim()
    const footerText = String(receiptSettings?.footerText || '').trim()
    const headerLines = headerText ? headerText.split('\n').map(s => s.trim()).filter(Boolean) : []
    const footerLines = footerText ? footerText.split('\n').map(s => s.trim()).filter(Boolean) : []
    const headerHtml = headerLines.length
      ? headerLines.map((line, idx) => idx === 0
        ? `<div class="bold header-main">${escapeHtml(line)}</div>`
        : `<div class="small muted">${escapeHtml(line)}</div>`
      ).join('')
      : ''
    const footerHtml = footerLines.map(line => `<div>${escapeHtml(line)}</div>`).join('')

    const itemsHtml = (transaction.items || []).map((item) => {
      const qty = Number(item.qty || 0)
      const baseUnit = Number(item.price || 0)
      const note = String(item.note || '').trim()
      const addOns = Array.isArray(item.addOns) ? item.addOns : []
      const addOnUnitTotal = getAddOnTotal(addOns)
      const lineTotal = (baseUnit + addOnUnitTotal) * qty
      const addOnsHtml = addOns.length > 0
        ? `<div class="muted small">${addOns.map(a => {
            const unitPrice = Number(a?.price || 0)
            const totalPrice = unitPrice * qty
            const priceText = qty > 1
              ? `+Rp ${unitPrice.toLocaleString('id-ID')} x ${qty} = Rp ${totalPrice.toLocaleString('id-ID')}`
              : `+Rp ${unitPrice.toLocaleString('id-ID')}`
            return `<div>${escapeHtml(a?.name || '')} (${priceText})</div>`
          }).join('')}</div>`
        : ''
      const noteHtml = note ? `<div class="muted small">${escapeHtml(note)}</div>` : ''

      return `
        <div class="row">
          <div style="flex:1;">
            <div class="bold">${escapeHtml(item.name)}</div>
            ${noteHtml}
            ${addOnsHtml}
          </div>
          <div class="right mono">${qty} x Rp ${baseUnit.toLocaleString('id-ID')}</div>
        </div>
        <div class="right mono" style="margin-top:4px;">Rp ${Number(lineTotal).toLocaleString('id-ID')}</div>
        <div class="divider"></div>
      `
    }).join('')

    const dateText = transaction.date ? new Date(transaction.date).toLocaleString('id-ID') : ''
    const txNo = transaction.publicId || (transaction.id ? String(transaction.id).slice(-6) : '')

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
            .small { font-size: 16px; }
            .header-main { font-size: 18px; }
            .divider { border-top: 1px dashed #bbb; margin: 10px 0; }
            .row { display: flex; gap: 12px; align-items: flex-start; }
            .totals { display: grid; grid-template-columns: 1fr auto; gap: 6px 10px; }
            .logo { display: block; margin: 0 auto 6px; width: 130px; height: auto; }
            @media print { body { padding: 0; } .receipt { width: 80mm; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <img class="logo" src="/receipt-logo.jpeg" alt="Dimsay" onerror="this.style.display='none'" />
              ${headerHtml}
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
              ${(Number(transaction.discountAmount || 0) > 0) ? `<div class="muted">Kupon${transaction.couponCode ? ` (${escapeHtml(transaction.couponCode)})` : ''}</div><div class="mono right">-Rp ${Number(transaction.discountAmount || 0).toLocaleString('id-ID')}</div>` : ''}
              <div class="bold">Total</div><div class="mono right bold">Rp ${Number(transaction.total || 0).toLocaleString('id-ID')}</div>
            </div>
            ${transaction.paymentMethod === 'Cash' ? `
            <div class="divider"></div>
            <div class="totals small">
              <div class="muted">Tunai</div><div class="mono right">Rp ${Number(transaction.cashAmount || 0).toLocaleString('id-ID')}</div>
              <div class="muted">Kembali</div><div class="mono right">Rp ${Number(transaction.changeAmount || 0).toLocaleString('id-ID')}</div>
            </div>
            ` : ''}
            ${footerLines.length ? `
            <div class="divider"></div>
            <div class="center small muted">
              ${footerHtml}
            </div>
            ` : ''}
          </div>
        </body>
      </html>
    `
  }

  const getOrderSlipHtml = (transaction) => {
    const itemsHtml = (transaction.items || []).map((item) => {
      const qty = Number(item.qty || 0)
      const note = String(item.note || '').trim()
      const addOns = Array.isArray(item.addOns) ? item.addOns : []
      const addOnsHtml = addOns.length > 0
        ? `<div class="muted small">${addOns.map(a => `<div>+ ${escapeHtml(a?.name || '')}</div>`).join('')}</div>`
        : ''
      const noteHtml = note ? `<div class="muted small">${escapeHtml(note)}</div>` : ''

      return `
        <div class="row">
          <div class="qty mono">${qty}</div>
          <div style="flex:1;">
            <div class="bold">${escapeHtml(item.name)}</div>
            ${noteHtml}
            ${addOnsHtml}
          </div>
        </div>
        <div class="divider"></div>
      `
    }).join('')

    const dateText = transaction.date ? new Date(transaction.date).toLocaleString('id-ID') : ''
    const txNo = transaction.publicId || (transaction.id ? String(transaction.id).slice(-6) : '')

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Pesanan</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; padding: 16px; }
            .receipt { width: 320px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: 800; }
            .muted { color: #666; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
            .small { font-size: 14px; }
            .title { font-size: 20px; letter-spacing: 1px; }
            .divider { border-top: 1px dashed #bbb; margin: 10px 0; }
            .row { display: flex; gap: 12px; align-items: flex-start; }
            .qty { width: 28px; text-align: right; font-size: 18px; font-weight: 800; }
            .logo { display: block; margin: 0 auto 6px; width: 130px; height: auto; }
            @media print { body { padding: 0; } .receipt { width: 80mm; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="bold title">PESANAN</div>
            </div>
            <div class="divider"></div>
            <div class="small">
              <div><span class="muted">No:</span> <span class="mono">#${escapeHtml(txNo)}</span></div>
              ${transaction.customerName ? `<div><span class="muted">Pelanggan:</span> <span class="mono">${escapeHtml(transaction.customerName)}</span></div>` : ''}
              <div><span class="muted">Tanggal:</span> <span class="mono">${escapeHtml(dateText)}</span></div>
            </div>
            <div class="divider"></div>
            ${itemsHtml}
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

  const openPrintOrderWindow = (transaction) => {
    if (!transaction) return

    const html = getOrderSlipHtml(transaction)
    const win = window.open('about:blank', 'dimsum_order', 'popup=yes,width=480,height=720')
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

  const handleGenerateQris = async () => {
    if (!receiptTransaction) return
    if (receiptTransaction.paymentMethod !== 'QRIS') return
    setQrisError('')
    setQrisBusy(true)
    try {
      const amount = Number(receiptTransaction.total || 0)
      const result = await generateQrisDynamic({ amount })
      const payload = String(result?.qris || '').trim()
      if (!payload) throw new Error('QRIS_EMPTY')
      const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 280 })
      setQrisPayload(payload)
      setQrisDataUrl(String(dataUrl || ''))
    } catch (err) {
      setQrisPayload('')
      setQrisDataUrl('')
      setQrisError(err?.data?.error || err?.message || 'Gagal generate QRIS')
    } finally {
      setQrisBusy(false)
    }
  }

  const handleSavePending = async () => {
    if (cart.length === 0) return
    if (pendingBusy) return
    setPendingBusy({ type: 'save' })
    const itemsForPending = cart.map(item => ({
      id: item.menuId,
      name: item.name,
      note: String(item.note || '').trim(),
      category: item.category,
      price: item.price,
      hpp: item.hpp || 0,
      qty: item.qty,
      addOns: getSelectedAddOns(item.selectedAddOnIds || []).map(a => ({ id: a.id, name: a.name, price: a.price, hpp: a.hpp || 0 })),
    }))

    try {
      await createPendingOrder({
        customerName,
        couponCode: appliedCoupon?.code || couponCode || '',
        items: itemsForPending,
      })

      setCart([])
      setPaymentMethod('')
      setCustomerName('')
      setCashAmount('')
      setCouponCode('')
      setAppliedCoupon(null)
      setCouponError('')
      setExpandedItemId(null)
      setActivePendingId(null)
    } finally {
      setPendingBusy(null)
    }
  }

  const handleLoadPending = (p) => {
    if (!p) return
    const nextCart = (p.items || []).map((item) => {
      const menu = menus.find(m => Number(m.id) === Number(item.menuId))
      const availableAddOnIds = menu?.addOnIds || []
      const selectedAddOnIds = (item.addOns || [])
        .map(a => a?.id)
        .filter(id => id !== null && id !== undefined)
        .map(id => Number(id))
      return {
        lineId: createLineId(),
        menuId: item.menuId,
        name: item.name,
        price: Number(item.price) || 0,
        hpp: Number(item.hpp) || 0,
        category: menu?.category || item.category || 'Lainnya',
        qty: Math.max(1, Number(item.qty) || 1),
        availableAddOnIds,
        selectedAddOnIds,
        note: String(item.note || ''),
      }
    })

    setCart(nextCart)
    setPaymentMethod('')
    setCustomerName(String(p.customerName || ''))
    const code = String(p.couponCode || '').trim()
    setCouponCode(code)
    setAppliedCoupon((code && Number(p.discountAmount || 0) > 0) ? { code, discountAmount: Number(p.discountAmount || 0) } : null)
    setCouponError('')
    setCashAmount('')
    setExpandedItemId(null)
    setActivePendingId(Number(p.id))
  }

  const handleRemovePending = async (id) => {
    const ok = window.confirm('Hapus pending transaksi ini?')
    if (!ok) return
    if (pendingBusy) return
    setPendingBusy({ type: 'delete', id: Number(id) })
    try {
      await deletePendingOrder(id)
      if (Number(activePendingId) === Number(id)) setActivePendingId(null)
      if (Number(expandedPendingId) === Number(id)) setExpandedPendingId(null)
    } finally {
      setPendingBusy(null)
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (!paymentMethod) return
    if (!openShiftId) return
    if (checkoutBusy) return
    setCheckoutBusy(true)

    const itemsForTransaction = cart.map(item => ({
      id: item.menuId,
      name: item.name,
      note: String(item.note || '').trim(),
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
      couponCode: appliedCoupon?.code || '',
      paymentMethod,
      customerName,
      cashAmount: paymentMethod === 'Cash' ? Number(cashAmount) : 0,
      changeAmount,
      shiftId: openShiftId,
      pendingOrderId: activePendingId,
    }

    try {
      const created = await addTransaction(transaction)
      setReceiptTransaction(created)
      setShowReceipt(true)
      setQrisBusy(false)
      setQrisError('')
      setQrisPayload('')
      setQrisDataUrl('')
      setActivePendingId(null)
      setCart([])
      setPaymentMethod('')
      setCustomerName('')
      setCashAmount('')
      setCouponCode('')
      setAppliedCoupon(null)
      setCouponError('')
      setExpandedItemId(null)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      setShiftNotice({
        title: 'Gagal Proses Transaksi',
        message: err?.data?.error || err?.message || 'Terjadi kesalahan saat memproses transaksi.',
      })
    } finally {
      setCheckoutBusy(false)
    }
  }

  const requestOpenShift = useCallback(() => {
    if (openShiftId) {
      setShiftNotice({
        title: 'Shift Sudah Aktif',
        message: 'Shift sudah dibuka. Tutup shift terlebih dahulu jika ingin memulai shift baru.',
      })
      return
    }
    setShowOpenShift(true)
  }, [openShiftId])

  const requestCloseShift = useCallback(() => {
    if (!openShiftId) {
      setShiftNotice({ title: 'Shift Belum Dibuka', message: 'Buka shift terlebih dahulu sebelum menutup shift.' })
      return
    }
    if (cart.length > 0) {
      setShiftNotice({ title: 'Tidak Bisa Tutup Shift', message: 'Kosongkan keranjang terlebih dahulu untuk tutup shift.' })
      return
    }
    if (hasPendingOrders) {
      setShiftNotice({ title: 'Tidak Bisa Tutup Shift', message: 'Hapus atau selesaikan pending transaksi terlebih dahulu untuk tutup shift.' })
      return
    }
    setShowCloseShift(true)
  }, [openShiftId, cart.length, hasPendingOrders])

  useEffect(() => {
    const onOpenShift = () => requestOpenShift()
    const onCloseShift = () => requestCloseShift()
    window.addEventListener('cashier:openShift', onOpenShift)
    window.addEventListener('cashier:closeShift', onCloseShift)
    return () => {
      window.removeEventListener('cashier:openShift', onOpenShift)
      window.removeEventListener('cashier:closeShift', onCloseShift)
    }
  }, [requestOpenShift, requestCloseShift])

  if (view === 'pending') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-dimsum-dark">Pending Transaksi</h3>
            <p className="text-sm text-gray-500 mt-1">Ambil kembali pesanan yang disimpan dari kasir.</p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-xs font-black text-dimsum-dark">
            {(pendingOrders || []).length} pending
          </div>
        </div>
        {pendingBusy && (
          <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-dimsum-red animate-spin" />
            <div className="text-sm font-bold text-gray-700">
              {pendingBusy.type === 'save' ? 'Menyimpan pending...' : 'Memproses...'}
            </div>
          </div>
        )}

        {(pendingOrders || []).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center text-gray-400">
            <Clock size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold">Belum ada pending</p>
            <p className="text-sm mt-1">Gunakan tombol Simpan Pending di kasir.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-3">
            {(pendingOrders || []).map((p) => {
              const itemsCount = (p.items || []).reduce((acc, it) => acc + (Number(it.qty) || 0), 0)
              const isActive = Number(activePendingId) === Number(p.id)
              const isExpanded = Number(expandedPendingId) === Number(p.id)
              return (
                <div key={p.id} className={`p-4 rounded-2xl border ${isActive ? 'border-dimsum-red bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-dimsum-dark">Pending #{String(p.id).slice(-6)}</p>
                        {isActive && (
                          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-dimsum-red text-white">
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString('id-ID') : ''}
                      </p>
                      {p.customerName && (
                        <p className="text-[11px] font-bold text-dimsum-red mt-1">Pelanggan: {p.customerName}</p>
                      )}
                      <p className="text-[11px] text-gray-600 mt-1">
                        {itemsCount} item • Rp {(Number(p.total) || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedPendingId(isExpanded ? null : Number(p.id))}
                        disabled={Boolean(pendingBusy)}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50"
                      >
                        {isExpanded ? 'Tutup Detail' : 'Lihat Pesanan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPending(p)}
                        disabled={Boolean(pendingBusy)}
                        className="px-4 py-2 rounded-xl bg-dimsum-dark text-white font-bold text-xs hover:bg-black"
                      >
                        Ambil ke Kasir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePending(p.id)}
                        disabled={Boolean(pendingBusy)}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {pendingBusy?.type === 'delete' && Number(pendingBusy?.id) === Number(p.id) && (
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-dimsum-red animate-spin" />
                        )}
                        Hapus
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {(p.couponCode || Number(p.discountAmount || 0) > 0) && (
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <div className="text-gray-600 font-bold">
                            Kupon{p.couponCode ? ` (${p.couponCode})` : ''}
                          </div>
                          <div className="font-mono font-bold text-dimsum-red">
                            {Number(p.discountAmount || 0) > 0 ? `-Rp ${(Number(p.discountAmount) || 0).toLocaleString('id-ID')}` : ''}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        {(p.items || []).map((it, idx) => {
                          const qty = Math.max(1, Number(it.qty) || 1)
                          const baseUnit = Number(it.price || 0)
                          const addOns = Array.isArray(it.addOns) ? it.addOns : []
                          const addOnUnitTotal = getAddOnTotal(addOns)
                          const unitTotal = baseUnit + addOnUnitTotal
                          const lineTotal = unitTotal * qty
                          const note = String(it.note || '').trim()
                          return (
                            <div key={`${p.id}-${idx}`} className="p-3 rounded-xl bg-white border border-gray-100">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-black text-dimsum-dark">{it.name}</p>
                                  {note && (
                                    <p className="text-[11px] text-gray-500 mt-0.5">{note}</p>
                                  )}
                                  {addOns.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {addOns.map((a) => (
                                        <div key={a.id ?? a.name} className="text-[11px] text-gray-500 font-mono">
                                          +Rp {(Number(a.price || 0) * qty).toLocaleString('id-ID')} {a.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-[11px] text-gray-600 font-mono">{qty} x Rp {baseUnit.toLocaleString('id-ID')}</p>
                                  <p className="text-sm font-black text-dimsum-red font-mono mt-1">Rp {Number(lineTotal).toLocaleString('id-ID')}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Menu List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-xl sm:text-2xl font-bold text-dimsum-dark">Menu Dimsum</h3>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari menu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-dimsum-red outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-72 p-2 border rounded-lg text-sm"
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
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400 overflow-hidden">
                {menu.image ? (
                  <img src={menu.image} alt={menu.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs">No Image</span>
                )}
              </div>
              <h4 className="font-bold text-dimsum-dark group-hover:text-dimsum-red">{menu.name}</h4>
              <p className="text-sm text-gray-500 mb-2">{menu.category}</p>
              <p className="font-mono text-dimsum-red font-bold">Rp {menu.price.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col self-start">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-dimsum-red" />
            <h3 className="text-xl font-bold">Keranjang Belanja</h3>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 max-h-[75vh]">
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
              <p>Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map(item => {
              const selected = getSelectedAddOns(item.selectedAddOnIds || [])
              const lineTotal = getUnitPrice(item) * item.qty
              return (
              <div key={item.lineId} className="p-4 border border-gray-100 rounded-xl bg-white">
                <div className="flex justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Rp {Number(item.price || 0).toLocaleString()} / porsi
                    </p>
                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={(e) => updateNote(item.lineId, e.target.value)}
                      placeholder="Catatan (opsional)"
                      className="mt-2 w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-dimsum-red outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQty(item.lineId, -1)}
                        className="w-12 h-12 bg-gray-50 hover:bg-gray-100 text-lg font-black flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-12 h-12 text-base font-black flex items-center justify-center">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.lineId, 1)}
                        className="w-12 h-12 bg-gray-50 hover:bg-gray-100 text-lg font-black flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.lineId)}
                      className="w-12 h-12 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all flex items-center justify-center"
                      aria-label="Hapus item"
                      title="Hapus item"
                    >
                      <Trash2 size={18} />
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
                  <div className="text-right">
                    <div className="text-xs font-mono text-gray-600">
                      Rp {Number(lineTotal).toLocaleString()}
                    </div>
                    {selected.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {selected.map((a) => {
                          const addOnTotal = Number(a.price || 0) * Number(item.qty || 0)
                          return (
                            <div key={a.id} className="text-[10px] text-gray-500 font-mono">
                              +Rp {addOnTotal.toLocaleString()} {a.name}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
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
              )
            })
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t rounded-b-2xl space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Nama Customer (Opsional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Masukkan nama..."
              className="w-full p-2 border rounded-lg bg-white text-sm focus:ring-2 focus:ring-dimsum-red outline-none"
            />
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Jumlah Item</span>
            <span>{cartItemCount}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>Rp {subtotal.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Diskon Kupon{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ''}</span>
              <span>-Rp {discountAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-dimsum-dark pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="text-dimsum-red">Rp {total.toLocaleString()}</span>
          </div>

          <div className="pt-2 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kupon</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Masukkan kode kupon"
                className="flex-1 p-2 border rounded-lg font-mono outline-none focus:ring-2 focus:ring-dimsum-red"
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="px-4 rounded-lg border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-100"
                >
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponBusy || !couponCode.trim() || cart.length === 0}
                  className="px-4 rounded-lg border-2 border-dimsum-red font-bold text-dimsum-red hover:bg-red-50 disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent flex items-center justify-center gap-2"
                >
                  {couponBusy ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-dimsum-red/40 border-t-dimsum-red animate-spin" />
                      Apply...
                    </>
                  ) : (
                    'Apply'
                  )}
                </button>
              )}
            </div>
            {couponError && (
              <div className="text-xs font-bold text-red-600">
                {couponError}
              </div>
            )}
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
                  type="text"
                  inputMode="numeric"
                  value={formatIdr(cashAmount)}
                  onChange={(e) => setCashAmount(toDigits(e.target.value))}
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
            disabled={checkoutBusy || cart.length === 0 || !paymentMethod || !openShiftId || (paymentMethod === 'Cash' && (Number(cashAmount) < total || !cashAmount))}
            className="w-full bg-dimsum-red text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all disabled:bg-gray-300 disabled:shadow-none mt-4 flex items-center justify-center gap-2"
          >
            {checkoutBusy ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                Memproses...
              </>
            ) : (
              (!openShiftId && cart.length > 0
                ? 'Buka Shift Dulu'
                : !paymentMethod && cart.length > 0
                  ? 'Pilih Pembayaran'
                  : paymentMethod === 'Cash' && Number(cashAmount) < total
                    ? 'Uang Kurang'
                    : 'Bayar Sekarang')
            )}
          </button>

          <button
            type="button"
            onClick={handleSavePending}
            disabled={cart.length === 0 || pendingBusy?.type === 'save'}
            className="w-full mt-2 bg-dimsum-dark text-white py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {pendingBusy?.type === 'save' ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Download size={18} /> Simpan Pending
              </>
            )}
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
                  <p className="text-xs text-gray-500">Trans #{receiptTransaction.publicId || receiptTransaction.id.toString().slice(-6)} • {new Date(receiptTransaction.date).toLocaleString('id-ID')}</p>
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
                {(receiptTransaction.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>Kupon{receiptTransaction.couponCode ? ` (${receiptTransaction.couponCode})` : ''}</span>
                    <span className="font-mono">-Rp {(receiptTransaction.discountAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black text-dimsum-dark pt-3 mt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span className="text-dimsum-red font-mono">Rp {(receiptTransaction.total || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3">
                {(receiptTransaction.items || []).map((item, idx) => {
                  const qty = Number(item.qty || 0)
                  const baseUnit = Number(item.price || 0)
                  const addOns = Array.isArray(item.addOns) ? item.addOns : []
                  const addOnUnitTotal = getAddOnTotal(addOns)
                  const lineTotal = (baseUnit + addOnUnitTotal) * qty
                  return (
                    <div key={`${receiptTransaction.id}-${idx}`} className="p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-dimsum-dark">{item.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-mono">{qty} x Rp {baseUnit.toLocaleString()}</p>
                          <p className="text-sm font-black text-dimsum-red font-mono mt-1">Rp {lineTotal.toLocaleString()}</p>
                          {addOns.length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              {addOns.map((a, aIdx) => {
                                const unitPrice = Number(a?.price || 0)
                                const totalPrice = unitPrice * qty
                                const priceText = qty > 1
                                  ? `+Rp ${unitPrice.toLocaleString()} x ${qty} = Rp ${totalPrice.toLocaleString()}`
                                  : `+Rp ${unitPrice.toLocaleString()}`
                                return (
                                  <div key={`${receiptTransaction.id}-${idx}-${aIdx}`} className="text-[10px] text-gray-500 font-mono">
                                    {a?.name} ({priceText})
                                  </div>
                                )
                              })}
                            </div>
                          )}
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

              {receiptTransaction.paymentMethod === 'QRIS' && (
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">QRIS</p>
                      <p className="text-sm font-bold text-dimsum-dark">Scan untuk bayar</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQris}
                      disabled={qrisBusy}
                      className="px-3 py-2 rounded-lg bg-dimsum-dark text-white font-bold text-sm hover:bg-black disabled:opacity-50"
                    >
                      {qrisBusy ? 'Generating…' : 'Generate QRIS'}
                    </button>
                  </div>

                  {qrisError && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-bold">
                      {qrisError}
                    </div>
                  )}

                  {qrisDataUrl && (
                    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col items-center gap-3">
                      <img src={qrisDataUrl} alt="QRIS" className="w-64 h-64 object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openPrintWindow(receiptTransaction)}
                  className="bg-dimsum-red text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 transition-all"
                >
                  Print Struk
                </button>
                <button
                  type="button"
                  onClick={() => openPrintOrderWindow(receiptTransaction)}
                  className="bg-dimsum-dark text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-black transition-all"
                >
                  Print Pesanan
                </button>
                {receiptTransaction.paymentMethod === 'QRIS' && (
                  <button
                    type="button"
                    onClick={handleGenerateQris}
                    disabled={qrisBusy}
                    className="sm:col-span-2 px-4 py-4 rounded-xl bg-gray-100 text-gray-700 font-bold shadow-lg hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    QRIS
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {shiftNotice && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-black text-dimsum-dark">{shiftNotice.title}</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 font-bold">{shiftNotice.message}</p>
              <button
                type="button"
                onClick={() => setShiftNotice(null)}
                className="w-full bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Oke
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
                  type="text"
                  inputMode="numeric"
                  value={formatIdr(openingBalance)}
                  onChange={(e) => setOpeningBalance(toDigits(e.target.value))}
                  disabled={shiftBusy?.type === 'open'}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red font-mono"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (shiftBusy) return
                    setShiftBusy({ type: 'open' })
                    try {
                      await openShift(openingBalance)
                      setOpeningBalance('')
                      setShowOpenShift(false)
                    } catch (err) {
                      setShiftNotice({
                        title: 'Gagal Buka Shift',
                        message: err?.data?.error || err?.message || 'Terjadi kesalahan saat membuka shift.',
                      })
                    } finally {
                      setShiftBusy(null)
                    }
                  }}
                  disabled={shiftBusy?.type === 'open'}
                  className="flex-1 bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {shiftBusy?.type === 'open' ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOpenShift(false); setOpeningBalance('') }}
                  disabled={shiftBusy?.type === 'open'}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
                  type="text"
                  inputMode="numeric"
                  value={formatIdr(closingCash)}
                  onChange={(e) => setClosingCash(toDigits(e.target.value))}
                  disabled={shiftBusy?.type === 'close'}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red font-mono"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (shiftBusy) return
                    setShiftBusy({ type: 'close' })
                    try {
                      const summary = await closeShift(closingCash)
                      setClosingCash('')
                      setShowCloseShift(false)
                      setCloseShiftSummary(summary)
                      setCart([])
                      setPaymentMethod('')
                      setCustomerName('')
                      setCashAmount('')
                      setExpandedItemId(null)
                      setPendingAddOnAction(null)
                    } catch (err) {
                      setShiftNotice({
                        title: 'Gagal Tutup Shift',
                        message: err?.data?.error || err?.message || 'Terjadi kesalahan saat menutup shift.',
                      })
                    } finally {
                      setShiftBusy(null)
                    }
                  }}
                  disabled={!closingCash || shiftBusy?.type === 'close'}
                  className="flex-1 bg-dimsum-dark text-white py-3 rounded-xl font-bold hover:bg-black transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {shiftBusy?.type === 'close' ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Tutup Shift'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCloseShift(false); setClosingCash('') }}
                  disabled={shiftBusy?.type === 'close'}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {closeShiftSummary && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-black text-dimsum-dark">Detail Tutup Shift</h3>
              <p className="text-xs text-gray-500 mt-1">Ringkasan hasil penutupan shift</p>
            </div>
            <div className="p-6 space-y-3">
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Saldo Awal</span>
                  <span className="font-mono">Rp {(closeShiftSummary.openingBalance || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Penjualan Cash</span>
                  <span className="font-mono">Rp {(closeShiftSummary.cashSales || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Penjualan QRIS</span>
                  <span className="font-mono">Rp {(closeShiftSummary.qrisSales || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Saldo Aktual</span>
                  <span className="font-mono">Rp {(closeShiftSummary.closingCash || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-dimsum-dark">Selisih</span>
                  <span className={`font-mono font-bold ${Number(closeShiftSummary.difference || 0) === 0 ? 'text-green-700' : 'text-red-700'}`}>
                    Rp {Number(closeShiftSummary.difference || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCloseShiftSummary(null)}
                className="w-full bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashierView
