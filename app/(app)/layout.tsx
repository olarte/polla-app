import BottomNav from '../components/BottomNav'
import StatusBar from '../components/StatusBar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-polla-bg flex flex-col">
      <StatusBar />
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
