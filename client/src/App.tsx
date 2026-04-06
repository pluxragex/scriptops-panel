import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'
import { getCsrfToken } from './services/api'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const TwoFactorWaitPage = lazy(() => import('./pages/TwoFactorWaitPage'))
const TwoFactorActionWaitPage = lazy(() => import('./pages/TwoFactorActionWaitPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ScriptsPage = lazy(() => import('./pages/ScriptsPage'))
const ScriptDetailPage = lazy(() => import('./pages/ScriptDetailPage'))
const NewsPage = lazy(() => import('./pages/NewsPage'))
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function App() {
  const { user, isLoading, checkAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {

    getCsrfToken().catch(() => {

    })
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const handleSessionRevokedNavigate = (event: CustomEvent<{ path: string }>) => {
      navigate(event.detail.path, { replace: true })
    }

    window.addEventListener('session-revoked-navigate', handleSessionRevokedNavigate as EventListener)

    return () => {
      window.removeEventListener('session-revoked-navigate', handleSessionRevokedNavigate as EventListener)
    }
  }, [navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101010]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#101010]">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/auth/2fa-wait" element={user ? <Navigate to="/" replace /> : <TwoFactorWaitPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/2fa-action-wait" element={<TwoFactorActionWaitPage />} />
            <Route path="scripts" element={<ScriptsPage />} />
            <Route path="scripts/:id" element={<ScriptDetailPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="news/:slug" element={<NewsDetailPage />} />
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <Route path="admin/*" element={<AdminPage />} />
            )}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
