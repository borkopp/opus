export type Appointment = {
  id: string;
  name: string;
  service: string;
  staff: string;
  time: string;
  duration: number;
  price: number;
  day: number;
  status: "Confirmed" | "Arrived" | "Completed";
  tone: string;
  visits: number;
};

export const appointments: Appointment[] = [
  {
    id: "1",
    name: "Ana Petrova",
    service: "Cut & blow-dry",
    staff: "Elena",
    time: "10:00",
    duration: 45,
    price: 150000,
    day: 22,
    status: "Completed",
    tone: "peach",
    visits: 8,
  },
  {
    id: "2",
    name: "Mila Stojanova",
    service: "Gel manicure",
    staff: "Sara",
    time: "10:30",
    duration: 60,
    price: 120000,
    day: 22,
    status: "Completed",
    tone: "lilac",
    visits: 3,
  },
  {
    id: "3",
    name: "Sofija Nikolova",
    service: "Balayage & finish",
    staff: "Elena",
    time: "11:30",
    duration: 90,
    price: 380000,
    day: 22,
    status: "Arrived",
    tone: "sage",
    visits: 6,
  },
  {
    id: "4",
    name: "Jana Ilieva",
    service: "Brow shape & tint",
    staff: "Marija",
    time: "12:00",
    duration: 30,
    price: 80000,
    day: 22,
    status: "Confirmed",
    tone: "blue",
    visits: 2,
  },
  {
    id: "5",
    name: "Iva Trajkovska",
    service: "Gel manicure",
    staff: "Sara",
    time: "13:00",
    duration: 60,
    price: 120000,
    day: 22,
    status: "Confirmed",
    tone: "peach",
    visits: 12,
  },
  {
    id: "6",
    name: "Teodora Andova",
    service: "Lash lift",
    staff: "Marija",
    time: "14:30",
    duration: 60,
    price: 160000,
    day: 22,
    status: "Confirmed",
    tone: "lilac",
    visits: 1,
  },
  {
    id: "7",
    name: "Lena Kostova",
    service: "Cut & blow-dry",
    staff: "Elena",
    time: "10:00",
    duration: 45,
    price: 150000,
    day: 23,
    status: "Confirmed",
    tone: "sage",
    visits: 4,
  },
  {
    id: "8",
    name: "Nina Ristova",
    service: "Gel manicure",
    staff: "Sara",
    time: "11:00",
    duration: 60,
    price: 120000,
    day: 23,
    status: "Confirmed",
    tone: "peach",
    visits: 5,
  },
  {
    id: "9",
    name: "Eva Markova",
    service: "Brow shape & tint",
    staff: "Marija",
    time: "12:00",
    duration: 30,
    price: 80000,
    day: 24,
    status: "Confirmed",
    tone: "blue",
    visits: 2,
  },
  {
    id: "10",
    name: "Lara Mitreva",
    service: "Lash lift",
    staff: "Marija",
    time: "10:30",
    duration: 60,
    price: 160000,
    day: 25,
    status: "Confirmed",
    tone: "lilac",
    visits: 7,
  },
  {
    id: "11",
    name: "Martina Spaseva",
    service: "Balayage & finish",
    staff: "Elena",
    time: "12:00",
    duration: 90,
    price: 380000,
    day: 26,
    status: "Confirmed",
    tone: "sage",
    visits: 3,
  },
];

export const staff = [
  {
    name: "Elena",
    role: "Hair stylist",
    initials: "EP",
    tone: "peach",
    load: 88,
    count: 7,
  },
  {
    name: "Sara",
    role: "Nail artist",
    initials: "SM",
    tone: "lilac",
    load: 75,
    count: 6,
  },
  {
    name: "Marija",
    role: "Lash & brow artist",
    initials: "MN",
    tone: "sage",
    load: 63,
    count: 5,
  },
];

export const services = [
  {
    name: "Cut & blow-dry",
    count: 32,
    share: 36,
    duration: 45,
    price: 150000,
    staff: "Elena",
    tone: "blue",
  },
  {
    name: "Gel manicure",
    count: 26,
    share: 29,
    duration: 60,
    price: 120000,
    staff: "Sara",
    tone: "lilac",
  },
  {
    name: "Balayage & finish",
    count: 18,
    share: 20,
    duration: 90,
    price: 380000,
    staff: "Elena",
    tone: "peach",
  },
  {
    name: "Brow shape & tint",
    count: 13,
    share: 15,
    duration: 30,
    price: 80000,
    staff: "Marija",
    tone: "sage",
  },
  {
    name: "Lash lift",
    count: 10,
    share: 11,
    duration: 60,
    price: 160000,
    staff: "Marija",
    tone: "lilac",
  },
];

export const openings = [
  { time: "13:30", duration: 45, staff: "Elena", service: "Cut & blow-dry" },
  { time: "15:00", duration: 60, staff: "Sara", service: "Gel manicure" },
];

export function money(minor: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    minor / 100,
  );
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
