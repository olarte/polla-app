import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'
import ServiceWorkerRegistrar from '../components/ServiceWorkerRegistrar'
import Web3Provider from '../components/Web3Provider'
import WalletSync from '../components/WalletSync'
import { AuthProvider } from '../contexts/AuthContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <AuthProvider>
        <WalletSync />
        <div className="min-h-screen bg-polla-bg">
          <StatusBar />
          <main style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 40px)' }}>
            {children}
          </main>
          <BottomNav />
        </div>
        <ServiceWorkerRegistrar />
      </AuthProvider>
    </Web3Provider>
  )
}
