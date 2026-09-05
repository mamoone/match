import { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { Box, Typography, Button, Avatar } from '@mui/material'
import WavesIcon from '@mui/icons-material/Waves'
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

export function Logo({ size = 'md' }) {
  const px = size === 'lg' ? 44 : 34
  const fs = size === 'lg' ? 26 : 20
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Avatar
        sx={{
          width: px,
          height: px,
          background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
          boxShadow: '0 4px 14px rgba(14,165,233,.35)',
        }}
      >
        <WavesIcon sx={{ color: '#fff', fontSize: px * 0.62 }} />
      </Avatar>
      <Typography
        component={Link}
        to="/"
        sx={{
          fontWeight: 800,
          fontSize: fs,
          letterSpacing: '-0.03em',
          color: 'text.primary',
          textDecoration: 'none',
          background: 'linear-gradient(135deg, #7dd3fc, #a5b4fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Match
      </Typography>
    </Box>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner" />
      </Box>
    )
  }
  if (!isSupabaseConfigured()) return <ConfigWarning />
  if (!session) return <Navigate to="/login" />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" />
  return children
}

function ConfigWarning() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 3,
        textAlign: 'center',
      }}
    >
      <WavesIcon sx={{ fontSize: 64, color: 'primary.main' }} />
      <Typography variant="h4">Match</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
        L'application est en ligne mais le backend Supabase n'est pas encore connecté.
      </Typography>
      <Button
        variant="contained"
        href="https://github.com/mamoone/match/settings/secrets/actions"
        target="_blank"
        rel="noreferrer"
      >
        Configurer les secrets
      </Button>
    </Box>
  )
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
    </AuthContext.Provider>
  )
}