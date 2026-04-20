import { useState } from 'react'
import CashierView from './components/CashierView'
import OwnerView from './components/OwnerView'
import DashboardView from './components/DashboardView'
import { LayoutDashboard, Store, Settings as SettingsIcon, Menu } from 'lucide-react'

function App() {
  const [role, setRole] = useState('cashier') // 'cashier' or 'owner'
  const [ownerTab, setOwnerTab] = useState('dashboard') // 'dashboard' or 'management'

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
          
          <div className="flex bg-red-800/50 p-1 rounded-xl">
            <button 
              onClick={() => setRole('cashier')}
              className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold ${role === 'cashier' ? 'bg-dimsum-yellow text-dimsum-dark shadow-md' : 'hover:bg-red-700/50'}`}
            >
              <Store size={18} />
              Kasir
            </button>
            <button 
              onClick={() => setRole('owner')}
              className={`px-6 py-2 rounded-lg transition-all flex items-center gap-2 font-bold ${role === 'owner' ? 'bg-dimsum-yellow text-dimsum-dark shadow-md' : 'hover:bg-red-700/50'}`}
            >
              <LayoutDashboard size={18} />
              Owner
            </button>
          </div>
        </div>
      </nav>

      {/* Owner Sub-tabs */}
      {role === 'owner' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto flex gap-8 px-6">
            <button 
              onClick={() => setOwnerTab('dashboard')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'dashboard' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Summary Penjualan
            </button>
            <button 
              onClick={() => setOwnerTab('management')}
              className={`py-4 font-bold border-b-2 transition-all ${ownerTab === 'management' ? 'border-dimsum-red text-dimsum-red' : 'border-transparent text-gray-500 hover:text-dimsum-red'}`}
            >
              Manajemen Menu & Member
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8">
        {role === 'cashier' ? (
          <CashierView />
        ) : (
          ownerTab === 'dashboard' ? <DashboardView /> : <OwnerView />
        )}
      </main>

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