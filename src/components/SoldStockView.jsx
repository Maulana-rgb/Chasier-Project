import React, { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Calendar, Filter, Package } from 'lucide-react'

const SoldStockView = () => {
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

  const summary = useMemo(() => {
    const menuMap = new Map()
    const addOnMap = new Map()

    let transactionsCount = 0
    let menuQty = 0
    let addOnQty = 0
    let menuRevenue = 0
    let addOnRevenue = 0
    let menuProfit = 0
    let addOnProfit = 0

    filteredTransactions.forEach(t => {
      transactionsCount += 1
      ;(t.items || []).forEach(item => {
        const name = item?.name || '-'
        const qty = Number(item?.qty || 0)
        const price = Number(item?.price || 0)
        const hpp = Number(item?.hpp || 0)

        menuQty += qty
        menuRevenue += price * qty
        menuProfit += (price - hpp) * qty

        const prevMenu = menuMap.get(name) || { name, qty: 0, revenue: 0, profit: 0 }
        prevMenu.qty += qty
        prevMenu.revenue += price * qty
        prevMenu.profit += (price - hpp) * qty
        menuMap.set(name, prevMenu)

        const addOns = Array.isArray(item?.addOns) ? item.addOns : []
        addOns.forEach(addOn => {
          const addOnName = addOn?.name || '-'
          const addOnPrice = Number(addOn?.price || 0)
          const addOnHpp = Number(addOn?.hpp || 0)

          addOnQty += qty
          addOnRevenue += addOnPrice * qty
          addOnProfit += (addOnPrice - addOnHpp) * qty

          const prevAddOn = addOnMap.get(addOnName) || { name: addOnName, qty: 0, revenue: 0, profit: 0 }
          prevAddOn.qty += qty
          prevAddOn.revenue += addOnPrice * qty
          prevAddOn.profit += (addOnPrice - addOnHpp) * qty
          addOnMap.set(addOnName, prevAddOn)
        })
      })
    })

    const menus = Array.from(menuMap.values()).sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty
      return a.name.localeCompare(b.name, 'id-ID')
    })

    const addOns = Array.from(addOnMap.values()).sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty
      return a.name.localeCompare(b.name, 'id-ID')
    })

    return {
      menus,
      addOns,
      transactionsCount,
      menuQty,
      addOnQty,
      menuRevenue,
      addOnRevenue,
      menuProfit,
      addOnProfit,
    }
  }, [filteredTransactions])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="text-dimsum-red" />
            <div>
              <h3 className="text-xl font-bold text-dimsum-dark">Stock Penjualan</h3>
              <p className="text-xs text-gray-500">Rekap jumlah menu & add-on yang terjual</p>
            </div>
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Transaksi</p>
            <p className="text-2xl font-black text-dimsum-dark">{summary.transactionsCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Menu Terjual</p>
            <p className="text-2xl font-black text-dimsum-dark">{summary.menuQty}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Add-on Terjual</p>
            <p className="text-2xl font-black text-dimsum-dark">{summary.addOnQty}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Laba</p>
            <p className="text-2xl font-black text-dimsum-red">Rp {(summary.menuProfit + summary.addOnProfit).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Omzet Menu</p>
            <p className="text-xl font-black text-dimsum-dark">Rp {summary.menuRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Omzet Add-on</p>
            <p className="text-xl font-black text-dimsum-dark">Rp {summary.addOnRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Omzet Total</p>
            <p className="text-xl font-black text-dimsum-red">Rp {(summary.menuRevenue + summary.addOnRevenue).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-dimsum-dark">Main Menu Terjual</h3>
          <span className="text-xs text-gray-500 font-bold">Total: {summary.menuQty}</span>
        </div>

        {summary.menus.length === 0 ? (
          <p className="text-center py-10 text-gray-400">Belum ada data penjualan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 px-4">Nama Menu</th>
                  <th className="py-3 px-4 text-right">Terjual</th>
                  <th className="py-3 px-4 text-right">Omzet</th>
                  <th className="py-3 px-4 text-right">Laba</th>
                </tr>
              </thead>
              <tbody>
                {summary.menus.map((m) => (
                  <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium">{m.name}</td>
                    <td className="py-3 px-4 text-right font-mono">{m.qty}</td>
                    <td className="py-3 px-4 text-right font-mono text-dimsum-red">Rp {m.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono">Rp {m.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-dimsum-dark">Add-on Terjual</h3>
          <span className="text-xs text-gray-500 font-bold">Total: {summary.addOnQty}</span>
        </div>

        {summary.addOns.length === 0 ? (
          <p className="text-center py-10 text-gray-400">Belum ada add-on terjual</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  <th className="py-3 px-4">Nama Add-on</th>
                  <th className="py-3 px-4 text-right">Terjual</th>
                  <th className="py-3 px-4 text-right">Omzet</th>
                  <th className="py-3 px-4 text-right">Laba</th>
                </tr>
              </thead>
              <tbody>
                {summary.addOns.map((a) => (
                  <tr key={a.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium">{a.name}</td>
                    <td className="py-3 px-4 text-right font-mono">{a.qty}</td>
                    <td className="py-3 px-4 text-right font-mono text-dimsum-red">Rp {a.revenue.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono">Rp {a.profit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default SoldStockView
