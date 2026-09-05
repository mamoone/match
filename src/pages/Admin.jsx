import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'

export default function Admin() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [offers, setOffers] = useState([])
  const [stats, setStats] = useState({})

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
    const { data } = await supabase.from('job_offers').select('*, profiles!job_offers_posted_by_fkey(full_name, company_name)').order('created_at', { ascending: false })
    setOffers(data || [])
  }

  async function toggleBan(userId, currentBanned) {
    await supabase.from('profiles').update({ banned: !currentBanned }).eq('id', userId)
    fetchUsers()
  }

  async function deleteOffer(offerId) {
    await supabase.from('job_offers').delete().eq('id', offerId)
    fetchOffers()
    fetchStats()
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="logo">
            <span className="logo-icon">⚓</span>
            <span className="logo-text">URGEMAR</span>
          </Link>
          <span className="admin-badge">ADMIN</span>
        </div>
        <div className="header-right">
          <Link to="/" className="btn-ghost btn-sm">← Dashboard</Link>
        </div>
      </header>

      <main className="app-main">
        <h1>Administration</h1>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{stats.users}</span>
            <span className="stat-label">Utilisateurs</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.offers}</span>
            <span className="stat-label">Offres</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{stats.applications}</span>
            <span className="stat-label">Candidatures</span>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Utilisateurs ({users.length})</button>
          <button className={`tab ${tab === 'offers' ? 'active' : ''}`} onClick={() => setTab('offers')}>Offres ({offers.length})</button>
        </div>

        {tab === 'users' && (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Nom</th><th>Email</th><th>Rôle</th><th>Spécialité</th><th>Inscrit le</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={u.banned ? 'banned-row' : ''}>
                    <td><strong>{u.full_name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className="role-tag">{u.role}</span></td>
                    <td>{u.specialty || u.company_name || '-'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('fr')}</td>
                    <td>
                      <button className={`btn-sm ${u.banned ? 'btn-warning' : 'btn-danger'}`} onClick={() => toggleBan(u.id, u.banned)}>
                        {u.banned ? 'Débannir' : 'Bannir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'offers' && (
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>Titre</th><th>Posté par</th><th>Spécialité</th><th>Lieu</th><th>Statut</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id}>
                    <td><strong>{o.title}</strong></td>
                    <td>{o.profiles?.company_name || o.profiles?.full_name}</td>
                    <td>{o.specialty_needed}</td>
                    <td>{o.location}</td>
                    <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                    <td>
                      <button className="btn-danger btn-sm" onClick={() => deleteOffer(o.id)}>Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
