import React, { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Calendar, Filter, Receipt } from 'lucide-react'

const TransactionsView = ({ mode }) => {
  const { transactions } = useStore()
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all')
  const [filterCoupon, setFilterCoupon] = useState('all')
  const [pageSize, setPageSize] = useState('10')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)

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
