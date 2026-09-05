import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Typography, Button, Chip, Grid, Paper,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Avatar, Alert, Snackbar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { ROLE_BADGES } from '../utils/constants'

export default function Admin() {
  const { session } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [offers, setOffers] = useState([])
  const [stats, setStats] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchStats()
    fetchUsers()
    fetchOffers()
  }, [])

  async function fetchStats() {
    const [usersCount, offersCount, appsCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('job_offers').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true })
    ])
    setStats({
      users: usersCount.count || 0,
      offers: offersCount.count || 0,
      applications: appsCount.count || 0
    })
  }

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
  }

  async function fetchOffers() {
    const { data } = await supabase
      .from('job_offers')
      .select('*, profiles!job_offers_posted_by_fkey(full_name, company_name)')
      .order('created_at', { ascending: false })
    setOffers(data || [])
  }

  async function toggleBan(userId, currentBanned) {
    await supabase.from('profiles').update({ banned: !currentBanned }).eq('id', userId)
    setToast(currentBanned ? 'Utilisateur débanni' : 'Utilisateur banni')
    fetchUsers()
  }

  async function deleteOffer(offerId) {
    await supabase.from('job_offers').delete().eq('id', offerId)
    setToast('Offre supprimée')
    fetchOffers()
    fetchStats()
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1, px: { xs: 1.5, sm: 3 } }}>
          <Logo />
          <Chip label="ADMIN" size="small" color="error" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" startIcon={<ArrowBackIcon />} component={Link} to="/">
            Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box className="match-fade">
          <Typography variant="h4" sx={{ mb: 3 }}>Administration</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <StatCard icon="👥" label="Utilisateurs" value={stats.users} />
            <StatCard icon="📯" label="Offres" value={stats.offers} />
            <StatCard icon="📝" label="Candidatures" value={stats.applications} />
          </Box>

          <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
              <Tab label={`Utilisateurs (${users.length})`} value="users" />
              <Tab label={`Offres (${offers.length})`} value="offers" />
            </Tabs>
          </Paper>

          {tab === 'users' && (
            <Paper sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Utilisateur</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Spécialité / Société</TableCell>
                    <TableCell>Inscrit le</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id} hover sx={{ opacity: u.banned ? 0.5 : 1 }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: 14, bgcolor: u.role === 'admin' ? '#6366f1' : '#0ea5e9' }}>
                            {u.full_name?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} fontSize={14}>{u.full_name}</Typography>
                            <Typography fontSize={12} color="text.secondary">{u.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={ROLE_BADGES[u.role]?.color || 'default'}
                          label={ROLE_BADGES[u.role]?.label || u.role}
                        />
                      </TableCell>
                      <TableCell>{u.specialty || u.company_name || '-'}</TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString('fr')}</TableCell>
                      <TableCell align="right">
                        {u.id !== session.user.id && (
                          <IconButton
                            size="small"
                            color={u.banned ? 'success' : 'error'}
                            onClick={() => toggleBan(u.id, u.banned)}
                            aria-label={u.banned ? 'débannir' : 'bannir'}
                          >
                            {u.banned ? <CheckCircleIcon /> : <BlockIcon />}
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {tab === 'offers' && (
            <Paper sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Titre</TableCell>
                    <TableCell>Posté par</TableCell>
                    <TableCell>Spécialité</TableCell>
                    <TableCell>Lieu</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {offers.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography fontWeight={600}>{o.title}</Typography></TableCell>
                      <TableCell>{o.profiles?.company_name || o.profiles?.full_name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={o.specialty_needed} color={o.specialty_needed === 'Capitaine' ? 'secondary' : 'info'} variant="outlined" />
                      </TableCell>
                      <TableCell>{o.location}</TableCell>
                      <TableCell>
                        <Chip size="small" label={o.status} color={o.status === 'open' ? 'primary' : o.status === 'filled' ? 'success' : 'default'} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => deleteOffer(o.id)} aria-label="supprimer">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      </Container>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ fontSize: 36 }}>{icon}</Box>
      <Box>
        <Typography variant="h4">{value ?? 0}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  )
}