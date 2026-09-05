import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Container, Typography, Button, Chip, Grid, Paper,
  Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Avatar, Alert, Snackbar, Stack, TextField, MenuItem, Select, InputLabel,
  FormControl, Fab,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SettingsIcon from '@mui/icons-material/Settings'
import { supabase } from '../utils/supabase'
import { useAuth, Logo } from '../App'
import { ROLE_BADGES, PAYMENT_STATUS_LABELS, CURRENCY, SPECIALTY_LABELS } from '../utils/constants'
import { fetchConfig, saveConfig } from '../utils/config'

export default function Admin() {
  const { session } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [offers, setOffers] = useState([])
  const [payments, setPayments] = useState([])
  const [stats, setStats] = useState({})
  const [toast, setToast] = useState('')
  const [toastOk, setToastOk] = useState(true)

  useEffect(() => {
    refreshAll()
  }, [])

  async function refreshAll() {
    await Promise.all([fetchStats(), fetchUsers(), fetchOffers(), fetchPayments()])
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

  async function fetchPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*, profiles(full_name, company_name)')
      .order('month', { ascending: false })
    setPayments(data || [])
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

  async function setPaymentStatus(paymentId, status) {
    await supabase.from('payments').update({ status }).eq('id', paymentId)
    notify(status === 'paid' ? 'تم تأكيد الأداء ✓' : 'تم تغيير الحالة')
    fetchPayments()
  }

  async function deletePayment(paymentId) {
    await supabase.from('payments').delete().eq('id', paymentId)
    notify('تم حذف القسط')
    fetchPayments()
  }

  const pendingTotal = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount_mad || 0), 0)
  const paidTotal = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount_mad || 0), 0)

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
              <Tab label={`المدفوعات (${payments.length})`} value="payments" />
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

          {tab === 'payments' && <PaymentsTab payments={payments} pendingTotal={pendingTotal} paidTotal={paidTotal} users={users} setPaymentStatus={setPaymentStatus} deletePayment={deletePayment} onSaved={fetchPayments} notify={notify} />}

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

function PaymentsTab({ payments, pendingTotal, paidTotal, users, setPaymentStatus, deletePayment, onSaved, notify }) {
  const captains = users.filter(u => u.role === 'capitaine')
  const [form, setForm] = useState({ profile_id: '', month: '', amount_mad: '', note: '' })
  const [saving, setSaving] = useState(false)

  async function addPayment(e) {
    e.preventDefault()
    if (!form.profile_id || !form.month || !form.amount_mad) { notify('أكمل الحقول المطلوبة', false); return }
    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      profile_id: form.profile_id,
      month: `${form.month}-01`,
      amount_mad: Number(form.amount_mad),
      status: 'pending',
      note: form.note,
    })
    setSaving(false)
    if (error) { notify(error.message, false); return }
    setForm({ profile_id: '', month: '', amount_mad: '', note: '' })
    notify('تمت إضافة القسط ✓')
    onSaved()
  }

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard icon="⏳" label={`غير مؤدى (${CURRENCY})`} value={pendingTotal} />
        <StatCard icon="✅" label={`مؤدى (${CURRENCY})`} value={paidTotal} />
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>إضافة قسط شهري</Typography>
        <Stack component="form" spacing={2} onSubmit={addPayment} direction={{ xs: 'column', sm: 'row' }} sx={{ flexWrap: 'wrap', gap: 2, '& .MuiFormControl-root': { flex: '1 1 180px' } }}>
          <FormControl size="small">
            <InputLabel>الربان</InputLabel>
            <Select
              value={form.profile_id}
              onChange={e => setForm(p => ({ ...p, profile_id: e.target.value }))}
              label="الربان"
              required
            >
              {captains.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="الشهر"
            type="month"
            value={form.month}
            onChange={e => setForm(p => ({ ...p, month: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            size="small"
            label={`المبلغ (${CURRENCY})`}
            type="number"
            value={form.amount_mad}
            onChange={e => setForm(p => ({ ...p, amount_mad: e.target.value }))}
            inputProps={{ min: 0 }}
            required
          />
          <TextField
            size="small"
            label="ملاحظة"
            value={form.note}
            onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
          />
          <Button type="submit" variant="contained" disabled={saving} startIcon={<AddIcon />}>
            {saving ? '...' : 'إضافة'}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الربان</TableCell>
              <TableCell>الشهر</TableCell>
              <TableCell>المبلغ ({CURRENCY})</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>ملاحظة</TableCell>
              <TableCell align="left">إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>لا توجد مدفوعات بعد.</Typography></TableCell></TableRow>
            )}
            {payments.map(p => (
              <TableRow key={p.id} hover sx={{ opacity: p.status === 'paid' ? 0.7 : 1 }}>
                <TableCell><Typography fontWeight={600}>{p.profiles?.full_name || '-'}</Typography></TableCell>
                <TableCell>{new Date(p.month).toLocaleDateString('ar', { month: 'long', year: 'numeric' })}</TableCell>
                <TableCell>{p.amount_mad} {CURRENCY}</TableCell>
                <TableCell>
                  <Chip size="small" color={p.status === 'paid' ? 'success' : 'warning'} label={PAYMENT_STATUS_LABELS[p.status]} variant="outlined" />
                </TableCell>
                <TableCell>{p.note || '-'}</TableCell>
                <TableCell align="left" sx={{ whiteSpace: 'nowrap' }}>
                  <Button
                    size="small"
                    color={p.status === 'paid' ? 'warning' : 'success'}
                    variant="outlined"
                    onClick={() => setPaymentStatus(p.id, p.status === 'paid' ? 'pending' : 'paid')}
                    sx={{ mr: 1 }}
                  >
                    {p.status === 'paid' ? 'إلغاء الأداء' : 'تأكيد الأداء'}
                  </Button>
                  <IconButton size="small" color="error" onClick={() => deletePayment(p.id)} aria-label="حذف">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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
          <Chip
            key={`${item}-${i}`}
            label={item}
            onDelete={() => onRemove(i)}
            sx={{ fontSize: 13 }}
          />
        ))}
        {items.length === 0 && (
          <Typography color="text.secondary" fontSize={13}>القائمة فارغة.</Typography>
        )}
      </Stack>
    </Paper>
  )
}