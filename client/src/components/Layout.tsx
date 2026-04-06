import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { cn } from '../lib/utils'
import { useEffect, useState } from 'react'

function LayoutContent() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebarCollapsed')
      setIsCollapsed(saved ? JSON.parse(saved) : false)
    }

    window.addEventListener('storage', handleStorageChange)

    const interval = setInterval(() => {
      const saved = localStorage.getItem('sidebarCollapsed')
      const current = saved ? JSON.parse(saved) : false
      if (current !== isCollapsed) {
        setIsCollapsed(current)
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [isCollapsed])

  return (
    <div className={cn(
      "flex flex-col flex-1 transition-all duration-300",
      isCollapsed ? "lg:pl-20" : "lg:pl-64"
    )}>
      <main className="pt-8 pb-6 flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#101010] flex flex-col transition-colors duration-200">
      <Sidebar />
      <LayoutContent />
    </div>
  )
}
