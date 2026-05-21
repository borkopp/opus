// Shared formatting helpers — beauty_wellness booking flow.

export function formatPrice(minor: number, currency?: string): string {
  const sym =
    currency?.toUpperCase() === 'GBP' ? '£'
    : currency?.toUpperCase() === 'USD' ? '$'
    : '€';
  const amount = minor / 100;
  return `${sym}${amount % 1 === 0 ? Math.round(amount) : amount.toFixed(2)}`;
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatSlotTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatBookingDate(ms: number): string {
  const d = new Date(ms);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${weekdays[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export type DateOption = {
  value: string;     // YYYY-MM-DD (local date)
  dayLabel: string;  // Today | Tmrw | Mon | Tue …
  dateNum: number;
};

export function buildDateRail(count = 14): DateOption[] {
  const options: DateOption[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() + i);

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const value = `${yyyy}-${mm}-${dd}`;

    let dayLabel: string;
    if (i === 0) dayLabel = 'Today';
    else if (i === 1) dayLabel = 'Tmrw';
    else dayLabel = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(d);

    options.push({ value, dayLabel, dateNum: d.getDate() });
  }

  return options;
}
