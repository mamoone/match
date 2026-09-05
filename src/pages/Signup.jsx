import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'

const SPECIALTIES = [
  'Capitaine', 'Second Capitaine', 'Officier Mécanicien', 'Chef Mécanicien',
  'Mécanicien', 'Matelot', 'Maître d\'Equipage', 'Cuisinier',
  'Electricien Maritime', 'Soudeur', 'Plongeur', 'Agent de Pont',
  'Timonier', 'Enseigne', 'Pilote'
]

export default function Signup() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    role: 'marin', specialty: '', company_name: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function update(field, val) { setForm(p => ({ ...p, [field]: val })) }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, phone: form.phone }
      }
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        specialty: form.role === 'marin' ? form.specialty : null,
        company_name: form.role === 'responsable' ? form.company_name : null
      })

      if (profileError) { setError(profileError.message); setLoading(false); return }
    }

    navigate('/')
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo">
            <span className="logo-icon">⚓</span>
            <span className="logo-text">URGEMAR</span>
          </div>
          <p className="auth-subtitle">Rejoignez le réseau de remplacement maritime</p>
        </div>

        <form onSubmit={handleSignup} className="auth-form">
          <h2>Inscription</h2>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label>Nom complet</label>
            <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Téléphone</label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} />
          </div>

          <div className="form-group">
            <label>Je suis</label>
            <div className="role-selector">
              <button type="button" className={`role-btn ${form.role === 'marin' ? 'active' : ''}`} onClick={() => update('role', 'marin')}>
                <span className="role-icon">🧑‍✈️</span>
                <span>Marin</span>
              </button>
              <button type="button" className={`role-btn ${form.role === 'responsable' ? 'active' : ''}`} onClick={() => update('role', 'responsable')}>
                <span className="role-icon">🏢</span>
                <span>Responsable</span>
              </button>
            </div>
          </div>

          {form.role === 'marin' && (
            <div className="form-group">
              <label>Spécialité</label>
              <select value={form.specialty} onChange={e => update('specialty', e.target.value)} required>
                <option value="">Choisir une spécialité</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {form.role === 'responsable' && (
            <div className="form-group">
              <label>Nom de l'entreprise</label>
              <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)} required />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>

          <p className="auth-link">
            Déjà inscrit ? <Link to="/login">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
