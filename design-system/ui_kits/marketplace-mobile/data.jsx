// shared mock data & helpers
const BUSINESSES = [
  { id:'studio-nord', name:'Studio Nord',    category:'Barbershop',  area:'Centar',       rating:4.9, isOpen:true,  mins:8,  price:'From €15', tags:['Walk-ins','Beard'], cover:'linear-gradient(135deg,#2a1712 0%,#5c2a1a 55%,#ce5d45 100%)' },
  { id:'aroma',       name:'Aroma Wellness', category:'Spa',         area:'Debar Maalo',  rating:4.8, isOpen:true,  mins:12, price:'From €35', tags:['Couples','Massage'], cover:'linear-gradient(135deg,#1f2a24 0%,#2d4a3a 60%,#6fcf97 100%)' },
  { id:'mila',        name:'Mila Hair',      category:'Hair Salon',  area:'Karpoš',       rating:4.7, isOpen:false, mins:22, price:'From €20', tags:['Balayage','Keratin'], cover:'linear-gradient(135deg,#2a1a24 0%,#5c2a3f 50%,#d35a8c 100%)' },
  { id:'lux-spa',     name:'Lux Day Spa',    category:'Spa',         area:'Taftalidze',   rating:5.0, isOpen:true,  mins:5,  price:'From €45', tags:['Couples','Sauna','Wine'], cover:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#6c8cd5 100%)' },
  { id:'kruna',       name:'Kruna Barbers',  category:'Barbershop',  area:'Čair',         rating:4.6, isOpen:true,  mins:3,  price:'From €12', tags:['Shave','Hot towel'], cover:'linear-gradient(135deg,#2a2015 0%,#5c4626 55%,#d99040 100%)' },
  { id:'north-nails', name:'North Nails',    category:'Nail Studio', area:'Aerodrom',     rating:4.9, isOpen:true,  mins:14, price:'From €18', tags:['Gel','Nail art'], cover:'linear-gradient(135deg,#242018 0%,#4a3f26 60%,#e3b34a 100%)' },
];

const SERVICES = [
  { name:"Classic Massage", duration:60, price:45, desc:"Full-body relaxation" },
  { name:"Couples Massage", duration:90, price:80, desc:"Side-by-side with your partner" },
  { name:"Hot Stone",       duration:75, price:65, desc:"Deep tissue + heated stones" },
  { name:"Aromatherapy",    duration:60, price:50, desc:"Essential oils & relaxation" },
];

const SLOTS = {
  today:   ['17:00','17:30','18:00','19:00','19:30','20:00','20:30'],
  tomorrow:['10:00','10:30','11:00','14:00','15:30','16:00'],
};

const BOOKINGS_UPCOMING = [
  { id:1, biz:'Aroma Wellness',  service:'Couples Massage', date:'Today',    time:'19:00', status:'confirmed' },
  { id:2, biz:'Studio Nord',     service:"Men's haircut",   date:'Fri 26',   time:'11:30', status:'confirmed' },
];
const BOOKINGS_PAST = [
  { id:3, biz:'Mila Hair',       service:'Balayage',        date:'Apr 20',   time:'14:00', status:'completed' },
  { id:4, biz:'Aroma Wellness',  service:'Hot Stone',       date:'Apr 12',   time:'16:30', status:'completed' },
];

const SUGGESTIONS = [
  { label:'Date night 🌙',      query:'date night with my girlfriend today' },
  { label:'Quick haircut 💈',   query:'haircut available now' },
  { label:'Relaxing spa 🧖',   query:'couples spa this evening' },
  { label:'Birthday treat 🎂',  query:'birthday pampering today' },
  { label:'Sunday reset 🌿',    query:'Sunday morning wellness' },
];

Object.assign(window, { BUSINESSES, SERVICES, SLOTS, BOOKINGS_UPCOMING, BOOKINGS_PAST, SUGGESTIONS });
