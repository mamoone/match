import { supabase } from './supabase'
import { DEFAULT_SPECIALTIES, DEFAULT_VESSELS } from './constants'

export async function fetchConfig() {
  const { data } = await supabase.from('app_config').select('key, value')
  const map = {}
  ;(data || []).forEach(r => { map[r.key] = r.value })
  return {
    specialties: Array.isArray(map.offer_specialties) && map.offer_specialties.length ? map.offer_specialties : DEFAULT_SPECIALTIES,
    vessels: Array.isArray(map.vessel_types) && map.vessel_types.length ? map.vessel_types : DEFAULT_VESSELS,
  }
}

export async function saveConfig(key, list) {
  const { error } = await supabase
    .from('app_config')
    .upsert({ key, value: list }, { onConflict: 'key' })
  return error
}