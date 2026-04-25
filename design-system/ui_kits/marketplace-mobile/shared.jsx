// shared.jsx — shared components (nav, cards, screens) for both variations
const { useState, useRef, useEffect } = React;

// ── Micro Icons ──────────────────────────────────────────────────────────────
function Icon({ n, size=20, color='currentColor', stroke=1.7 }) {
  const p = { width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:color, strokeWidth:stroke, strokeLinecap:'round', strokeLinejoin:'round' };
  const icons = {
    home:    <svg {...p}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>,
    compass: <svg {...p}><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>,
    calendar:<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>,
    star:    <svg {...p} fill={color}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>,
    map:     <svg {...p}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    clock:   <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    arrow:   <svg {...p}><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
    back:    <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
    search:  <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
    mic:     <svg {...p}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
    send:    <svg {...p}><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>,
    check:   <svg {...p}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
    x:       <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
    spark:   <svg {...p} fill={color}><path d="M12 3l1.8 5.4 5.4 1.8-5.4 1.8L12 17.4l-1.8-5.4L4.8 10.2l5.4-1.8z"/></svg>,
    chev:    <svg {...p}><path d="m9 18 6-6-6-6"/></svg>,
  };
  return icons[n] || null;
}

// ── Floating pill nav ────────────────────────────────────────────────────────
function FloatNav({ tab, setTab }) {
  const tabs = [
    { id:'home',     icon:'home',     label:'Home' },
    { id:'explore',  icon:'compass',  label:'Explore' },
    { id:'bookings', icon:'calendar', label:'Bookings' },
  ];
  return (
    <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:60, display:'flex', alignItems:'center', gap:4, background:'rgba(30,30,28,0.92)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:9999, padding:'6px 8px', boxShadow:'0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)' }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display:'flex', alignItems:'center', gap: active ? 6 : 0, padding: active ? '8px 16px' : '8px 12px', borderRadius:9999, border:0, background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'rgba(250,249,247,0.5)', cursor:'pointer', transition:'all .25s cubic-bezier(0.16,1,0.3,1)', boxShadow: active ? '0 2px 8px rgba(206,93,69,0.5)' : 'none', fontFamily:'var(--font-body)', fontSize:13, fontWeight:500, whiteSpace:'nowrap' }}>
            <Icon n={t.icon} size={18} color={active ? '#fff' : 'rgba(250,249,247,0.5)'} />
            {active && <span>{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Business row card ────────────────────────────────────────────────────────
function BizRow({ b, onPress, aiMatch }) {
  return (
    <div onClick={() => onPress(b)} style={{ display:'flex', gap:12, padding:'12px 16px', cursor:'pointer', transition:'background .15s', borderBottom:'1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <div style={{ width:52, height:52, borderRadius:14, background:b.cover, flexShrink:0, position:'relative' }}>
        {b.isOpen && <span style={{ position:'absolute', bottom:-2, right:-2, width:12, height:12, borderRadius:9999, background:'#3ecf5b', border:'2px solid #0d0d0d' }} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ fontFamily:'var(--font-body)', fontSize:15, fontWeight:600, color:'var(--fg-1)' }}>{b.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:3, fontFamily:'var(--font-mono)', fontSize:12, color:'#e3b34a', flexShrink:0 }}>
            <Icon n='star' size={11} color='#e3b34a' />
            {b.rating}
          </div>
        </div>
        <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--fg-3)', marginTop:2 }}>{b.category} · {b.area} · {b.mins} min away</div>
        <div style={{ display:'flex', gap:6, marginTop:7, flexWrap:'wrap' }}>
          {aiMatch && <span style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:600, letterSpacing:'0.06em', color:'var(--accent-soft)', background:'rgba(206,93,69,0.12)', border:'1px solid rgba(206,93,69,0.25)', padding:'2px 7px', borderRadius:9999 }}>✦ AI pick</span>}
          <span style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:500, color:'var(--fg-2)', background:'rgba(255,255,255,0.07)', padding:'2px 7px', borderRadius:9999 }}>{b.price}</span>
          {b.isOpen && <span style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:500, color:'#6fcf97', background:'rgba(78,169,122,0.12)', padding:'2px 7px', borderRadius:9999 }}>Open now</span>}
        </div>
      </div>
      <div style={{ alignSelf:'center', color:'rgba(250,249,247,0.2)' }}>
        <Icon n='chev' size={16} color='rgba(250,249,247,0.3)' />
      </div>
    </div>
  );
}

// ── Results screen ───────────────────────────────────────────────────────────
function ResultsScreen({ query, onBiz, onBack }) {
  const results = BUSINESSES.filter(b => b.isOpen).slice(0, 4);
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-1)', overflow:'hidden' }}>
      <div style={{ padding:'16px 16px 0', background:'var(--bg-1)' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:0, color:'var(--fg-2)', fontFamily:'var(--font-body)', fontSize:13, cursor:'pointer', padding:'4px 0', marginBottom:14 }}>
          <Icon n='back' size={16} color='var(--fg-2)' /> Back
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:14, padding:'10px 14px', marginBottom:12 }}>
          <Icon n='search' size={15} color='var(--fg-3)' />
          <span style={{ fontFamily:'var(--font-body)', fontSize:14, color:'var(--fg-2)', flex:1 }}>{query}</span>
          <button style={{ background:'transparent', border:0, cursor:'pointer', color:'var(--fg-3)', display:'flex' }} onClick={onBack}><Icon n='x' size={14} color='var(--fg-3)' /></button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(206,93,69,0.10)', border:'1px solid rgba(206,93,69,0.25)', borderRadius:9999, padding:'5px 10px' }}>
            <Icon n='spark' size={12} color='var(--accent-soft)' />
            <span style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--accent-soft)' }}>4 available tonight</span>
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-3)' }}>sorted by availability</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', paddingBottom:100 }}>
        {results.map((b, i) => <BizRow key={b.id} b={b} onPress={onBiz} aiMatch={i < 2} />)}
      </div>
    </div>
  );
}

// ── Profile screen ───────────────────────────────────────────────────────────
function ProfileScreen({ biz, onBook, onBack }) {
  const b = biz || BUSINESSES[1];
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-1)', overflowY:'auto', paddingBottom:100, position:'relative' }}>
      <div style={{ height:180, background:b.cover, position:'relative', flexShrink:0 }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0.2) 0%,rgba(13,13,13,0.95) 100%)' }} />
        <button onClick={onBack} style={{ position:'absolute', top:16, left:16, width:34, height:34, borderRadius:9999, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Icon n='back' size={16} color='#fff' />
        </button>
      </div>
      <div style={{ padding:'0 16px 24px', marginTop:-32, position:'relative', zIndex:2 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:8 }}>
          <div>
            <div style={{ fontFamily:'var(--font-body)', fontSize:22, fontWeight:700, color:'var(--fg-1)', letterSpacing:'-0.01em' }}>{b.name}</div>
            <div style={{ fontFamily:'var(--font-body)', fontSize:13, color:'var(--fg-3)', marginTop:2 }}>{b.category} · {b.area}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'var(--font-mono)', fontSize:14, color:'#e3b34a', fontWeight:600 }}>
              <Icon n='star' size={13} color='#e3b34a' /> {b.rating}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:7, height:7, borderRadius:9999, background:'#3ecf5b' }} />
              <span style={{ fontFamily:'var(--font-body)', fontSize:12, color:'#6fcf97' }}>Open · {b.mins} min away</span>
            </div>
          </div>
        </div>

        <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--fg-3)', marginBottom:12 }}>Services</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
          {SERVICES.map(s => (
            <div key={s.name} onClick={onBook} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px', cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(206,93,69,0.35)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
              <div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, color:'var(--fg-1)' }}>{s.name}</div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--fg-3)', marginTop:2 }}>{s.desc} · {s.duration} min</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ fontFamily:'var(--font-body)', fontSize:15, fontWeight:700, color:'var(--fg-1)' }}>€{s.price}</div>
                <Icon n='chev' size={16} color='rgba(250,249,247,0.25)' />
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--fg-3)', marginBottom:12 }}>Location</div>
        <div style={{ height:80, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'var(--fg-3)' }}>
          <Icon n='map' size={16} color='var(--fg-3)' />
          <span style={{ fontFamily:'var(--font-body)', fontSize:13 }}>{b.area} · Skopje</span>
        </div>
      </div>

      <div style={{ position:'sticky', bottom:88, margin:'0 16px', zIndex:10 }}>
        <button onClick={onBook} style={{ width:'100%', fontFamily:'var(--font-body)', fontSize:16, fontWeight:700, background:'var(--accent)', color:'#fff', border:0, borderRadius:9999, padding:'16px 24px', cursor:'pointer', boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(206,93,69,0.5), 0 12px 32px rgba(0,0,0,0.4)', letterSpacing:'0.01em' }}>
          Book now
        </button>
      </div>
    </div>
  );
}

// ── Booking sheet ────────────────────────────────────────────────────────────
function BookingSheet({ biz, onDone, onClose }) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [day, setDay] = useState('today');
  const [time, setTime] = useState(null);
  const b = biz || BUSINESSES[1];
  const slots = day === 'today' ? SLOTS.today : SLOTS.tomorrow;

  return (
    <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-2)', borderTopLeftRadius:24, borderTopRightRadius:24, border:'1px solid rgba(255,255,255,0.10)', borderBottom:0, maxHeight:'80%', display:'flex', flexDirection:'column', boxShadow:'0 -20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ padding:'12px 20px 0', flexShrink:0 }}>
          <div style={{ width:36, height:4, background:'rgba(255,255,255,0.15)', borderRadius:9999, margin:'0 auto 16px' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent-soft)', letterSpacing:'0.12em', textTransform:'uppercase' }}>Step {step} / 3</div>
              <div style={{ fontFamily:'var(--font-body)', fontSize:20, fontWeight:700, color:'var(--fg-1)', marginTop:4, letterSpacing:'-0.01em' }}>
                {step===1?'Choose service':step===2?'Pick a time':'Confirm booking'}
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:9999, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon n='x' size={14} color='var(--fg-2)' />
            </button>
          </div>
        </div>

        <div style={{ overflowY:'auto', padding:'0 20px', flex:1 }}>
          {step===1 && <div style={{ display:'flex', flexDirection:'column', gap:8, paddingBottom:8 }}>
            {SERVICES.map(s => (
              <div key={s.name} onClick={() => setService(s.name)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderRadius:14, border:`1px solid ${service===s.name?'var(--accent)':'rgba(255,255,255,0.08)'}`, background: service===s.name?'rgba(206,93,69,0.10)':'rgba(255,255,255,0.04)', cursor:'pointer', transition:'all .2s' }}>
                <div>
                  <div style={{ fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, color:'var(--fg-1)' }}>{s.name}</div>
                  <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--fg-3)', marginTop:2 }}>{s.duration} min · {s.desc}</div>
                </div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:15, fontWeight:700, color: service===s.name?'var(--accent)':'var(--fg-1)' }}>€{s.price}</div>
              </div>
            ))}
          </div>}

          {step===2 && <div style={{ paddingBottom:8 }}>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              {['today','tomorrow'].map(d => (
                <button key={d} onClick={() => { setDay(d); setTime(null); }} style={{ flex:1, padding:'10px', borderRadius:12, border:`1px solid ${day===d?'var(--accent)':'rgba(255,255,255,0.10)'}`, background: day===d?'rgba(206,93,69,0.12)':'rgba(255,255,255,0.04)', color:'var(--fg-1)', fontFamily:'var(--font-body)', fontSize:13, fontWeight: day===d?600:400, cursor:'pointer' }}>
                  {d==='today'?'Today — Apr 25':'Tomorrow — Apr 26'}
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {slots.map(t => (
                <button key={t} onClick={() => setTime(t)} style={{ padding:'12px 0', borderRadius:12, border:`1px solid ${time===t?'var(--accent)':'rgba(255,255,255,0.08)'}`, background: time===t?'var(--accent)':'rgba(255,255,255,0.04)', color: time===t?'#fff':'var(--fg-1)', fontFamily:'var(--font-mono)', fontSize:14, fontWeight: time===t?600:400, cursor:'pointer', transition:'all .2s' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>}

          {step===3 && <div style={{ paddingBottom:8 }}>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, overflow:'hidden', marginBottom:16 }}>
              {[['Business',b.name],['Service',service],['Date', day==='today'?'Today, Apr 25':'Tomorrow, Apr 26'],['Time',time||'—'],['Price',SERVICES.find(s=>s.name===service)?.price?`€${SERVICES.find(s=>s.name===service).price}`:'—']].map(([k,v],i) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', borderTop: i?'1px solid rgba(255,255,255,0.07)':'0' }}>
                  <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--fg-3)' }}>{k}</div>
                  <div style={{ fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, color:'var(--fg-1)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', background:'rgba(78,169,122,0.08)', border:'1px solid rgba(78,169,122,0.22)', borderRadius:12, padding:'12px 14px' }}>
              <Icon n='check' size={16} color='#6fcf97' />
              <span style={{ fontFamily:'var(--font-body)', fontSize:12, color:'#8fd2a9' }}>No payment needed now. Business confirms in minutes.</span>
            </div>
          </div>}
        </div>

        <div style={{ padding:'16px 20px 24px', flexShrink:0, display:'flex', gap:8 }}>
          {step>1 && <button onClick={() => setStep(step-1)} style={{ flex:1, padding:'14px', borderRadius:9999, background:'rgba(255,255,255,0.07)', color:'var(--fg-1)', border:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-body)', fontSize:15, fontWeight:500, cursor:'pointer' }}>Back</button>}
          <button onClick={() => step<3 ? setStep(step+1) : onDone()} disabled={step===1?!service:step===2?!time:false}
            style={{ flex:step>1?2:1, padding:'14px', borderRadius:9999, background: (step===1&&!service)||(step===2&&!time)?'rgba(255,255,255,0.07)':'var(--accent)', color: (step===1&&!service)||(step===2&&!time)?'var(--fg-3)':'#fff', border:0, fontFamily:'var(--font-body)', fontSize:15, fontWeight:700, cursor: (step===1&&!service)||(step===2&&!time)?'not-allowed':'pointer', boxShadow: (step===1&&!service)||(step===2&&!time)?'none':'0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(206,93,69,0.5)', transition:'all .25s' }}>
            {step<3?'Continue →':'Confirm booking ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── My Bookings screen ────────────────────────────────────────────────────────
function BookingsScreen() {
  const [tab, setTabInner] = useState('upcoming');
  const items = tab==='upcoming' ? BOOKINGS_UPCOMING : BOOKINGS_PAST;
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-1)', paddingBottom:100 }}>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--accent)', marginBottom:6 }}>Your appointments</div>
        <div style={{ fontFamily:'var(--font-body)', fontSize:24, fontWeight:700, color:'var(--fg-1)', letterSpacing:'-0.01em', marginBottom:20 }}>Bookings</div>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', borderRadius:12, padding:4, marginBottom:24 }}>
          {['upcoming','past'].map(t => (
            <button key={t} onClick={() => setTabInner(t)} style={{ flex:1, padding:'8px', borderRadius:9, border:0, background: tab===t?'rgba(255,255,255,0.10)':'transparent', color: tab===t?'var(--fg-1)':'var(--fg-3)', fontFamily:'var(--font-body)', fontSize:13, fontWeight: tab===t?600:400, cursor:'pointer', textTransform:'capitalize', transition:'all .2s' }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, padding:'0 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {items.map(bk => (
          <div key={bk.id} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ height:5, background: bk.status==='confirmed'?'var(--accent)':'rgba(255,255,255,0.10)' }} />
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontFamily:'var(--font-body)', fontSize:16, fontWeight:700, color:'var(--fg-1)' }}>{bk.biz}</div>
                <span style={{ fontFamily:'var(--font-body)', fontSize:11, fontWeight:500, padding:'3px 8px', borderRadius:9999, background: bk.status==='confirmed'?'rgba(206,93,69,0.12)':'rgba(255,255,255,0.07)', color: bk.status==='confirmed'?'var(--accent-soft)':'var(--fg-3)', border:`1px solid ${bk.status==='confirmed'?'rgba(206,93,69,0.25)':'rgba(255,255,255,0.08)'}` }}>{bk.status}</span>
              </div>
              <div style={{ fontFamily:'var(--font-body)', fontSize:13, color:'var(--fg-2)', marginTop:3 }}>{bk.service}</div>
              <div style={{ display:'flex', gap:12, marginTop:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--font-body)', fontSize:12, color:'var(--fg-3)' }}>
                  <Icon n='calendar' size={13} color='var(--fg-3)' /> {bk.date}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--font-body)', fontSize:12, color:'var(--fg-3)' }}>
                  <Icon n='clock' size={13} color='var(--fg-3)' /> {bk.time}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Confirmed screen ──────────────────────────────────────────────────────────
function ConfirmedScreen({ onHome }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, background:'var(--bg-1)', textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:9999, background:'rgba(78,169,122,0.15)', border:'1px solid rgba(78,169,122,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
        <Icon n='check' size={36} color='#6fcf97' />
      </div>
      <div style={{ fontFamily:'var(--font-body)', fontSize:24, fontWeight:700, color:'var(--fg-1)', letterSpacing:'-0.01em', marginBottom:8 }}>Booking confirmed!</div>
      <div style={{ fontFamily:'var(--font-body)', fontSize:14, color:'var(--fg-3)', lineHeight:1.6, maxWidth:240, marginBottom:32 }}>We've sent the details to your phone. The business will confirm shortly.</div>
      <button onClick={onHome} style={{ fontFamily:'var(--font-body)', fontSize:15, fontWeight:600, background:'var(--accent)', color:'#fff', border:0, borderRadius:9999, padding:'14px 32px', cursor:'pointer', boxShadow:'0 4px 12px rgba(206,93,69,0.5)' }}>Back to Home</button>
    </div>
  );
}

Object.assign(window, { Icon, FloatNav, BizRow, ResultsScreen, ProfileScreen, BookingSheet, BookingsScreen, ConfirmedScreen });
