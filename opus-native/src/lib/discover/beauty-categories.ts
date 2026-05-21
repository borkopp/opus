export type BeautyCategory =
  | 'barbershop'
  | 'hair_salon'
  | 'nail_salon'
  | 'spa'
  | 'beauty_salon'
  | 'lash_studio'
  | 'brow_bar'
  | 'tattoo_studio'
  | 'massage_therapy'
  | 'wellness_center'
  | 'personal_trainer';

export const BEAUTY_CATEGORIES: { id: BeautyCategory; label: string }[] = [
  { id: 'barbershop', label: 'Barbershop' },
  { id: 'hair_salon', label: 'Hair Salon' },
  { id: 'nail_salon', label: 'Nail Salon' },
  { id: 'spa', label: 'Spa' },
  { id: 'beauty_salon', label: 'Beauty Salon' },
  { id: 'lash_studio', label: 'Lash Studio' },
  { id: 'brow_bar', label: 'Brow Bar' },
  { id: 'tattoo_studio', label: 'Tattoo Studio' },
  { id: 'massage_therapy', label: 'Massage Therapy' },
  { id: 'wellness_center', label: 'Wellness Center' },
  { id: 'personal_trainer', label: 'Personal Trainer' },
];

export function beautyCategoryLabel(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return BEAUTY_CATEGORIES.find((c) => c.id === id)?.label;
}
