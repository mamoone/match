import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Card, TextField, Button, Typography,
  Alert, Stack,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'

export default function Profile() {
  const { profile, fetchProfile, session } = useAuth()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) setForm({ ...profile })
  }, [profile])

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const updates = {
      full_name: form.full_name,
      phone: form.phone,
      specialty: form.role === 'marin' ? form.specialty : null,
      company_name: form.role === 'capitaine' ? form.company_name : null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      certifications: form.certifications
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await fetchProfile(session.user.id)
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!form) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner" />
      </Box>
    )
  }

  const isMarin = form.role === 'marin'
  const isCapitaine = form.role === 'capitaine'

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1, px: { xs: 1.5, sm: 3 } }}>
          <Logo />
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" startIcon={<ArrowBackIcon />} component={Link} to="/">
            Retour
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card className="match-fade" sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" sx={{ mb: 3 }}>Mon profil</Typography>

          {saved && <Alert severity="success" sx={{ mb: 2 }}>Profil mis à jour ✓</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack component="form" spacing={2.5} onSubmit={handleSave}>
            <TextField
              label="Nom complet"
              value={form.full_name}
              onChange={e => update('full_name', e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Email"
              value={form.email}
              disabled
              fullWidth
            />

            <TextField
              label="Téléphone"
              type="tel"
              value={form.phone}
              onChange={e => update('phone', e.target.value)}
              required
              fullWidth
            />

            {isMarin && (
              <>
                <TextField
                  label="Spécialité"
                  value={form.specialty}
                  onChange={e => update('specialty', e.target.value)}
                  required
                  fullWidth
                  placeholder="Capitaine, Officier Mécanicien, Matelot..."
                  helperText="Votre qualification principale"
                />

                <TextField
                  label="Années d'expérience"
                  type="number"
                  value={form.experience_years || ''}
                  onChange={e => update('experience_years', e.target.value)}
                  fullWidth
                  inputProps={{ min: 0 }}
                />

                <TextField
                  label="Diplômes / Certifications"
                  value={form.certifications || ''}
                  onChange={e => update('certifications', e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Ex: Capitaine 500 GT, STCW, SST..."
                  helperText="Séparés par des virgules"
                />
              </>
            )}

            {isCapitaine && (
              <TextField
                label="Nom de l'entreprise"
                value={form.company_name || ''}
                onChange={e => update('company_name', e.target.value)}
                fullWidth
                placeholder="Ex: CMA CGM, Maersk..."
              />
            )}

            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Box>
  )
}