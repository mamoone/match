// Rôles utilisateur (valeurs stockées) + libellés arabes
export const ROLES = ['Marin', 'Capitaine']

export const ROLE_BADGES = {
  marin: { label: 'بحار', color: 'primary' },
  capitaine: { label: 'ربان', color: 'secondary' },
  admin: { label: 'مدير', color: 'error' },
}

export const SPECIALTY_LABELS = {
  Marin: 'بحار',
  'Mécanicien': 'ميكانيكي',
  Gardien: 'حارس',
}

export const DEFAULT_SPECIALTIES = ['Marin', 'Mécanicien', 'Gardien']

export const DEFAULT_VESSELS = [
  'سفينة صيد السردين',
  'شباك الجر',
  'الصيد الساحلي',
  'سفينة صيد الأعماق',
  'ناقلة',
  'سفينة الحاويات',
  'قارب النزهة',
  'مركب تقليدي',
  'أخرى',
]

export const URGENCY_LABELS = {
  urgent: 'عاجل',
  standard: 'عادي',
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'في انتظار التحصيل',
  ok: 'مكتمل',
}

export const COLLECTION_TOTAL = 100 // 50 capitaine + 50 marin par mission

export const OFFER_STATUS_LABELS = {
  open: 'مفتوحة',
  filled: 'مؤجرة',
  cancelled: 'ملغاة',
}

export const APP_NAME = 'Match'

// Identifiants par défaut annoncés
export const DEFAULT_LOGIN = 'mmn'
export const DEFAULT_PASSWORD = 'mmn123!'
export const CURRENCY = 'MAD'