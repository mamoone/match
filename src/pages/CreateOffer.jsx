import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Card, TextField, Button, Typography,
  Alert, Stack, Select, MenuItem, InputLabel, FormControl, RadioGroup,
  FormControlLabel, Radio,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'

export default function CreateOffer() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', specialty_needed: 'Marin',
    location: '', start_date: '', end_date: '',
    daily_rate: '', urgency: 'standard', vessel_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: insertError } = await supabase.from('job_offers').insert({
      ...form,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      posted_by: session.user.id,
      status: 'open',
    })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    navigate('/')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1, px: { xs: 1.5, sm: 3 } }}>
          <Logo />
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            Retour
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card className="match-fade" sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>Publier une offre</Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
            Les marins éligibles seront notifiés instantanément.
          </Typography>

          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Titre de l'offre *"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
              fullWidth
              placeholder="Ex: Capitaine pour porte-conteneurs"
            />

            <FormControl fullWidth>
              <InputLabel>Poste recherché</InputLabel>
              <Select
                value={form.specialty_needed}
                onChange={e => update('specialty_needed', e.target.value)}
                label="Poste recherché"
              >
                <MenuItem value="Marin">Marin</MenuItem>
                <MenuItem value="Capitaine">Capitaine</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description de la mission *"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              required
              fullWidth
              multiline
              minRows={4}
              placeholder="Décrivez la mission, les conditions, les exigences..."
            />

            <TextField
              label="Port / Lieu d'embarquement *"
              value={form.location}
              onChange={e => update('location', e.target.value)}
              required
              fullWidth
              placeholder="Ex: Marseille, Le Havre, Dakar..."
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Date de début *"
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Date de fin *"
                type="date"
                value={form.end_date}
                onChange={e => update('end_date', e.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Taux journalier (€)"
                type="number"
                value={form.daily_rate}
                onChange={e => update('daily_rate', e.target.value)}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Type de navire"
                value={form.vessel_type}
                onChange={e => update('vessel_type', e.target.value)}
                fullWidth
                placeholder="Porte-conteneurs, pétrolier..."
              />
            </Stack>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Urgence</Typography>
              <RadioGroup
                row
                value={form.urgency}
                onChange={e => update('urgency', e.target.value)}
              >
                <FormControlLabel value="standard" control={<Radio />} label="Standard" />
                <FormControlLabel value="urgent" control={<Radio color="error" />} label="Urgent 🔴" />
              </RadioGroup>
            </Box>

            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
              {loading ? 'Publication...' : 'Publier l\'offre'}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Box>
  )
}