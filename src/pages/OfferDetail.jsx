import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Card, Typography, Button, Chip, Stack,
  Grid, Paper, Avatar, Divider, Alert, Snackbar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PhoneIcon from '@mui/icons-material/Phone'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { SPECIALTY_LABELS, CURRENCY } from '../utils/constants'

export default function OfferDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [offer, setOffer] = useState(null)
  const [applications, setApplications] = useState([])
  const [toast, setToast] = useState('')

  const isOwner = offer?.posted_by === session.user.id

  useEffect(() => {
    fetchOffer()
  }, [id])

  async function fetchOffer() {
    const { data } = await supabase
      .from('job_offers')
      .select('*, profiles!job_offers_posted_by_fkey(full_name, company_name)')
      .eq('id', id)
      .single()
    setOffer(data)
    if (data) fetchApplications()
  }

  async function fetchApplications() {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('offer_id', id)
      .order('created_at', { ascending: true })
    setApplications(data || [])
  }

  async function selectCandidate(workerId) {
    const app = applications.find(a => a.worker_id === workerId)
    await supabase.from('applications').update({ status: 'accepted' }).eq('id', app.id)
    await supabase.from('job_offers').update({ status: 'filled', filled_by: workerId }).eq('id', id)
    await supabase.from('applications').update({ status: 'rejected' }).eq('offer_id', id).neq('id', app.id)
    await supabase.from('notifications').insert({
      user_id: workerId,
      message: `تم قبول ترشحك لعرض « ${offer.title} » 🎉`,
      type: 'accepted',
      offer_id: id,
    })
    setToast('تم اختيار البحار. تم إبلاغ البقية.')
    fetchOffer()
  }

  if (!offer) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner" />
      </Box>
    )
  }

  const company = offer.profiles?.company_name || offer.profiles?.full_name
  const specialty = SPECIALTY_LABELS[offer.specialty_needed] || offer.specialty_needed

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

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box className="match-fade">
          <Card sx={{ p: { xs: 3, sm: 4 }, mb: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={specialty} color={offer.specialty_needed === 'Marin' ? 'info' : 'secondary'} />
                <Chip
                  label={offer.urgency === 'urgent' ? '🔴 عاجل' : 'عادي'}
                  color={offer.urgency === 'urgent' ? 'error' : 'default'}
                />
                {offer.status === 'filled' && <Chip label="✓ تمت التعبئة" color="success" />}
              </Box>
              <Typography variant="h4">{offer.title}</Typography>
              <Typography color="text.secondary">⛴️ {company}</Typography>

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <InfoTile icon="📍" label="الميناء" value={offer.location} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <InfoTile icon="📅" label="الفترة" value={`${offer.start_date} ← ${offer.end_date}`} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <InfoTile icon="💰" label="الأجر" value={offer.daily_rate ? `${offer.daily_rate} ${CURRENCY}/يوم` : 'قابل للتفاوض'} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <InfoTile icon="⛴️" label="السفينة" value={offer.vessel_type || 'غير محدد'} />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>وصف المهمة</Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{offer.description}</Typography>
              </Box>
            </Stack>
          </Card>

          {isOwner && (
            <Paper sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                الطلبات ({applications.length})
              </Typography>

              {applications.length === 0 ? (
                <Typography color="text.secondary">لا توجد طلبات بعد.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {applications.map(app => (
                    <Card
                      key={app.id}
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        borderColor: app.status === 'accepted' ? 'success.main' : 'divider',
                        opacity: app.status === 'rejected' ? 0.55 : 1,
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#0ea5e9' }}>🧑‍✈️</Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 160 }}>
                        <Typography fontWeight={700}>{app.worker_name}</Typography>
                        <Typography color="text.secondary" fontSize={13}>{app.worker_specialty}</Typography>
                        <Typography color="text.secondary" fontSize={13} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <PhoneIcon fontSize="small" /> <bdi dir="ltr">{app.worker_phone}</bdi>
                        </Typography>
                      </Box>
                      {app.status === 'pending' && offer.status === 'open' ? (
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => selectCandidate(app.worker_id)}
                        >
                          اختر هذا البحار
                        </Button>
                      ) : (
                        <Chip
                          variant="outlined"
                          color={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'}
                          label={app.status === 'accepted' ? 'تم اختياره ✓' : app.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                        />
                      )}
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>
          )}
        </Box>
      </Container>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  )
}

function InfoTile({ icon, label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.8, textAlign: 'center' }}>
      <Typography fontSize={22}>{icon}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography fontWeight={600} fontSize={13} sx={{ mt: 0.3 }}>{value}</Typography>
    </Paper>
  )
}