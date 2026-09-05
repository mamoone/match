import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Card, TextField, Button, Typography,
  Alert, Stack, Select, MenuItem, InputLabel, FormControl, RadioGroup,
  FormControlLabel, Radio,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { fetchConfig } from '../utils/config'
import { SPECIALTY_LABELS, CURRENCY } from '../utils/constants'

export default function CreateOffer() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [specialties, setSpecialties] = useState([])
  const [vessels, setVessels] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', specialty_needed: 'Marin',
    location: '', start_date: '', end_date: '',
    daily_rate: '', urgency: 'standard', vessel_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConfig().then(cf => {
      setSpecialties(cf.specialties)
      setVessels(cf.vessels)
    })
  }, [])

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
            رجوع
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card className="match-fade" sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>نشر عرض</Typography>
          <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
            سيتم إشعار البحارة المؤهلين في مدينتك فور النشر.
          </Typography>

          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="عنوان العرض *"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
              fullWidth
              placeholder="مثال: بحار لسفينة صيد السردين"
            />

            <FormControl fullWidth>
              <InputLabel>نوع المطلوب</InputLabel>
              <Select
                value={form.specialty_needed}
                onChange={e => update('specialty_needed', e.target.value)}
                label="نوع المطلوب"
              >
                {specialties.map(s => (
                  <MenuItem key={s} value={s}>{SPECIALTY_LABELS[s] || s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="وصف المهمة *"
              value={form.description}
              onChange={e => update('description', e.target.value)}
              required
              fullWidth
              multiline
              minRows={4}
              placeholder="صف المهمة، الشروط، المطلوب..."
            />

            <TextField
              label="الميناء / مكان الإبحار *"
              value={form.location}
              onChange={e => update('location', e.target.value)}
              required
              fullWidth
              placeholder="مثال: آسفي، الدار البيضاء، طنجة..."
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="تاريخ البداية *"
                type="date"
                value={form.start_date}
                onChange={e => update('start_date', e.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="تاريخ النهاية *"
                type="date"
                value={form.end_date}
                onChange={e => update('end_date', e.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel>نوع السفينة</InputLabel>
              <Select
                value={form.vessel_type}
                onChange={e => update('vessel_type', e.target.value)}
                label="نوع السفينة"
              >
                {vessels.map(v => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label={`الأجر اليومي (${CURRENCY})`}
              type="number"
              value={form.daily_rate}
              onChange={e => update('daily_rate', e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
              helperText="بالدرهم المغربي"
            />

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>درجة الاستعجال</Typography>
              <RadioGroup
                row
                value={form.urgency}
                onChange={e => update('urgency', e.target.value)}
              >
                <FormControlLabel value="standard" control={<Radio />} label="عادي" />
                <FormControlLabel value="urgent" control={<Radio color="error" />} label="عاجل 🔴" />
              </RadioGroup>
            </Box>

            <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
              {loading ? 'جارٍ النشر...' : 'نشر العرض'}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Box>
  )
}