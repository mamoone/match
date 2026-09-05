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

export default function Profile() {
  const { profile, fetchProfile, session } = useAuth()
  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) setForm({ ...profile })
  }, [profile])

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    const updates = {
      full_name: form.full_name,
      phone: form.phone,
      specialty: form.role === 'marin' ? form.specialty : null,
      company_name: form.role === 'responsable' ? form.company_name : null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      certifications: form.certifications
    }
    await supabase.from('profiles').update(updates).eq('id', session.user.id)
    await fetchProfile(session.user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setLoading(false)
  }

  if (!form) return <div className="loading-screen"><div className="spinner"></div></div>

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
          <h1>Mon profil</h1>
          {saved && <div className="success-msg">✓ Profil mis à jour</div>}

          <form onSubmit={handleSave} className="offer-form">
            <div className="form-group">
              <label>Nom complet</label>
              <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} disabled className="input-disabled" />
            </div>

            <div className="form-group">
              <label>Téléphone</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} required />
            </div>

            {form.role === 'marin' && (
              <>
                <div className="form-group">
                  <label>Spécialité</label>
                  <select value={form.specialty || ''} onChange={e => update('specialty', e.target.value)} required>
                    <option value="">Choisir</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Années d'expérience</label>
                  <input type="number" value={form.experience_years || ''} onChange={e => update('experience_years', e.target.value)} min="0" />
                </div>

                <div className="form-group">
                  <label>Diplômes / Certifications (séparés par virgules)</label>
                  <textarea value={form.certifications || ''} onChange={e => update('certifications', e.target.value)} rows={3} placeholder="Ex: Capitaine 500 GT, STCW, SST..." />
                </div>
              </>
            )}

            {form.role === 'responsable' && (
              <div className="form-group">
                <label>Nom de l'entreprise</label>
                <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)} />
              </div>
            )}

            <button type="submit" className="btn-primary btn-lg" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
