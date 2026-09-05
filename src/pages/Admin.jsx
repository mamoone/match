import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Typography, Button, Chip, Paper,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Avatar, Alert, Snackbar, Stack, TextField, Select, InputLabel,
  FormControl, InputAdornment,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SettingsIcon from '@mui/icons-material/Settings'
import PaymentsIcon from '@mui/icons-material/Payments'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { ROLE_BADGES, COLLECTION_TOTAL, CURRENCY, SPECIALTY_LABELS } from '../utils/constants'
import { fetchConfig, saveConfig } from '../utils/config'

export default function Admin() {
  const { session } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [offers, setOffers] = useState([])
  const [stats, setStats] = useState({})
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    await Promise.all([fetchStats(), fetchUsers(), fetchOffers()])
  }

  function notify(msg, ok = true) { setToast(msg); setToastOk(ok) }

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
    const { error } = await supabase.from('profiles').update({ banned: !currentBanned }).eq('id', userId)
    if (error) notify(error.message, false)
    else notify(currentBanned ? 'تم تفعيل المستخدم ✓' : 'تم تعطيل المستخدم')
    fetchUsers()
  }

  async function deleteOffer(offerId) {
    await supabase.from('job_offers').delete().eq('id', offerId)
    notify('تم حذف العرض')
    fetchOffers(); fetchStats()
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1, px: { xs: 1.5, sm: 3 } }}>
          <Logo />
          <Chip label="الإدارة" size="small" color="error" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" startIcon={<ArrowBackIcon />} component={Link} to="/">
            لوحة التحكم
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box className="match-fade">
          <Typography variant="h4" sx={{ mb: 3 }}>الإدارة</Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            <StatCard icon="👥" label="المستخدمون" value={stats.users} />
            <StatCard icon="📯" label="العروض" value={stats.offers} />
            <StatCard icon="📝" label="الطلبات" value={stats.applications} />
          </Box>

          <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" scrollButtons="auto" textColor="primary" indicatorColor="primary">
              <Tab label={`المستخدمون (${users.length})`} value="users" />
              <Tab label={`العروض (${offers.length})`} value="offers" />
              <Tab icon={<PaymentsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="التحصيل" value="collections" />
              <Tab icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="الإعدادات" value="config" />
            </Tabs>
          </Paper>

          {tab === 'users' && (
            <Paper sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المستخدم</TableCell>
                    <TableCell>الدور</TableCell>
                    <TableCell>المدينة</TableCell>
                    <TableCell>التخصص / الشركة</TableCell>
                    <TableCell>تاريخ التسجيل</TableCell>
                    <TableCell align="left">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id} hover sx={{ opacity: u.banned ? 0.5 : 1 }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: 14, bgcolor: u.role === 'admin' ? '#6366f1' : '#0ea5e9' }}>
                            {u.full_name?.[0]?.toUpperCase() || '؟'}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600} fontSize={14}>{u.full_name}</Typography>
                            <Typography fontSize={12} color="text.secondary" dir="ltr" sx={{ textAlign: 'right' }}>{u.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={ROLE_BADGES[u.role]?.color || 'default'} label={ROLE_BADGES[u.role]?.label || u.role} />
                      </TableCell>
                      <TableCell>{u.city || 'SAFI'}</TableCell>
                      <TableCell>{u.specialty || u.company_name || '-'}</TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString('ar')}</TableCell>
                      <TableCell align="left">
                        <Chip
                          size="small"
                          color={u.banned ? 'error' : 'success'}
                          label={u.banned ? 'معطل' : 'مفعل'}
                          variant="outlined"
                        />
                        {u.id !== session.user.id && (
                          <IconButton
                            size="small"
                            color={u.banned ? 'success' : 'error'}
                            onClick={() => toggleBan(u.id, u.banned)}
                            aria-label={u.banned ? 'تفعيل' : 'تعطيل'}
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
                    <TableCell>العنوان</TableCell>
                    <TableCell>الناشر</TableCell>
                    <TableCell>التخصص</TableCell>
                    <TableCell>المكان</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="left">إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {offers.map(o => (
                    <TableRow key={o.id} hover>
                      <TableCell><Typography fontWeight={600}>{o.title}</Typography></TableCell>
                      <TableCell>{o.profiles?.company_name || o.profiles?.full_name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={SPECIALTY_LABELS[o.specialty_needed] || o.specialty_needed} variant="outlined" />
                      </TableCell>
                      <TableCell>{o.location}</TableCell>
                      <TableCell>
                        <Chip size="small" label={o.status} color={o.status === 'open' ? 'primary' : o.status === 'filled' ? 'success' : 'default'} variant="outlined" />
                      </TableCell>
                      <TableCell align="left">
                        <IconButton size="small" color="error" onClick={() => deleteOffer(o.id)} aria-label="حذف">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}

          {tab === 'collections' && <CollectionsTab notify={notify} />}

          {tab === 'config' && <ConfigTab notify={notify} />}
        </Box>
      </Container>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toastOk ? 'success' : 'error'} variant="filled" onClose={() => setToast('')}>{toast}</Alert>
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

const COLLECTION_QUERY = `
  *, job_offers(title, location, specialty_needed),
  captain:profiles!collections_captain_id_fkey(full_name, company_name),
  sailor:profiles!collections_sailor_id_fkey(full_name)
`

function CollectionsTab({ notify }) {
  const [rows, setRows] = useState([])
  const [payments, setPayments] = useState({}) // rowId -> amount to register

  async function fetchRows() {
    const { data } = await supabase
      .from('collections')
      .select(COLLECTION_QUERY)
      .order('created_at', { ascending: false })
    setRows(data || [])
  }

  useEffect(() => { fetchRows() }, [])

  async function registerPayment(rowId) {
    const amount = Number(payments[rowId] || 0)
    if (!amount || amount <= 0) { notify('أدخل المبلغ المستلم', false); return }
    const row = rows.find(r => r.id === rowId)
    const received = Number(row.received_mad) + amount
    const { error } = await supabase
      .from('collections')
      .update({ received_mad: received, status: received >= Number(row.total_mad) ? 'ok' : 'pending' })
      .eq('id', rowId)
    if (error) { notify(error.message, false); return }
    setPayments(p => ({ ...p, [rowId]: '' }))
    notify(`تم تسجيل استلام ${amount} ${CURRENCY} ✓`)
    fetchRows()
  }

  async function completeCollection(rowId) {
    const row = rows.find(r => r.id === rowId)
    await supabase
      .from('collections')
      .update({ received_mad: row.total_mad, status: 'ok' })
      .eq('id', rowId)
    notify('تم تأكيد التسليم الكامل ✓')
    fetchRows()
  }

  const total = rows.reduce((s, r) => s + Number(r.total_mad || 0), 0)
  const received = rows.reduce((s, r) => s + Number(r.received_mad || 0), 0)

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard icon="⏳" label={`مطلوب التحصيل (${CURRENCY})`} value={total - received} />
        <StatCard icon="✅" label={`تم استلامه (${CURRENCY})`} value={received} />
      </Box>

      <Paper sx={{ px: 3, py: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PaymentsIcon color="warning" />
        <Typography fontSize={14} color="text.secondary">
          كل مهمة مكتملة = <b>{COLLECTION_TOTAL} {CURRENCY}</b> (50 من الربان + 50 من البحار) — يتحصّلها الربان ويسلمها لك. سجل ما استلمته واطلع على المتبقي.
        </Typography>
      </Paper>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>العرض</TableCell>
              <TableCell>الربان</TableCell>
              <TableCell>البحار</TableCell>
              <TableCell>المجموع</TableCell>
              <TableCell>المستلم</TableCell>
              <TableCell>المتبقي</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="left">تسجيل الاستلام</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                    لا توجد مهام مكتملة — سيظهر التحصيل تلقائياً بعد اختيار الربان لبحار.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(r => {
              const remaining = Math.max(Number(r.total_mad || 0) - Number(r.received_mad || 0), 0)
              const done = Number(r.received_mad || 0) >= Number(r.total_mad || 0)
              return (
                <TableRow key={r.id} hover sx={{ opacity: done ? 0.7 : 1 }}>
                  <TableCell>
                    <Typography fontWeight={600} fontSize={14}>{r.job_offers?.title}</Typography>
                    <Typography fontSize={12} color="text.secondary">📍 {r.job_offers?.location}</Typography>
                  </TableCell>
                  <TableCell>{r.captain?.company_name || r.captain?.full_name || '-'}</TableCell>
                  <TableCell>{r.sailor?.full_name || '-'}</TableCell>
                  <TableCell>{r.total_mad} {CURRENCY}</TableCell>
                  <TableCell>
                    <b style={{ color: '#34d399' }}>{r.received_mad} {CURRENCY}</b>
                  </TableCell>
                  <TableCell>
                    <b style={{ color: done ? '#34d399' : '#f87171' }}>{remaining} {CURRENCY}</b>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={done ? 'success' : 'warning'} label={done ? 'مكتمل' : 'قيد التحصيل'} variant="outlined" />
                  </TableCell>
                  <TableCell align="left">
                    {!done && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <TextField
                          size="small"
                          type="number"
                          placeholder="المبلغ"
                          inputProps={{ min: 0 }}
                          value={payments[r.id] || ''}
                          onChange={e => setPayments(p => ({ ...p, [r.id]: e.target.value }))}
                          sx={{ width: 110 }}
                        />
                        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => registerPayment(r.id)}>
                          سجل
                        </Button>
                        <Button size="small" variant="outlined" color="success" onClick={() => completeCollection(r.id)}>
                          تسليم كامل
                        </Button>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function ConfigTab({ notify }) {
  const [specialties, setSpecialties] = useState([])
  const [vessels, setVessels] = useState([])
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newVessel, setNewVessel] = useState('')
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    fetchConfig().then(cf => { setSpecialties(cf.specialties); setVessels(cf.vessels) })
  }, [])

  async function save(key, list) {
    setSaving(key)
    const err = await saveConfig(key, list)
    setSaving(null)
    if (err) notify(err.message, false)
    else notify('تم الحفظ ✓')
  }

  async function addItem(type) {
    const item = (type === 'specialties' ? newSpecialty : newVessel).trim()
    if (!item) return
    if (type === 'specialties') {
      const next = specialties.includes(item) ? specialties : [...specialties, item]
      setSpecialties(next); setNewSpecialty('')
      await save('offer_specialties', next)
    } else {
      const next = vessels.includes(item) ? vessels : [...vessels, item]
      setVessels(next); setNewVessel('')
      await save('vessel_types', next)
    }
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
      <Editor
        title="أنواع التخصصات المطلوبة"
        items={specialties.map(s => SPECIALTY_LABELS[s] || s)}
        onRemove={async i => { const next = specialties.filter((_, idx) => idx !== i); setSpecialties(next); await save('offer_specialties', next) }}
        addValue={newSpecialty}
        setAddValue={setNewSpecialty}
        onAdd={() => addItem('specialties')}
        saving={saving === 'offer_specialties'}
        placeholder="أضف تخصصاً"
      />
      <Editor
        title="أنواع السفن"
        items={vessels}
        onRemove={async i => { const next = vessels.filter((_, idx) => idx !== i); setVessels(next); await save('vessel_types', next) }}
        addValue={newVessel}
        setAddValue={setNewVessel}
        onAdd={() => addItem('vessels')}
        saving={saving === 'vessel_types'}
        placeholder="أضف نوع سفينة"
      />
    </Box>
  )
}

function Editor({ title, items, onRemove, addValue, setAddValue, onAdd, saving, placeholder }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={placeholder}
          value={addValue}
          onChange={e => setAddValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
        />
        <Button variant="contained" onClick={onAdd} disabled={saving} startIcon={<AddIcon />}>إضافة</Button>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {items.map((item, i) => (
          <Chip key={`${item}-${i}`} label={item} onDelete={() => onRemove(i)} sx={{ fontSize: 13 }} />
        ))}
        {items.length === 0 && (
          <Typography color="text.secondary" fontSize={13}>القائمة فارغة.</Typography>
        )}
      </Stack>
    </Paper>
  )
}