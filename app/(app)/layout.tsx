import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'
import { AuthProvider } from '../contexts/AuthContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-polla-bg flex flex-col">
        <StatusBar />
        <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </AuthProvider>
  )
}
