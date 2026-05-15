import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import CashierView from './components/CashierView'
import OwnerView from './components/OwnerView'
import DashboardView from './components/DashboardView'
import TransactionsView from './components/TransactionsView'
import SoldStockView from './components/SoldStockView'
import ShiftHistoryView from './components/ShiftHistoryView'
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react'

function App() {
  const { currentUser, login, logout, init, isAuthLoading, isDataLoading, openShiftId, shifts, pendingOrders } = useStore()
  const role = currentUser?.role || null
  const isCashier = role === 'cashier'
  const openShiftData = isCashier && openShiftId ? (shifts || []).find(s => Number(s.id) === Number(openShiftId)) : null
  const pendingCount = (pendingOrders || []).length

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fullscreenSupported = Boolean(document?.documentElement?.requestFullscreen)

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    handler()
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = async () => {
    if (!fullscreenSupported) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      await document.documentElement.requestFullscreen()
    } catch {
      // ignore
    }
  }

  const [cashierTab, setCashierTab] = useState('pos') // 'pos' | 'pending' | 'transactions'
  const [ownerTab, setOwnerTab] = useState('dashboard') // 'dashboard' | 'transactions' | 'shift' | 'sold' | 'management'

  useEffect(() => {
    init()
  }, [init])

  const handleLogin = async (e) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (!ok) {
      setLoginError('Username atau password salah')
      return
    }
    setLoginError('')
    setUsername('')
    setPassword('')
    setCashierTab('pos')
    setOwnerTab('dashboard')
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-sm font-bold text-gray-500">
          Memuat...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-dimsum-red text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <img src="/receipt-logo.jpeg" alt="Dimsay" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tighter italic leading-tight">DIMSUM DIMSAY</h1>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold opacity-80">BY MAHIA</p>
            </div>
          </div>

          {currentUser ? (
            <div className="w-full sm:w-auto flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-xs font-bold">{currentUser.username}</p>
                <p className="hidden sm:block text-[10px] uppercase tracking-widest font-bold opacity-80">{currentUser.role === 'owner' ? 'Owner' : 'Kasir'}</p>
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                disabled={!fullscreenSupported}
                className="p-2 rounded-lg bg-red-800/50 hover:bg-red-700/50 disabled:opacity-50"
                aria-label={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
                title={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              {isCashier && (
                <div className={`hidden sm:flex items-center px-3 py-2 rounded-lg font-bold text-xs ${openShiftData ? 'bg-emerald-500/20 text-white' : 'bg-white/15 text-white'}`}>
                  <span className="uppercase tracking-widest text-[10px] opacity-90">Shift</span>
                  <span className="mx-2 opacity-60">•</span>
                  {openShiftData ? (
                    <span>Aktif (Rp {(openShiftData.openingBalance || 0).toLocaleString('id-ID')})</span>
                  ) : (
                    <span>Belum dibuka</span>
                  )}
                </div>
              )}
              {isCashier && (
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event(openShiftId ? 'cashier:closeShift' : 'cashier:openShift'))
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-sm ${openShiftId ? 'bg-dimsum-dark text-white hover:bg-black' : 'bg-white text-dimsum-red hover:bg-red-50'}`}
                >
                  {openShiftId ? 'Tutup Shift' : 'Buka Shift'}
                </button>
              )}
              <button
                onClick={() => logout()}
                className="px-3 sm:px-4 py-2 rounded-lg bg-red-800/50 hover:bg-red-700/50 font-bold text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="w-full sm:w-auto flex items-center justify-end gap-3">
              <div className="text-xs font-bold opacity-80">Silakan login</div>
              <button
                type="button"
                onClick={toggleFullscreen}
                disabled={!fullscreenSupported}
                className="p-2 rounded-lg bg-red-800/50 hover:bg-red-700/50 disabled:opacity-50"
                aria-label={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
                title={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          )}
        </div>
      </nav>

      {!currentUser ? (
        <main className="flex-1 p-6 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-black text-dimsum-dark">Login</h2>
            <p className="text-sm text-gray-500 mt-1">Gunakan akun kasir atau owner</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red"
                  placeholder="masukkan username"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 pr-12 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red"
                    placeholder="masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={isDataLoading}
                className="w-full bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:bg-gray-300"
              >
                {isDataLoading ? 'Memuat...' : 'Masuk'}
              </button>
            </form>
          </div>
        </main>
      ) : role === 'cashier' ? (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex gap-6 px-4 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setCashierTab('pos')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${cashierTab === 'pos' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Kasir
            </button>
            <button
              onClick={() => setCashierTab('pending')}
              className={`py-4 font-bold border-b-2 transition-all relative flex-shrink-0 ${cashierTab === 'pending' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Pending
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-4 min-w-5 h-5 px-1.5 rounded-full bg-dimsum-red text-white text-[10px] font-black flex items-center justify-center">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCashierTab('transactions')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${cashierTab === 'transactions' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Lihat Transaksi
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex gap-6 px-4 sm:px-6 overflow-x-auto">
            <button 
              onClick={() => setOwnerTab('dashboard')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${ownerTab === 'dashboard' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Summary Penjualan
            </button>
            <button 
              onClick={() => setOwnerTab('transactions')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${ownerTab === 'transactions' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Lihat Transaksi
            </button>
            <button 
              onClick={() => setOwnerTab('sold')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${ownerTab === 'sold' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Stock Penjualan
            </button>
            <button 
              onClick={() => setOwnerTab('shift')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${ownerTab === 'shift' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              History Shift
            </button>
            <button 
              onClick={() => setOwnerTab('management')}
              className={`py-4 font-bold border-b-2 transition-all flex-shrink-0 ${ownerTab === 'management' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Manajemen Menu
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {currentUser && (
        <main className="flex-1 p-6 md:p-8">
          {role === 'cashier' ? (
            cashierTab === 'transactions'
              ? <TransactionsView mode="cashier" />
              : <CashierView view={cashierTab} />
          ) : (
            ownerTab === 'dashboard'
              ? <DashboardView />
              : ownerTab === 'transactions'
                ? <TransactionsView mode="owner" />
                : ownerTab === 'shift'
                  ? <ShiftHistoryView />
                  : ownerTab === 'sold'
                    ? <SoldStockView />
                    : <OwnerView />
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="bg-dimsum-dark text-gray-500 p-8 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-medium">&copy; 2026 Dimsum Dimsay. Dibuat dengan cinta untuk UMKM Indonesia.</p>
          <div className="flex gap-6 text-xs uppercase tracking-widest font-bold">
            <span className="hover:text-white cursor-pointer transition-colors">Bantuan</span>
            <span className="hover:text-white cursor-pointer transition-colors">Kebijakan</span>
            <span className="hover:text-white cursor-pointer transition-colors">Kontak</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
