import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSettingsStore } from '@/stores/settingsStore'

export function MainLayout() {
  const { sidebarCollapsed } = useSettingsStore()

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dbe2fd]">
      {/* Liquid orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'fixed', width: 500, height: 500,
          background: 'radial-gradient(circle, #4cd7f6 0%, transparent 70%)',
          top: -100, right: -100, borderRadius: '9999px',
          filter: 'blur(120px)', opacity: 0.35
        }} />
        <div style={{
          position: 'fixed', width: 400, height: 400,
          background: 'radial-gradient(circle, #d0bcff 0%, transparent 70%)',
          bottom: -50, left: -50, borderRadius: '9999px',
          filter: 'blur(120px)', opacity: 0.35
        }} />
        <div style={{
          position: 'fixed', width: 300, height: 300,
          background: 'radial-gradient(circle, #f074ff 0%, transparent 70%)',
          top: '40%', left: '20%', borderRadius: '9999px',
          filter: 'blur(120px)', opacity: 0.25
        }} />
      </div>

      {/* Header — fixed full width top */}
      <Header />

      {/* Sidebar — fixed, starts below header */}
      <Sidebar />

      {/* Main content — offset for header + sidebar */}
      <div
        className="relative z-10 flex flex-col min-h-screen pt-12 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '72px' : '224px' }}
      >
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
