import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Box, Card, TextField, Button, Typography, Alert, Stack, Divider,
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { supabase } from '../utils/supabase'
import { Logo } from '../App'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'بيانات الدخول غير صحيحة' : error.message)
    else navigate('/')
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
      }}
    >
      <Card className="match-fade" sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Logo />
        </Box>
        <Typography color="text.secondary" align="center" sx={{ mb: 3, fontSize: 14 }}>
          منصة الرحل البحرية في أزمة
        </Typography>

        <Stack component="form" spacing={2} onSubmit={handleLogin}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="البريد الإلكتروني"
            dir="ltr"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="كلمة المرور"
            dir="ltr"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </Button>
        </Stack>

        <Divider sx={{ my: 2.5 }}>
          <Typography variant="caption" color="text.secondary">تذكير</Typography>
        </Divider>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
            bgcolor: 'rgba(56,189,248,.08)',
            borderRadius: 2,
            p: 1.5,
            fontSize: 13,
          }}
        >
          <InfoOutlinedIcon fontSize="small" sx={{ color: 'primary.main', mt: 0.3 }} />
          <Typography fontSize={13} color="text.secondary">
            معرفات مسؤول المنصة: <b dir="ltr">mmn@match.ma</b> / <b dir="ltr">mmn123!</b> — يمكنك تغيير كلمة المرور من صفحة الملف الشخصي.
          </Typography>
        </Box>

        <Typography align="center" sx={{ mt: 2.5, fontSize: 14 }} color="text.secondary">
          ليس لديك حساب ؟{' '}
          <Typography component={Link} to="/signup" color="primary" sx={{ fontWeight: 700, textDecoration: 'none' }}>
            سجّل الآن
          </Typography>
        </Typography>
      </Card>
    </Box>
  )
}