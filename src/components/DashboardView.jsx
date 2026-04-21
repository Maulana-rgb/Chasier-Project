import React, { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { TrendingUp, DollarSign, ShoppingBag, Calendar, Filter } from 'lucide-react'

const DashboardView = () => {
  const { transactions } = useStore()
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const filteredTransactions = useMemo(() => {
    const sorted = transactions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))

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
  }, [transactions, filterDate, filterMonth])

  // Basic calculations
  const totalRevenue = filteredTransactions.reduce((acc, t) => acc + (t.total || 0), 0)
  const totalTransactions = filteredTransactions.length
  const totalItemsSold = filteredTransactions.reduce((acc, t) => {
    return acc + (t.items || []).reduce((sum, item) => sum + (item.qty || 0), 0)
  }, 0)

  // Top Selling Menu
  const itemCounts = {}
  filteredTransactions.forEach(t => {
    ;(t.items || []).forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty
    })
  })
  const topMenu = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const stats = [
    { label: 'Total Penjualan', value: `Rp ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-100 text-green-600' },
    { label: 'Jumlah Transaksi', value: totalTransactions, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
    { label: 'Item Terjual', value: totalItemsSold, icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-dimsum-dark">Summary Penjualan</h3>
            <p className="text-xs text-gray-500">Filter laporan berdasarkan hari atau bulan</p>
          </div>
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
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-4 rounded-xl ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-dimsum-dark">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="text-dimsum-red" />
            <h3 className="text-xl font-bold">Transaksi Terbaru</h3>
          </div>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Belum ada transaksi</p>
            ) : (
              filteredTransactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-sm">Trans #{t.publicId || t.id.toString().slice(-6)}</p>
                    <p className="text-xs text-gray-500">{new Date(t.date).toLocaleString('id-ID')}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {t.paymentMethod || 'N/A'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-dimsum-red">Rp {t.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{(t.items || []).length} item</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Products */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-dimsum-red" />
            <h3 className="text-xl font-bold">Menu Terlaris</h3>
          </div>
          <div className="space-y-4">
            {topMenu.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Belum ada data penjualan</p>
            ) : (
              topMenu.map(([name, count], idx) => (
                <div key={name} className="flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center bg-dimsum-yellow text-dimsum-dark font-bold rounded-lg text-sm">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{name}</span>
                      <span className="text-sm font-bold">{count} porsi</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="bg-dimsum-red h-2 rounded-full" 
                        style={{ width: `${topMenu[0][1] ? (count / topMenu[0][1]) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardView
