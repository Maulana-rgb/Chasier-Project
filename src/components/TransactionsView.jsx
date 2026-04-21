import React, { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Calendar, Filter, Receipt } from 'lucide-react'

const TransactionsView = ({ mode }) => {
  const { transactions } = useStore()
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
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
  }, [transactions, mode, todayKey, filterDate, filterMonth])

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
                  }}
                  className="p-2 border rounded-lg text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { setFilterDate(''); setFilterMonth('') }}
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
            {filteredTransactions.map((t) => {
              const isExpanded = expandedId === t.id
              const itemsCount = (t.items || []).reduce((acc, item) => acc + (item.qty || 0), 0)
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
                        <span className="text-xs text-gray-500">{itemsCount} item</span>
                        <span className="text-sm font-black text-dimsum-red">Rp {(t.total || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Subtotal</p>
                          <p className="font-black text-dimsum-dark">Rp {(t.subtotal || 0).toLocaleString()}</p>
                        </div>
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
