import React, { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Calendar, Filter, Timer } from 'lucide-react'

const ShiftHistoryView = () => {
  const { shifts, transactions } = useStore()
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const filteredShifts = useMemo(() => {
    const list = (shifts || []).slice().sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))

    if (filterDate) {
      return list.filter(s => {
        const dt = new Date(s.openedAt)
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        const d = String(dt.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}` === filterDate
      })
    }

    if (filterMonth) {
      return list.filter(s => {
        const dt = new Date(s.openedAt)
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        return `${y}-${m}` === filterMonth
      })
    }

    return list
  }, [shifts, filterDate, filterMonth])

  const shiftSummary = useMemo(() => {
    const tx = transactions || []
    return filteredShifts.map(s => {
      const shiftTx = tx.filter(t => t.shiftId === s.id)
      const cashSales = shiftTx.filter(t => t.paymentMethod === 'Cash').reduce((acc, t) => acc + (Number(t.total) || 0), 0)
      const qrisSales = shiftTx.filter(t => t.paymentMethod === 'QRIS').reduce((acc, t) => acc + (Number(t.total) || 0), 0)
      const opening = Number(s.openingBalance) || 0
      const expectedCash = opening + cashSales

      const finalCashSales = s.closedAt ? (Number(s.cashSales) || 0) : cashSales
      const finalQrisSales = s.closedAt ? (Number(s.qrisSales) || 0) : qrisSales
      const finalExpectedCash = s.closedAt ? (Number(s.expectedCash) || 0) : expectedCash
      const finalClosingCash = s.closedAt ? (Number(s.closingCash) || 0) : null
      const finalDifference = s.closedAt ? (Number(s.difference) || 0) : null

      return {
        ...s,
        transactionsCount: shiftTx.length,
        cashSales: finalCashSales,
        qrisSales: finalQrisSales,
        expectedCash: finalExpectedCash,
        closingCash: finalClosingCash,
        difference: finalDifference,
      }
    })
  }, [filteredShifts, transactions])

  const totals = useMemo(() => {
    const closed = shiftSummary.filter(s => s.closedAt)
    const cashSales = closed.reduce((acc, s) => acc + (Number(s.cashSales) || 0), 0)
    const qrisSales = closed.reduce((acc, s) => acc + (Number(s.qrisSales) || 0), 0)
    return {
      shifts: shiftSummary.length,
      closed: closed.length,
      cashSales,
      qrisSales,
    }
  }, [shiftSummary])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Timer className="text-dimsum-red" />
            <div>
              <h3 className="text-xl font-bold text-dimsum-dark">History Shift</h3>
              <p className="text-xs text-gray-500">Rekap per shift (tunai vs QRIS) + selisih kas</p>
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
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Shift</p>
            <p className="text-2xl font-black text-dimsum-dark">{totals.shifts}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Shift Selesai</p>
            <p className="text-2xl font-black text-dimsum-dark">{totals.closed}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tunai</p>
            <p className="text-2xl font-black text-dimsum-dark">Rp {totals.cashSales.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">QRIS</p>
            <p className="text-2xl font-black text-dimsum-dark">Rp {totals.qrisSales.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {shiftSummary.length === 0 ? (
          <p className="text-center py-12 text-gray-400">Belum ada shift</p>
        ) : (
          <div className="space-y-3">
            {shiftSummary.map((s) => {
              const isExpanded = expandedId === s.id
              const isOpen = !s.closedAt
              return (
                <div key={s.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <p className="font-black text-dimsum-dark">Shift #{String(s.id).slice(-6)}</p>
                        <p className="text-xs text-gray-500">Buka: {new Date(s.openedAt).toLocaleString('id-ID')}</p>
                        <p className="text-xs text-gray-500">Tutup: {s.closedAt ? new Date(s.closedAt).toLocaleString('id-ID') : '-'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isOpen ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {isOpen ? 'AKTIF' : 'SELESAI'}
                        </span>
                        <span className="text-xs text-gray-500">{s.transactionsCount} transaksi</span>
                        <span className="text-sm font-black text-dimsum-red">Rp {(Number(s.cashSales) + Number(s.qrisSales)).toLocaleString()}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Saldo Awal</p>
                          <p className="font-black text-dimsum-dark">Rp {(Number(s.openingBalance) || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Tunai</p>
                          <p className="font-black text-dimsum-dark">Rp {(Number(s.cashSales) || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">QRIS</p>
                          <p className="font-black text-dimsum-dark">Rp {(Number(s.qrisSales) || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Ekspektasi Tunai</p>
                          <p className="font-black text-dimsum-dark">Rp {(Number(s.expectedCash) || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Tunai Aktual</p>
                          <p className="font-black text-dimsum-dark">
                            {s.closingCash === null ? '-' : `Rp ${Number(s.closingCash).toLocaleString()}`}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Selisih</p>
                          <p className={`font-black ${s.difference === null ? 'text-gray-400' : Number(s.difference) === 0 ? 'text-green-600' : Number(s.difference) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {s.difference === null ? '-' : `Rp ${Number(s.difference).toLocaleString()}`}
                          </p>
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

export default ShiftHistoryView
