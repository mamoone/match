import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Box, Card, TextField, Button, Typography, Alert, Stack,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import AnchorIcon from '@mui/icons-material/Anchor'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'

export default function Signup() {
  const { fetchProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    role: 'marin', company_name: '', city: 'SAFI',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, phone: form.phone, city: form.city || 'SAFI' } },
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        specialty: form.role === 'marin' ? 'Marin' : 'Capitaine',
        company_name: form.role === 'capitaine' ? form.company_name : null,
        city: form.city?.trim() || 'SAFI',
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
      await fetchProfile(data.user.id)
    }

    navigate('/')
    setLoading(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(1000px 500px at 20% 10%, rgba(14,165,233,0.12), transparent), radial-gradient(800px 500px at 85% 90%, rgba(99,102,241,0.12), transparent), #0b1120',
        px: 2,
        py: 4,
      }}
    >
      <Card className="match-fade" sx={{ width: '100%', maxWidth: 460, p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Logo />
        </Box>
        <Typography align="center" variant="h5" sx={{ mb: 0.5 }}>
          Créer un compte
        </Typography>
        <Typography color="text.secondary" align="center" sx={{ mb: 3, fontSize: 14 }}>
          Rejoignez le réseau de remplacement maritime
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleSignup}>
          {error && <Alert severity="error">{error}</Alert>}

          <ToggleButtonGroup
            exclusive
            fullWidth
            value={form.role}
            onChange={(_e, v) => v && update('role', v)}
            sx={{ mb: 1 }}
          >
            <ToggleButton value="marin" sx={{ flex: 1, py: 1.5, gap: 1 }}>
              <PersonIcon fontSize="small" /> Marin
            </ToggleButton>
            <ToggleButton value="capitaine" sx={{ flex: 1, py: 1.5, gap: 1 }}>
              <AnchorIcon fontSize="small" /> Capitaine
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField label="Nom complet" value={form.full_name} onChange={e => update('full_name', e.target.value)} required fullWidth />
          <TextField label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required fullWidth />
          <TextField label="Téléphone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} required fullWidth />
          <TextField
            label="Ville / Port d'attache"
            value={form.city}
            onChange={e => update('city', e.target.value)}
            required
            fullWidth
            placeholder="SAFI"
            helperText="Vous recevrez les offres publiées dans cette ville."
          />
          <TextField label="Mot de passe" type="password" value={form.password} onChange={e => update('password', e.target.value)} required fullWidth inputProps={{ minLength: 6 }} />

          {form.role === 'capitaine' && (
            <TextField
              label="Navire / Compagnie"
              value={form.company_name}
              onChange={e => update('company_name', e.target.value)}
              required
              fullWidth
              placeholder="Nom du navire ou de la compagnie"
            />
          )}

          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
        </Stack>

        <Typography align="center" sx={{ mt: 2.5, fontSize: 14 }} color="text.secondary">
          Déjà inscrit ?{' '}
          <Typography component={Link} to="/login" color="primary" sx={{ fontWeight: 700, textDecoration: 'none' }}>
            Se connecter
          </Typography>
        </Typography>
      </Card>
    </Box>
  )
}