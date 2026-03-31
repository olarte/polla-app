import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'
import ServiceWorkerRegistrar from '../components/ServiceWorkerRegistrar'
import Web3Provider from '../components/Web3Provider'
import { AuthProvider } from '../contexts/AuthContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <AuthProvider>
        <div className="min-h-screen bg-polla-bg flex flex-col">
          <StatusBar />
          <main className="flex-1 pb-36 overflow-y-auto">{children}</main>
          <BottomNav />
        </div>
        <ServiceWorkerRegistrar />
      </AuthProvider>
    </Web3Provider>
  )
}
