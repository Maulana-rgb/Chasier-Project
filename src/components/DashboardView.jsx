import React from 'react'
import { useStore } from '../store/useStore'
import { TrendingUp, DollarSign, ShoppingBag, Users, Calendar } from 'lucide-react'

const DashboardView = () => {
  const { transactions, menus, members } = useStore()

  // Basic calculations
  const totalRevenue = transactions.reduce((acc, t) => acc + t.total, 0)
  const totalTransactions = transactions.length
  const totalItemsSold = transactions.reduce((acc, t) => acc + t.items.reduce((sum, item) => sum + item.qty, 0), 0)

  // Top Selling Menu
  const itemCounts = {}
  transactions.forEach(t => {
    t.items.forEach(item => {
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
    { label: 'Total Member', value: members.length, icon: Users, color: 'bg-purple-100 text-purple-600' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Belum ada transaksi</p>
            ) : (
              transactions.slice().reverse().slice(0, 5).map((t) => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-sm">Trans #{t.id.toString().slice(-6)}</p>
                    <p className="text-xs text-gray-500">{new Date(t.date).toLocaleString('id-ID')}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.paymentMethod === 'QRIS' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                      {t.paymentMethod || 'N/A'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-dimsum-red">Rp {t.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{t.items.length} item</p>
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
                        style={{ width: `${(count / topMenu[0][1]) * 100}%` }}
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