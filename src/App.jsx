import { useState } from 'react'
import { useStore } from './store/useStore'
import CashierView from './components/CashierView'
import OwnerView from './components/OwnerView'
import DashboardView from './components/DashboardView'
import TransactionsView from './components/TransactionsView'
import SoldStockView from './components/SoldStockView'
import ShiftHistoryView from './components/ShiftHistoryView'
import { Store } from 'lucide-react'

function App() {
  const { currentUser, login, logout } = useStore()
  const role = currentUser?.role || null

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [cashierTab, setCashierTab] = useState('pos') // 'pos' or 'transactions'
  const [ownerTab, setOwnerTab] = useState('dashboard') // 'dashboard' | 'transactions' | 'shift' | 'sold' | 'management'

  const handleLogin = (e) => {
    e.preventDefault()
    const ok = login(username, password)
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-dimsum-red text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <Store className="text-dimsum-red" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter italic">DIMSUM DIMSAY</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Premium Quality</p>
            </div>
          </div>

          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold">{currentUser.username}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">{currentUser.role === 'owner' ? 'Owner' : 'Kasir'}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-lg bg-red-800/50 hover:bg-red-700/50 font-bold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="text-xs font-bold opacity-80">Silakan login</div>
          )}
        </div>
      </nav>

      {!currentUser ? (
        <main className="flex-1 p-6 md:p-8 flex items-center justify-center">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-black text-dimsum-dark">Login</h2>
            <p className="text-sm text-gray-500 mt-1">Gunakan akun dummy kasir atau owner</p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red"
                  placeholder="kasir / owner"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-dimsum-red"
                  placeholder="kasir123 / owner123"
                />
              </div>
              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold">
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-dimsum-red text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Masuk
              </button>
            </form>
          </div>
        </main>
      ) : role === 'cashier' ? (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex gap-8 px-6">
            <button
              onClick={() => setCashierTab('pos')}
              className={`py-4 font-bold border-b-2 transition-all ${cashierTab === 'pos' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Kasir
            </button>
            <button
              onClick={() => setCashierTab('transactions')}
              className={`py-4 font-bold border-b-2 transition-all ${cashierTab === 'transactions' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Lihat Transaksi
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex gap-8 px-6">
            <button 
              onClick={() => setOwnerTab('dashboard')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'dashboard' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Summary Penjualan
            </button>
            <button 
              onClick={() => setOwnerTab('transactions')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'transactions' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Lihat Transaksi
            </button>
            <button 
              onClick={() => setOwnerTab('sold')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'sold' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Stock Penjualan
            </button>
            <button 
              onClick={() => setOwnerTab('shift')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'shift' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              History Shift
            </button>
            <button 
              onClick={() => setOwnerTab('management')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'management' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
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
            cashierTab === 'pos' ? <CashierView /> : <TransactionsView mode="cashier" />
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
          <p className="text-sm font-medium">&copy; 2024 Dimsum Kasir. Dibuat dengan cinta untuk UMKM Indonesia.</p>
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
