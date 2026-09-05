import { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from './utils/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import CreateOffer from './pages/CreateOffer'
import OfferDetail from './pages/OfferDetail'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

function ProtectedRoute({ children, adminOnly = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>
  if (!session) return <Navigate to="/login" />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, fetchProfile }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/" />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/offer/:id" element={<ProtectedRoute><OfferDetail /></ProtectedRoute>} />
          <Route path="/create-offer" element={<ProtectedRoute><CreateOffer /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        </Routes>
      </HashRouter>
      {!isSupabaseConfigured() && <ConfigWarning />}
    </AuthContext.Provider>
  )
}

function ConfigWarning() {
  return (
    <div className="config-warning">
      <span className="logo-icon">⚓</span>
      <h2>Configuration requise</h2>
      <p>
        L'application est en ligne mais le backend Supabase n'est pas encore connecté.
        Ajoutez les secrets GitHub <strong>VITE_SUPABASE_URL</strong> et <strong>VITE_SUPABASE_ANON_KEY</strong>,
        puis relancez le workflow <em>Deploy to GitHub Pages</em>.
      </p>
      <a className="btn-primary" href="https://github.com/mamoone/match/settings/secrets/actions" target="_blank" rel="noreferrer">Configurer les secrets</a>
    </div>
  )
}
