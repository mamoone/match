import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../App'

const SPECIALTIES = [
  'Capitaine', 'Second Capitaine', 'Officier Mécanicien', 'Chef Mécanicien',
  'Mécanicien', 'Matelot', 'Maître d\'Equipage', 'Cuisinier',
  'Electricien Maritime', 'Soudeur', 'Plongeur', 'Agent de Pont',
  'Timonier', 'Enseigne', 'Pilote'
]

export default function CreateOffer() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', specialty_needed: '',
    location: '', start_date: '', end_date: '',
    daily_rate: '', urgency: 'standard', vessel_type: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('job_offers').insert({
      ...form,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      posted_by: session.user.id,
      status: 'open'
    })

    if (insertError) { setError(insertError.message); setLoading(false); return }
    navigate('/')
  }

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
        <div className="form-page">
          <h1>Publier une offre de remplacement</h1>
          <p className="text-muted">Décrivez votre besoin. Les marins éligibles seront notifiés instantanément.</p>

          <form onSubmit={handleSubmit} className="offer-form">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label>Titre de l'offre *</label>
              <input type="text" value={form.title} onChange={e => update('title', e.target.value)} required placeholder="Ex: Capitaine pour porte-conteneurs" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Spécialité recherchée *</label>
                <select value={form.specialty_needed} onChange={e => update('specialty_needed', e.target.value)} required>
                  <option value="">Choisir</option>
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type de navire</label>
                <input type="text" value={form.vessel_type} onChange={e => update('vessel_type', e.target.value)} placeholder="Ex: Porte-conteneurs, Pétrolier..." />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} required rows={4} placeholder="Décrivez la mission, les conditions, exigences..." />
            </div>

            <div className="form-group">
              <label>Port / Lieu d'embarquement *</label>
              <input type="text" value={form.location} onChange={e => update('location', e.target.value)} required placeholder="Ex: Marseille, Le Havre, Dakar..." />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date de début *</label>
                <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Date de fin *</label>
                <input type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Taux journalier (€)</label>
                <input type="number" value={form.daily_rate} onChange={e => update('daily_rate', e.target.value)} placeholder="Optionnel" min="0" />
              </div>
              <div className="form-group">
                <label>Urgence</label>
                <select value={form.urgency} onChange={e => update('urgency', e.target.value)}>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent (notif push)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary btn-lg" disabled={loading}>
              {loading ? 'Publication...' : 'Publier l\'offre'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
