import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'

const SPECIALTIES = [
  'Capitaine', 'Second Capitaine', 'Officier Mécanicien', 'Chef Mécanicien',
  'Mécanicien', 'Matelot', 'Maître d\'Equipage', 'Cuisinier',
  'Electricien Maritime', 'Soudeur', 'Plongeur', 'Agent de Pont',
  'Timonier', 'Enseigne', 'Pilote'
]

export default function Dashboard() {
  const { session, profile, signOut } = useAuth()
  const [offers, setOffers] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all')
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [showNotifs, setShowNotifs] = useState(false)
  const [tab, setTab] = useState('offers')

  useEffect(() => {
    fetchOffers()
    if (profile?.role === 'marin') fetchMyApplications()
    fetchNotifications()
    subscribeToNotifications()
  }, [profile])

  async function fetchOffers() {
    let query = supabase.from('job_offers')
      .select('*, profiles!job_offers_posted_by_fkey(full_name, company_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (specialtyFilter) query = query.eq('specialty_needed', specialtyFilter)

    const { data } = await query
    setOffers(data || [])
  }

  async function fetchMyApplications() {
    const { data } = await supabase.from('applications')
      .select('*, job_offers(*)')
      .eq('worker_id', session.user.id)
      .order('created_at', { ascending: false })
    setMyApplications(data || [])
  }

  async function fetchNotifications() {
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  function subscribeToNotifications() {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          showBrowserNotification(payload.new)
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  function showBrowserNotification(notif) {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      new Notification('URGEMAR — Remplacement', { body: notif.message })
    }
  }

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  async function applyToOffer(offerId) {
    const { error } = await supabase.from('applications').insert({
      offer_id: offerId,
      worker_id: session.user.id,
      worker_name: profile.full_name,
      worker_specialty: profile.specialty,
      worker_phone: profile.phone
    })
    if (!error) {
      fetchMyApplications()
      await supabase.from('notifications').insert({
        user_id: offers.find(o => o.id === offer_id)?.posted_by,
        message: `${profile.full_name} (${profile.specialty}) postule pour votre offre`,
        type: 'application',
        offer_id: offerId
      })
    }
  }

  async function acceptApplication(appId, workerId, offerId) {
    await supabase.from('applications').update({ status: 'accepted' }).eq('id', appId)
    await supabase.from('job_offers').update({ status: 'filled', filled_by: workerId }).eq('id', offerId)
    await supabase.from('applications').update({ status: 'rejected' }).eq('offer_id', offerId).neq('id', appId)
    await supabase.from('notifications').insert({
      user_id: workerId,
      message: 'Votre candidature a été acceptée ! Le poste est à vous.',
      type: 'accepted',
      offer_id: offerId
    })
    fetchOffers()
  }

  async function markNotifRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const isMarin = profile?.role === 'marin'

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo">
            <span className="logo-icon">⚓</span>
            <span className="logo-text">URGEMAR</span>
          </Link>
        </div>
        <div className="header-right">
          {isMarin && (
            <button className="notif-btn" onClick={() => setShowNotifs(!showNotifs)}>
              🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
          )}
          {profile?.role === 'admin' && <Link to="/admin" className="btn-outline btn-sm">Admin</Link>}
          <div className="user-menu">
            <span className="user-name">{profile?.full_name}</span>
            <span className="user-role">{profile?.role === 'marin' ? `🧑‍✈️ ${profile?.specialty}` : `🏢 ${profile?.company_name}`}</span>
          </div>
          <button onClick={signOut} className="btn-ghost btn-sm">Déconnexion</button>
        </div>
      </header>

      {showNotifs && (
        <div className="notif-panel">
          <h3>Notifications</h3>
          {notifications.length === 0 ? <p className="text-muted">Aucune notification</p> : (
            notifications.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => markNotifRead(n.id)}>
                <p>{n.message}</p>
                <small>{new Date(n.created_at).toLocaleString('fr')}</small>
              </div>
            ))
          )}
        </div>
      )}

      <main className="app-main">
        <div className="dashboard-header">
          <h1>{isMarin ? 'Offres disponibles' : 'Mes offres'}</h1>
          {!isMarin && <Link to="/create-offer" className="btn-primary">+ Nouvelle offre</Link>}
        </div>

        {isMarin && (
          <div className="filters">
            <select value={specialtyFilter} onChange={e => { setSpecialtyFilter(e.target.value); setTimeout(fetchOffers, 0) }}>
              <option value="">Toutes spécialités</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {isMarin && (
          <div className="tabs">
            <button className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')}>Offres ({offers.length})</button>
            <button className={`tab ${tab === 'applications' ? 'active' : ''}`} onClick={() => setTab('applications')}>Mes candidatures ({myApplications.length})</button>
          </div>
        )}

        {tab === 'offers' && (
          <div className="offers-grid">
            {offers.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚢</span>
                <p>Aucune offre disponible pour le moment</p>
              </div>
            ) : offers.map(offer => (
              <div key={offer.id} className="offer-card">
                <div className="offer-header">
                  <span className="offer-specialty">{offer.specialty_needed}</span>
                  <span className="offer-urgency">{offer.urgency === 'urgent' ? '🔴 Urgent' : '🟡 Standard'}</span>
                </div>
                <h3>{offer.title}</h3>
                <p className="offer-company">{offer.profiles?.company_name || offer.profiles?.full_name}</p>
                <div className="offer-details">
                  <span>📍 {offer.location}</span>
                  <span>📅 {offer.start_date} → {offer.end_date}</span>
                  <span>💰 {offer.daily_rate ? offer.daily_rate + '€/jour' : 'À négocier'}</span>
                </div>
                <p className="offer-desc">{offer.description?.substring(0, 120)}...</p>
                <div className="offer-actions">
                  {isMarin ? (
                    myApplications.some(a => a.offer_id === offer.id) ? (
                      <span className="btn-applied">✓ Déjà postulé</span>
                    ) : (
                      <button className="btn-primary" onClick={() => applyToOffer(offer.id)}>Postuler</button>
                    )
                  ) : (
                    <Link to={`/offer/${offer.id}`} className="btn-outline">Voir les candidatures</Link>
                  )}
                  <Link to={`/offer/${offer.id}`} className="btn-ghost">Détails</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'applications' && (
          <div className="offers-grid">
            {myApplications.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <p>Vous n'avez pas encore postulé</p>
              </div>
            ) : myApplications.map(app => (
              <div key={app.id} className="offer-card">
                <div className="offer-header">
                  <span className="offer-specialty">{app.job_offers?.specialty_needed}</span>
                  <span className={`status-badge status-${app.status}`}>
                    {app.status === 'pending' ? '⏳ En attente' : app.status === 'accepted' ? '✅ Accepté' : '❌ Refusé'}
                  </span>
                </div>
                <h3>{app.job_offers?.title}</h3>
                <div className="offer-details">
                  <span>📍 {app.job_offers?.location}</span>
                  <span>📅 {app.job_offers?.start_date} → {app.job_offers?.end_date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
