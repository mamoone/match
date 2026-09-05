import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Typography, Button, IconButton, Badge,
  Card, Chip, Stack, Paper, Menu, MenuItem, Divider,
  Tab, Tabs, Alert, Snackbar, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import AddIcon from '@mui/icons-material/Add'
import LogoutIcon from '@mui/icons-material/Logout'
import WhereToVoteIcon from '@mui/icons-material/WhereToVote'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonIcon from '@mui/icons-material/Person'
import FmdGoodIcon from '@mui/icons-material/FmdGood'
import DateRangeIcon from '@mui/icons-material/DateRange'
import PaymentsIcon from '@mui/icons-material/Payments'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { SPECIALTY_LABELS, COLLECTION_TOTAL, CURRENCY } from '../utils/constants'

const POLL_MS = 15000

export default function Dashboard() {
  const { session, profile, signOut } = useAuth()
  const [offers, setOffers] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [notifications, setNotifications] = useState([])
  const [payments, setPayments] = useState([])
  const [tab, setTab] = useState('offers')
  const [cityFilter, setCityFilter] = useState('city')
  const [notifAnchor, setNotifAnchor] = useState(null)
  const [toast, setToast] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const isMarin = profile?.role === 'marin'
  const unreadCount = notifications.filter(n => !n.read).length

  const fetchOffers = useCallback(async () => {
    const query = supabase
      .from('job_offers')
      .select('*, profiles!job_offers_posted_by_fkey(full_name, company_name)')
      .order('created_at', { ascending: false })
    if (isMarin) {
      const { data } = await query.eq('status', 'open')
      setOffers(data || [])
    } else {
      const { data } = await query.eq('posted_by', session.user.id)
      setOffers(data || [])
    }
  }, [isMarin, session?.user?.id])

  const fetchMyApplications = useCallback(async () => {
    if (profile?.role !== 'marin') return
    const { data } = await supabase
      .from('applications')
      .select('*, job_offers(*)')
      .eq('worker_id', session.user.id)
      .order('created_at', { ascending: false })
    setMyApplications(data || [])
  }, [session?.user?.id, profile?.role])

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }, [session?.user?.id])

  const fetchPayments = useCallback(async () => {
    if (profile?.role !== 'capitaine') return
    const { data } = await supabase
      .from('collections')
      .select('*, job_offers(title, location), sailor:profiles!collections_sailor_id_fkey(full_name)')
      .eq('captain_id', session.user.id)
      .order('created_at', { ascending: false })
    setPayments(data || [])
  }, [session?.user?.id, profile?.role])

  useEffect(() => {
    fetchOffers()
    fetchMyApplications()
    fetchNotifications()
    fetchPayments()
    setLastSync(new Date())

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev])
        setToast(payload.new.message)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Match', { body: payload.new.message })
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_offers',
      }, () => fetchOffers())
      .subscribe()

    const poll = setInterval(() => {
      fetchOffers()
      fetchMyApplications()
      fetchNotifications()
      fetchPayments()
      setLastSync(new Date())
    }, POLL_MS)

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [fetchOffers, fetchMyApplications, fetchNotifications, fetchPayments, session.user.id])

  async function applyToOffer(offerId) {
    const { error } = await supabase.from('applications').insert({
      offer_id: offerId,
      worker_id: session.user.id,
      worker_name: profile?.full_name,
      worker_specialty: profile?.specialty,
      worker_phone: profile?.phone,
    })
    if (error) {
      setToast(error.message)
    } else {
      setToast('تم إرسال طلب الترشح ✓')
      fetchMyApplications()
      await supabase.from('notifications').insert({
        user_id: offers.find(o => o.id === offerId)?.posted_by,
        message: `${profile?.full_name} (${profile?.specialty}) تقدم لطلب عن عرضكم`,
        type: 'application',
        offer_id: offerId,
      })
    }
  }

  async function markNotifRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  const city = (profile?.city || 'SAFI').toLowerCase()

  const visibleOffers = isMarin
    ? offers
        .map(o => ({
          ...o,
          inCity:
            (o.location || '').toLowerCase().includes(city) ||
            city.includes((o.location || '').toLowerCase()),
        }))
        .filter(o => cityFilter === 'all' || o.inCity)
        .sort((a, b) =>
          (b.inCity - a.inCity) ||
          ((a.urgency === 'urgent' ? -1 : 1) - (b.urgency === 'urgent' ? -1 : 1)) ||
          (new Date(b.created_at) - new Date(a.created_at))
        )
    : offers

  const canPost = profile?.role === 'capitaine'
  const totalDue = payments.reduce((s, p) => s + Number(p.total_mad || 0), 0)
  const totalReceived = payments.reduce((s, p) => s + Number(p.received_mad || 0), 0)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, px: { xs: 1.5, sm: 3 } }}>
          <Logo />
          <Box sx={{ flexGrow: 1 }} />

          <Chip
            size="small"
            icon={<FmdGoodIcon />}
            label={profile?.city || 'SAFI'}
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            color="default"
            variant="outlined"
          />

          {isMarin && (
            <>
              <IconButton color="inherit" onClick={e => setNotifAnchor(e.currentTarget)} aria-label="إشعارات">
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notifAnchor}
                open={Boolean(notifAnchor)}
                onClose={() => setNotifAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                PaperProps={{ sx: { width: 340, maxHeight: 400, mt: 1 } }}
              >
                <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700}>الإشعارات</Typography>
                  {lastSync && (
                    <Typography variant="caption" color="text.secondary">
                      {lastSync.toLocaleTimeString('ar')}
                    </Typography>
                  )}
                </Box>
                <Divider />
                {notifications.length === 0 && (
                  <Typography color="text.secondary" sx={{ p: 2, fontSize: 14 }}>
                    لا توجد إشعارات
                  </Typography>
                )}
                {notifications.map(n => (
                  <MenuItem
                    key={n.id}
                    onClick={() => markNotifRead(n.id)}
                    sx={{
                      whiteSpace: 'normal',
                      alignItems: 'flex-start',
                      bgcolor: n.read ? 'transparent' : 'rgba(56,189,248,0.08)',
                    }}
                  >
                    <Box sx={{ py: 0.5 }}>
                      <Typography fontSize={13}>{n.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.created_at).toLocaleTimeString('ar')} ·{' '}
                        {new Date(n.created_at).toLocaleDateString('ar')}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {profile?.role === 'admin' && (
            <IconButton component={Link} to="/admin" color="inherit" aria-label="إدارة">
              <AdminPanelSettingsIcon />
            </IconButton>
          )}
          <IconButton component={Link} to="/profile" color="inherit" aria-label="ملفي">
            <PersonIcon />
          </IconButton>
          <IconButton onClick={signOut} color="inherit" aria-label="خروج">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box className="match-fade">
          <Paper
            sx={{
              p: { xs: 3, sm: 4 },
              mb: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(14,165,233,.18), rgba(99,102,241,.22)), #0b1120',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              border: '1px solid rgba(56,189,248,.15)',
            }}
          >
            <Box>
              <Typography variant="h4" fontWeight={800}>
                مرحباً، {profile?.full_name} 👋
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {isMarin
                  ? `عروض الشغل المتاحة في ${profile?.city || 'SAFI'} — مهمة بنقرة واحدة.`
                  : 'انشر حاجتك الملحة وابحث عن الربان المناسب.'}
              </Typography>
            </Box>
            {canPost && (
              <Button component={Link} to="/create-offer" variant="contained" size="large" startIcon={<AddIcon />}>
                عرض جديد
              </Button>
            )}
          </Paper>

          {canPost && (
              <CollectionsPanel payments={payments} totalDue={totalDue} totalReceived={totalReceived} />
            )}

          {isMarin ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={cityFilter}
                onChange={(_e, v) => v && setCityFilter(v)}
              >
                <ToggleButton value="city">📍 مدينتي ({profile?.city || 'SAFI'})</ToggleButton>
                <ToggleButton value="all">كل المدن</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                <span className="live-dot" /> تحديث مباشر · {lastSync?.toLocaleTimeString('ar')}
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, textAlign: 'left' }}>
              <span className="live-dot" /> تحديث مباشر · {lastSync?.toLocaleTimeString('ar')}
            </Typography>
          )}

          <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
              <Tab
                icon={<WhereToVoteIcon />}
                iconPosition="start"
                label={isMarin ? `العروض (${visibleOffers.length})` : `عروضي (${offers.length})`}
                value="offers"
              />
              {isMarin && (
                <Tab icon={<AssignmentIcon />} iconPosition="start" label={`طلباتي (${myApplications.length})`} value="applications" />
              )}
            </Tabs>
          </Paper>

          {tab === 'offers' && (
            <>
              {isMarin && cityFilter === 'city' && !visibleOffers.some(o => o.inCity) && (
                <Paper sx={{ px: 2.5, py: 1.5, mb: 2, borderRadius: 2, bgcolor: 'rgba(99,102,241,.08)' }}>
                  <Typography fontSize={13} color="text.secondary">
                    🔔 لا توجد عروض في مدينتك حالياً — فعّل «كل المدن» أو عد لاحقاً. ستتوصل بإشعار فور نشر أي ربّان عرضاً في {profile?.city || 'SAFI'}.
                  </Typography>
                </Paper>
              )}
              {visibleOffers.length === 0 ? (
                <Empty state={isMarin ? 'لا توجد عروض متاحة حالياً.' : 'لم تنشر أي عرض بعد.'} />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                  {visibleOffers.map(offer => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isMarin={isMarin}
                      applied={myApplications.some(a => a.offer_id === offer.id)}
                      showCity={cityFilter === 'all'}
                      onApply={() => applyToOffer(offer.id)}
                    />
                  ))}
                </Box>
              )}
            </>
          )}

          {tab === 'applications' && (
            <>
              {myApplications.length === 0 ? (
                <Empty state="لم تتقدم بعد لأي عرض." />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                  {myApplications.map(app => (
                    <Card key={app.id} sx={{ p: 2.5 }}>
                      <Stack spacing={1.5}>
                        <Chip
                          size="small"
                          label={SPECIALTY_LABELS[app.job_offers?.specialty_needed] || app.job_offers?.specialty_needed}
                          sx={{ alignSelf: 'flex-start' }}
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="h6">{app.job_offers?.title}</Typography>
                        <Typography color="text.secondary" fontSize={13}>
                          📍 {app.job_offers?.location} · {app.job_offers?.start_date} ← {app.job_offers?.end_date}
                        </Typography>
                        <Box>
                          <Chip
                            size="small"
                            color={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'}
                            label={app.status === 'accepted' ? 'مقبول ✓' : app.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                            variant="outlined"
                          />
                        </Box>
                      </Stack>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Container>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setToast('')} variant="filled" sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function CollectionsPanel({ payments, totalDue, totalReceived }) {
  const remaining = Math.max(totalDue - totalReceived, 0)
  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 2,
        border: '1px solid rgba(245,158,11,.25)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
        <PaymentsIcon sx={{ color: 'warning.main' }} />
        <Typography fontWeight={700}>وضعية التحصيل (100 {CURRENCY} لكل مهمة)</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 1.5 }}>
        <MiniStat label="الإجمالي" value={`${totalDue} ${CURRENCY}`} color="#94a3b8" />
        <MiniStat label="المُستلم" value={`${totalReceived} ${CURRENCY}`} color="#34d399" />
        <MiniStat label="المتبقي" value={`${remaining} ${CURRENCY}`} color={remaining > 0 ? '#f87171' : '#34d399'} />
      </Box>

      {payments.length === 0 ? (
        <Typography color="text.secondary" fontSize={13}>
          لا توجد مهام مكتملة بعد — بمجرد اختيارك لبحار ستحتاج تحصيل 100 {CURRENCY} وتسليمها للإدارة.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {payments.map(p => {
            const due = Number(p.total_mad || 0)
            const got = Number(p.received_mad || 0)
            const done = got >= due
            return (
              <Box
                key={p.id}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'center',
                  bgcolor: 'rgba(15,23,42,.6)',
                  borderRadius: 1.5,
                  p: 1.5,
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 180 }}>
                  <Typography fontWeight={600} fontSize={14}>{p.job_offers?.title}</Typography>
                  <Typography fontSize={12} color="text.secondary">
                    البحار: {p.sailor?.full_name || '-'} · 📍 {p.job_offers?.location}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  color={done ? 'success' : 'warning'}
                  label={done ? 'سُلّم كاملاً ✓' : `المتبقي ${due - got} ${CURRENCY}`}
                  variant="outlined"
                />
              </Box>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <Box sx={{ bgcolor: 'rgba(15,23,42,.6)', borderRadius: 1.5, p: 1.2, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography fontWeight={800} fontSize={17} sx={{ color }}>{value}</Typography>
    </Box>
  )
}

function InfoRow({ icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
      <Box sx={{ display: 'flex', minWidth: 20, justifyContent: 'center' }}>{icon}</Box>
      <Box sx={{ lineHeight: 1.5 }}>{children}</Box>
    </Box>
  )
}

function Empty({ state }) {
  return (
    <Paper sx={{ textAlign: 'center', py: 10, borderRadius: 3 }}>
      <Typography fontSize={48}>🚢</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>{state}</Typography>
    </Paper>
  )
}

function OfferCard({ offer, isMarin, applied, showCity, onApply }) {
  const company = offer.profiles?.company_name || offer.profiles?.full_name
  const specialty = SPECIALTY_LABELS[offer.specialty_needed] || offer.specialty_needed
  return (
    <Card
      className={offer.inCity ? 'city-card' : 'match-fade'}
      sx={{
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        ...(offer.inCity ? { border: '1px solid rgba(56,189,248,.4)' } : {}),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip size="small" label={specialty} color={offer.specialty_needed === 'Marin' ? 'info' : 'secondary'} />
        <Chip
          size="small"
          color={offer.urgency === 'urgent' ? 'error' : 'default'}
          label={offer.urgency === 'urgent' ? '🔴 عاجل' : 'عادي'}
          variant={offer.urgency === 'urgent' ? 'filled' : 'outlined'}
        />
      </Box>

      <Typography variant="h6">{offer.title}</Typography>
      <Typography color="text.secondary" fontSize={13}>⛴️ {company}</Typography>

      <Stack spacing={0.8} sx={{ fontSize: 13, color: 'text.secondary' }}>
        <InfoRow icon={<FmdGoodIcon sx={{ fontSize: 17 }} />}>
          {offer.location}
          {offer.inCity && <Chip size="small" color="primary" label="مدينتك" sx={{ mr: 1, height: 20, fontSize: 11 }} />}
        </InfoRow>
        <InfoRow icon={<DateRangeIcon sx={{ fontSize: 17 }} />}>
          {offer.start_date} ← {offer.end_date}
        </InfoRow>
        <InfoRow icon={<PaymentsIcon sx={{ fontSize: 17 }} />}>
          {offer.daily_rate ? `${offer.daily_rate} ${CURRENCY}/يوم` : 'قابل للتفاوض'}
        </InfoRow>
      </Stack>

      <Typography color="text.secondary" fontSize={13} sx={{ opacity: 0.85 }}>
        {offer.description?.substring(0, 110)}{offer.description?.length > 110 ? '...' : ''}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1 }}>
        {isMarin ? (
          applied ? (
            <Button fullWidth variant="outlined" color="success" disabled>
              ✓ تم إرسال الطلب
            </Button>
          ) : (
            <Button fullWidth variant="contained" onClick={onApply}>
              تقدم للعرض
            </Button>
          )
        ) : (
          <Button component={Link} to={`/offer/${offer.id}`} fullWidth variant="contained" color="secondary">
            عرض الطلبات
          </Button>
        )}
        <IconButton component={Link} to={`/offer/${offer.id}`} size="small" aria-label="التفاصيل">
          <WhereToVoteIcon />
        </IconButton>
      </Box>
    </Card>
  )
}