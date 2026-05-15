import React, { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Calendar, Filter, Receipt, Trash2, Printer } from 'lucide-react'

const TransactionsView = ({ mode }) => {
  const { transactions, currentUser, deleteTransaction, receiptSettings } = useStore()
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all')
  const [filterCoupon, setFilterCoupon] = useState('all')
  const [pageSize, setPageSize] = useState('10')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)

  const canDelete = mode === 'owner' && currentUser?.role === 'owner'

  const handleDeleteTransaction = async (id) => {
    if (!canDelete) return
    const ok = window.confirm('Hapus transaksi ini? (Soft delete, data tetap tersimpan di database)')
    if (!ok) return
    setExpandedId(null)
    await deleteTransaction(id)
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

  const todayKey = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  const filteredTransactions = useMemo(() => {
    const sorted = transactions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (mode === 'cashier') {
      return sorted.filter(t => {
        const dt = new Date(t.date)
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        const d = String(dt.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}` === todayKey
      })
    }

    const base = (() => {
      if (filterDate) {
        return sorted.filter(t => {
          const dt = new Date(t.date)
          const y = dt.getFullYear()
          const m = String(dt.getMonth() + 1).padStart(2, '0')
          const d = String(dt.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}` === filterDate
        })
      }
      if (filterMonth) {
        return sorted.filter(t => {
          const dt = new Date(t.date)
          const y = dt.getFullYear()
          const m = String(dt.getMonth() + 1).padStart(2, '0')
          return `${y}-${m}` === filterMonth
        })
      }
      return sorted
    })()

    const byPayment = filterPaymentMethod === 'all'
      ? base
      : base.filter(t => String(t.paymentMethod || '') === filterPaymentMethod)

    if (filterCoupon === 'all') return byPayment

    return byPayment.filter(t => {
      const code = String(t.couponCode || '').trim()
      const discount = Number(t.discountAmount || 0)
      const hasCoupon = Boolean(code) && discount > 0
      return filterCoupon === 'with' ? hasCoupon : !hasCoupon
    })
  }, [transactions, mode, todayKey, filterDate, filterMonth, filterPaymentMethod, filterCoupon])

  const paginationMeta = useMemo(() => {
    if (mode !== 'owner') return { total: filteredTransactions.length, totalPages: 1, page: 1, pageSize: filteredTransactions.length }
    if (pageSize === 'all') return { total: filteredTransactions.length, totalPages: 1, page: 1, pageSize: filteredTransactions.length }
    const size = Math.max(1, Number(pageSize) || 10)
    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / size))
    const safePage = Math.min(Math.max(1, page), totalPages)
    return { total: filteredTransactions.length, totalPages, page: safePage, pageSize: size }
  }, [filteredTransactions.length, mode, page, pageSize])

  const paginatedTransactions = useMemo(() => {
    if (mode !== 'owner') return filteredTransactions
    if (pageSize === 'all') return filteredTransactions
    const size = paginationMeta.pageSize
    const start = (paginationMeta.page - 1) * size
    return filteredTransactions.slice(start, start + size)
  }, [filteredTransactions, mode, pageSize, paginationMeta.page, paginationMeta.pageSize])

  const summary = useMemo(() => {
    const totalRevenue = filteredTransactions.reduce((acc, t) => acc + (t.total || 0), 0)
    return { count: filteredTransactions.length, revenue: totalRevenue }
  }, [filteredTransactions])

  const title = mode === 'cashier' ? 'Transaksi Hari Ini' : 'Semua Transaksi'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Receipt className="text-dimsum-red" />
            <div>
              <h3 className="text-xl font-bold text-dimsum-dark">{title}</h3>
              {mode === 'cashier' && (
                <p className="text-xs text-gray-500">Tanggal: {new Date().toLocaleDateString('id-ID')}</p>
              )}
            </div>
          </div>

          {mode === 'owner' && (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Filter size={14} /> Filter Hari
                </label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value)
                    if (e.target.value) setFilterMonth('')
                    setExpandedId(null)
                    setPage(1)
                  }}
                  className="p-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={14} /> Filter Bulan
                </label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value)
                    if (e.target.value) setFilterDate('')
                    setExpandedId(null)
                    setPage(1)
                  }}
                  className="p-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Metode
                </label>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => {
                    setFilterPaymentMethod(e.target.value)
                    setExpandedId(null)
                    setPage(1)
                  }}
                  className="p-2 border rounded-lg text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="Cash">Cash</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Kupon
                </label>
                <select
                  value={filterCoupon}
                  onChange={(e) => {
                    setFilterCoupon(e.target.value)
                    setExpandedId(null)
                    setPage(1)
                  }}
                  className="p-2 border rounded-lg text-sm"
                >
                  <option value="all">Semua</option>
                  <option value="with">Pakai Kupon</option>
                  <option value="without">Tanpa Kupon</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Per Hal.
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value)
                    setExpandedId(null)
                    setPage(1)
                  }}
                  className="p-2 border rounded-lg text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="all">Semua</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterDate('')
                  setFilterMonth('')
                  setFilterPaymentMethod('all')
                  setFilterCoupon('all')
                  setPageSize('10')
                  setPage(1)
                  setExpandedId(null)
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {mode === 'owner' ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Jumlah Transaksi</p>
              <p className="text-2xl font-black text-dimsum-dark">{summary.count}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Penjualan</p>
              <p className="text-2xl font-black text-dimsum-red">Rp {summary.revenue.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Jumlah Transaksi</p>
              <p className="text-2xl font-black text-dimsum-dark">{summary.count}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {filteredTransactions.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Belum ada transaksi</p>
        ) : (
          <div className="space-y-3">
            {mode === 'owner' && pageSize !== 'all' && paginationMeta.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                <div className="text-xs text-gray-500">
                  Menampilkan {paginationMeta.total === 0 ? 0 : ((paginationMeta.page - 1) * paginationMeta.pageSize + 1)}-{Math.min(paginationMeta.total, paginationMeta.page * paginationMeta.pageSize)} dari {paginationMeta.total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setExpandedId(null); setPage(Math.max(1, paginationMeta.page - 1)) }}
                    disabled={paginationMeta.page <= 1}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <div className="text-xs text-gray-600 font-bold">
                    {paginationMeta.page} / {paginationMeta.totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setExpandedId(null); setPage(Math.min(paginationMeta.totalPages, paginationMeta.page + 1)) }}
                    disabled={paginationMeta.page >= paginationMeta.totalPages}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {paginatedTransactions.map((t) => {
              const isExpanded = expandedId === t.id
              const itemsCount = (t.items || []).reduce((acc, item) => acc + (item.qty || 0), 0)
              const couponCode = String(t.couponCode || '').trim()
              const discountAmount = Number(t.discountAmount || 0)
              const hasCoupon = Boolean(couponCode) && discountAmount > 0
              return (
                <div key={t.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-black text-dimsum-dark">Trans #{t.publicId || t.id.toString().slice(-6)}</p>
                        <p className="text-xs text-gray-500">{new Date(t.date).toLocaleString('id-ID')}</p>
                        {t.customerName && (
                          <p className="text-xs font-medium text-dimsum-red mt-1">Pelanggan: {t.customerName}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                          {t.paymentMethod || 'N/A'}
                        </span>
                        {hasCoupon && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                            Kupon{couponCode ? `: ${couponCode}` : ''}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">{itemsCount} item</span>
                        <span className="text-sm font-black text-dimsum-red">Rp {(t.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openPrintWindow(t)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-dimsum-dark text-white font-bold text-xs hover:bg-black"
                        >
                          <Printer size={14} /> Print Struk
                        </button>
                        <button
                          type="button"
                          onClick={() => openPrintOrderWindow(t)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-dimsum-red text-white font-bold text-xs hover:bg-red-700"
                        >
                          <Receipt size={14} /> Print Pesanan
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700"
                          >
                            <Trash2 size={14} /> Hapus Transaksi
                          </button>
                        )}
                      </div>
                      <div className={`grid grid-cols-1 ${hasCoupon ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3`}>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Subtotal</p>
                          <p className="font-black text-dimsum-dark">Rp {(t.subtotal || 0).toLocaleString()}</p>
                        </div>
                        {hasCoupon && (
                          <div className="p-3 bg-white rounded-xl border border-gray-100">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Kupon</p>
                            <p className="font-black text-dimsum-dark">{couponCode}</p>
                            <p className="text-sm font-black text-dimsum-red">-Rp {discountAmount.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Total</p>
                          <p className="font-black text-dimsum-red">Rp {(t.total || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {t.paymentMethod === 'Cash' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 bg-white rounded-xl border border-gray-100">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Uang Diterima</p>
                            <p className="font-bold text-gray-700">Rp {(t.cashAmount || 0).toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-gray-100">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Kembalian</p>
                            <p className="font-bold text-gray-700">Rp {(t.changeAmount || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-bold text-sm text-dimsum-dark">Detail Item</p>
                        </div>
                        <div className="p-4 space-y-3">
                          {(t.items || []).map((item, idx) => (
                            <div key={`${t.id}-${idx}`} className="flex justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-bold text-sm text-dimsum-dark">{item.name}</p>
                                {String(item.note || '').trim() && (
                                  <p className="text-[10px] text-gray-500">
                                    Catatan: {String(item.note || '').trim()}
                                  </p>
                                )}
                                {Array.isArray(item.addOns) && item.addOns.length > 0 && (
                                  <p className="text-[10px] text-gray-500">
                                    {item.addOns.map(a => `${a.name} (+Rp ${a.price.toLocaleString()})`).join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{item.qty} x Rp {(item.price || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionsView
