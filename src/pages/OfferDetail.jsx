import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'

export default function OfferDetail() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const [offer, setOffer] = useState(null)
  const [applications, setApplications] = useState([])
  const isOwner = offer?.posted_by === session.user.id

  useEffect(() => {
    fetchOffer()
  }, [id])

  async function fetchOffer() {
    const { data } = await supabase.from('job_offers')
      .select('*, profiles!job_offers_posted_by_fkey(full_name, company_name, specialty)')
      .eq('id', id).single()
    setOffer(data)
    if (data) fetchApplications(data.posted_by, data.filled_by)
  }

  async function fetchApplications(postedBy, filledBy) {
    const { data } = await supabase.from('applications')
      .select('*')
      .eq('offer_id', id).order('created_at', { ascending: true })
    setApplications(data || [])
  }

  async function acceptApplication(appId, workerId) {
    await supabase.from('applications').update({ status: 'accepted' }).eq('id', appId)
    await supabase.from('job_offers').update({ status: 'filled', filled_by: workerId }).eq('id', id)
    await supabase.from('applications').update({ status: 'rejected' }).eq('offer_id', id).neq('id', appId)
    const { data: app } = await supabase.from('applications').select('*').eq('id', appId).single()
    await supabase.from('notifications').insert({
      user_id: workerId,
      message: `Votre candidature pour "${offer.title}" a été acceptée !`,
      type: 'accepted', offer_id: id
    })
    fetchOffer()
  }

  async function selectCandidate(workerId, workerName) {
    await acceptApplication(
      applications.find(a => a.worker_id === workerId)?.id,
      workerId
    )
    setApplications(prev => prev.map(a => a.worker_id === workerId ? { ...a, status: 'accepted' } : { ...a, status: 'rejected' }))
  }

  if (!offer) return <div className="loading-screen"><div className="spinner"></div></div>

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
          <Link to="/" className="btn-ghost btn-sm">← Retour</Link>
        </div>
      </header>

      <main className="app-main">
        <div className="offer-detail">
          <div className="detail-header">
            <div className="detail-tags">
              <span className="offer-specialty">{offer.specialty_needed}</span>
              <span className={`urgency-tag urgency-${offer.urgency}`}>{offer.urgency === 'urgent' ? '🔴 URGENT' : '🟡 Standard'}</span>
              {offer.status === 'filled' && <span className="urgency-tag urgency-filled">✅ Poste pourvu</span>}
            </div>
            <h1>{offer.title}</h1>
            <p className="company-name">{offer.profiles?.company_name || offer.profiles?.full_name}</p>
          </div>

          <div className="detail-info-grid">
            <div className="info-card">
              <span className="info-icon">📍</span>
              <div><small>Port</small><strong>{offer.location}</strong></div>
            </div>
            <div className="info-card">
              <span className="info-icon">📅</span>
              <div><small>Période</small><strong>{offer.start_date} → {offer.end_date}</strong></div>
            </div>
            <div className="info-card">
              <span className="info-icon">💰</span>
              <div><small>Taux</small><strong>{offer.daily_rate ? offer.daily_rate + ' €/jour' : 'Négociable'}</strong></div>
            </div>
            <div className="info-card">
              <span className="info-icon">⛴️</span>
              <div><small>Navire</small><strong>{offer.vessel_type || 'Non spécifié'}</strong></div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Description de la mission</h3>
            <p>{offer.description}</p>
          </div>

          {isOwner && (
            <div className="detail-section">
              <h3>Candidatures ({applications.length})</h3>
              {applications.length === 0 ? (
                <p className="text-muted">Aucune candidature pour le moment</p>
              ) : (
                <div className="applications-list">
                  {applications.map(app => (
                    <div key={app.id} className={`application-card app-${app.status}`}>
                      <div className="app-avatar">🧑‍✈️</div>
                      <div className="app-info">
                        <strong>{app.worker_name}</strong>
                        <span>{app.worker_specialty}</span>
                        <span className="app-phone">📞 {app.worker_phone}</span>
                      </div>
                      <div className="app-status">
                        {app.status === 'pending' && offer.status === 'open' ? (
                          <button className="btn-success" onClick={() => selectCandidate(app.worker_id, app.worker_name)}>
                            ✓ Accepter ce marin
                          </button>
                        ) : (
                          <span className={`status-badge status-${app.status}`}>
                            {app.status === 'accepted' ? '✅ CHOISI' : app.status === 'rejected' ? '❌ Refusé' : '⏳ En attente'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}