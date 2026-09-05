import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Typography, Button, IconButton, Badge,
  Card, CardContent, Chip, Stack, Paper, Menu, MenuItem, Divider,
  Avatar, Tab, Tabs, Alert, Snackbar,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import AddIcon from '@mui/icons-material/Add'
import LogoutIcon from '@mui/icons-material/Logout'
import WhereToVoteIcon from '@mui/icons-material/WhereToVote'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonIcon from '@mui/icons-material/Person'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { OFFER_STATUS_LABELS } from '../utils/constants'

export default function Dashboard() {
  const { session, profile, signOut } = useAuth()
  const [offers, setOffers] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [notifications, setNotifications] = useState([])
  const [tab, setTab] = useState('offers')
  const [notifAnchor, setNotifAnchor] = useState(null)
  const [toast, setToast] = useState('')

  const isMarin = profile?.role === 'marin'
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchOffers()
    if (isMarin) fetchMyApplications()
    fetchNotifications()
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
      .subscribe()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    return () => supabase.removeChannel(channel)
  }, [profile])

  async function fetchOffers() {
    const { data } = await supabase
      .from('job_offers')
      .select('*, profiles!job_offers_posted_by_fkey(full_name, company_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    setOffers(data || [])
  }

  async function fetchMyApplications() {
    const { data } = await supabase
      .from('applications')
      .select('*, job_offers(*)')
      .eq('worker_id', session.user.id)
      .order('created_at', { ascending: false })
    setMyApplications(data || [])
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  async function applyToOffer(offerId) {
    const { error } = await supabase.from('applications').insert({
      offer_id: offerId,
      worker_id: session.user.id,
      worker_name: profile.full_name,
      worker_specialty: profile.specialty,
      worker_phone: profile.phone,
    })
    if (error) {
      setToast(error.message)
    } else {
      setToast('Candidature envoyée')
      fetchMyApplications()
      await supabase.from('notifications').insert({
        user_id: offers.find(o => o.id === offerId)?.posted_by,
        message: `${profile.full_name} (${profile.specialty}) postule pour votre offre`,
        type: 'application',
        offer_id: offerId,
      })
    }
  }

  async function markNotifRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }

  function toggleNotifMenu(e) {
    setNotifAnchor(e.currentTarget)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: { xs: 1, sm: 2 }, px: { xs: 1.5, sm: 3 } }}>
          <Logo />
          <Box sx={{ flexGrow: 1 }} />

          <Chip
            size="small"
            value={profile?.role}
            label={profile?.role === 'capitaine' ? profile.company_name || 'Capitaine' : profile.specialty || 'Marin'}
            color={profile?.role === 'marin' ? 'primary' : 'secondary'}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          />

          {isMarin && (
            <>
              <IconButton color="inherit" onClick={toggleNotifMenu} aria-label="notifications">
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notifAnchor}
                open={Boolean(notifAnchor)}
                onClose={() => setNotifAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                PaperProps={{ sx: { width: 340, maxHeight: 400, mt: 1 } }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography fontWeight={700}>Notifications</Typography>
                </Box>
                <Divider />
                {notifications.length === 0 && (
                  <Typography color="text.secondary" sx={{ p: 2, fontSize: 14 }}>
                    Aucune notification
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
                        {new Date(n.created_at).toLocaleString('fr')}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}

          {profile?.role === 'admin' && (
            <IconButton component={Link} to="/admin" color="inherit" aria-label="admin">
              <AdminPanelSettingsIcon />
            </IconButton>
          )}
          <IconButton component={Link} to="/profile" color="inherit" aria-label="profil">
            <PersonIcon />
          </IconButton>
          <IconButton onClick={signOut} color="inherit" aria-label="déconnexion">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box className="match-fade">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4">
                {isMarin ? 'Bonjour, ' : 'Bonjour, '}{profile?.full_name}
              </Typography>
              <Typography color="text.secondary">
                {isMarin
                  ? 'Trouvez une mission de remplacement en un clic.'
                  : 'Publiez un besoin urgent, trouvez le bon marin.'}
              </Typography>
            </Box>
            {!isMarin && (
              <Button component={Link} to="/create-offer" variant="contained" startIcon={<AddIcon />}>
                Nouvelle offre
              </Button>
            )}
          </Box>

          {isMarin ? (
            <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
                <Tab icon={<WhereToVoteIcon />} iconPosition="start" label={`Offres (${offers.length})`} value="offers" />
                <Tab icon={<AssignmentIcon />} iconPosition="start" label={`Mes candidatures (${myApplications.length})`} value="applications" />
              </Tabs>
            </Paper>
          ) : (
            <Paper sx={{ mb: 3, p: 0.5, borderRadius: 2 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
                <Tab icon={<WhereToVoteIcon />} iconPosition="start" label="Mes offres" value="offers" />
              </Tabs>
            </Paper>
          )}

          {tab === 'offers' && (
            <>
              {offers.length === 0 ? (
                <Empty state="Aucune offre disponible pour le moment." />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                  {offers.map(offer => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isMarin={isMarin}
                      applied={myApplications.some(a => a.offer_id === offer.id)}
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
                <Empty state="Vous n'avez pas encore postulé." />
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
                  {myApplications.map(app => (
                    <Card key={app.id} sx={{ p: 2.5 }}>
                      <Stack spacing={1.5}>
                        <Chip
                          size="small"
                          label={app.job_offers?.specialty_needed}
                          sx={{ alignSelf: 'flex-start' }}
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="h6">{app.job_offers?.title}</Typography>
                        <Typography color="text.secondary" fontSize={13}>
                          📍 {app.job_offers?.location} · {app.job_offers?.start_date} → {app.job_offers?.end_date}
                        </Typography>
                        <Box>
                          <Chip
                            size="small"
                            color={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'}
                            label={app.status === 'accepted' ? 'Accepté ✓' : app.status === 'rejected' ? 'Refusé' : 'En attente'}
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

function Empty({ state }) {
  return (
    <Paper sx={{ textAlign: 'center', py: 10, borderRadius: 3 }}>
      <Typography fontSize={48}>🚢</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>{state}</Typography>
    </Paper>
  )
}

function OfferCard({ offer, isMarin, applied, onApply }) {
  const company = offer.profiles?.company_name || offer.profiles?.full_name
  return (
    <Card className="match-fade" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Chip size="small" label={offer.specialty_needed} color={offer.specialty_needed === 'Capitaine' ? 'secondary' : 'info'} />
        <Chip
          size="small"
          color={offer.urgency === 'urgent' ? 'error' : 'default'}
          label={offer.urgency === 'urgent' ? '🔴 Urgent' : 'Standard'}
          variant={offer.urgency === 'urgent' ? 'filled' : 'outlined'}
        />
      </Box>

      <Typography variant="h6">{offer.title}</Typography>
      <Typography color="text.secondary" fontSize={13}>⛴️ {company}</Typography>

      <Stack spacing={0.4} sx={{ fontSize: 13, color: 'text.secondary' }}>
        <Box>📍 {offer.location}</Box>
        <Box>📅 {offer.start_date} → {offer.end_date}</Box>
        <Box>💰 {offer.daily_rate ? `${offer.daily_rate} €/jour` : 'Négociable'}</Box>
      </Stack>

      <Typography color="text.secondary" fontSize={13} sx={{ opacity: 0.85 }}>
        {offer.description?.substring(0, 110)}{offer.description?.length > 110 ? '...' : ''}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', pt: 1 }}>
        {isMarin ? (
          applied ? (
            <Button fullWidth variant="outlined" color="success" disabled>
              ✓ Candidature envoyée
            </Button>
          ) : (
            <Button fullWidth variant="contained" onClick={onApply}>
              Postuler
            </Button>
          )
        ) : (
          <Button component={Link} to={`/offer/${offer.id}`} fullWidth variant="contained" color="secondary">
            Voir les candidatures
          </Button>
        )}
        <IconButton component={Link} to={`/offer/${offer.id}`} size="small" aria-label="détails">
          <WhereToVoteIcon />
        </IconButton>
      </Box>
    </Card>
  )
}