import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Card, TextField, Button, Typography,
  Alert, Stack, Avatar, Chip, Divider, IconButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockResetIcon from '@mui/icons-material/LockReset'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import PersonIcon from '@mui/icons-material/Person'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { ROLE_BADGES } from '../utils/constants'

export default function Profile() {
  const { profile, fetchProfile, session } = useAuth()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pw, setPw] = useState({ new: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (profile) setForm({ ...profile })
    else if (session?.user?.id) fetchProfile(session.user.id)
  }, [profile, session?.user?.id])

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const updates = {
      full_name: form.full_name,
      phone: form.phone,
      city: form.city?.trim() || 'SAFI',
      specialty: form.role === 'marin' ? form.specialty : null,
      company_name: form.role === 'capitaine' ? form.company_name : null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      certifications: form.certifications
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id)
    if (error) { setError(error.message); setLoading(false); return }
    await fetchProfile(session.user.id)
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    setPwOk(false)
    if (pw.new.length < 6) { setPwError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return }
    if (pw.new !== pw.confirm) { setPwError('كلمتا المرور غير متطابقتين'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw.new })
    setPwLoading(false)
    if (error) { setPwError(error.message); return }
    setPwOk(true)
    setPw({ new: '', confirm: '' })
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
            رجوع
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box className="match-fade">
          <Card sx={{ p: { xs: 3, sm: 4 }, mb: 3 }}>
            <Stack spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ width: 72, height: 72, fontSize: 30, bgcolor: isCapitaine ? '#f59e0b' : '#0ea5e9' }}>
                {form.full_name?.[0]?.toUpperCase() || <PersonIcon />}
              </Avatar>
              <Typography variant="h5" fontWeight={800}>{form.full_name}</Typography>
              <Chip size="small" color={ROLE_BADGES[form.role]?.color || 'default'} label={ROLE_BADGES[form.role]?.label || form.role} />
              <Typography color="text.secondary" fontSize={13} dir="ltr">{form.email}</Typography>
            </Stack>

            {saved && <Alert severity="success" sx={{ mb: 2 }}>تم تحديث الملف الشخصي ✓</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Stack component="form" spacing={2.5} onSubmit={handleSave}>
              <TextField label="الاسم الكامل" value={form.full_name} onChange={e => update('full_name', e.target.value)} required fullWidth />

              <TextField
                label="المدينة / ميناء الانطلاق"
                value={form.city || 'SAFI'}
                onChange={e => update('city', e.target.value)}
                fullWidth
                placeholder="آسفي (SAFI)"
                helperText="ستستقبل عروض العمل المنشورة في هذه المدينة."
                slotProps={{ input: { startAdornment: <LocationCityIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary' }} /> } }}
              />

              <TextField label="الهاتف" dir="ltr" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} required fullWidth />

              {isMarin && (
                <>
                  <TextField
                    label="التخصص"
                    value={form.specialty}
                    onChange={e => update('specialty', e.target.value)}
                    required
                    fullWidth
                    placeholder="بحار، ميكانيكي، حارس..."
                    helperText="تخصصك الرئيسي"
                  />
                  <TextField
                    label="سنوات الخبرة"
                    type="number"
                    value={form.experience_years || ''}
                    onChange={e => update('experience_years', e.target.value)}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="الدبلومات / الشهادات"
                    value={form.certifications || ''}
                    onChange={e => update('certifications', e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="مثال: شهادة ربان، STCW..."
                    helperText="مفصولة بفواصل"
                  />
                </>
              )}

              {isCapitaine && (
                <TextField
                  label="اسم السفينة / الشركة"
                  value={form.company_name || ''}
                  onChange={e => update('company_name', e.target.value)}
                  fullWidth
                  placeholder="مثال: شركة الصيد البحري"
                />
              )}

              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                {loading ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </Stack>
          </Card>

          <Card sx={{ p: { xs: 3, sm: 4 } }}>
            <Divider sx={{ mb: 3 }} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <LockResetIcon color="primary" />
              <Typography variant="h6">تغيير كلمة المرور</Typography>
            </Stack>
            {pwOk && <Alert severity="success" sx={{ mb: 2 }}>تم تغيير كلمة المرور ✓</Alert>}
            {pwError && <Alert severity="error" sx={{ mb: 2 }}>{pwError}</Alert>}
            <Stack component="form" spacing={2.5} onSubmit={handleChangePassword}>
              <TextField label="كلمة المرور الجديدة" dir="ltr" type="password" value={pw.new} onChange={e => setPw(p => ({ ...p, new: e.target.value }))} fullWidth inputProps={{ minLength: 6 }} />
              <TextField label="تأكيد كلمة المرور" dir="ltr" type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} fullWidth inputProps={{ minLength: 6 }} />
              <Button type="submit" variant="outlined" color="primary" disabled={pwLoading}>
                {pwLoading ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
              </Button>
            </Stack>
          </Card>
        </Box>
      </Container>
    </Box>
  )
}