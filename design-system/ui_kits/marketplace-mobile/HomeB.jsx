// HomeB.jsx — Variation B: "Structured" — dark card surface, feed layout
function HomeScreenB({ onSearch, onBiz }) {
  const [q, setQ] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const submit = () => { if (q.trim()) onSearch(q); };

  const featured = BUSINESSES.filter(b => b.isOpen).slice(0, 3);

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-0)', overflowY:'auto', paddingBottom:100 }}>
      {/* top header */}
      <div style={{ padding:'56px 20px 20px', background:'var(--bg-0)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <div style={{ fontFamily:'var(--font-body)', fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--accent)', marginBottom:4 }}>Good evening</div>
            <div style={{ fontFamily:'var(--font-body)', fontSize:22, fontWeight:700, color:'var(--fg-1)', letterSpacing:'-0.02em' }}>Where to tonight?</div>
          </div>
          <div style={{ fontFamily:'var(--font-logo)', fontSize:15, letterSpacing:'0.08em', color:'var(--fg-1)' }}>OPUS</div>
        </div>

        {/* AI search bar */}
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.05)', border:`1px solid ${focused?'rgba(206,93,69,0.45)':'rgba(255,255,255,0.10)'}`, borderRadius:16, padding:'13px 14px', boxShadow: focused?'0 0 0 3px rgba(206,93,69,0.12)':'none', transition:'all .2s' }}>
            <Icon n='spark' size={18} color='var(--accent-soft)' />
            <input value={q} onChange={e => setQ(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={e => e.key==='Enter' && submit()}
              placeholder="Try 'date night' or 'haircut now'…"
              style={{ flex:1, background:'transparent', border:0, outline:'none', fontFamily:'var(--font-body)', fontSize:15, color:'var(--fg-1)', caretColor:'var(--accent)' }} />
            {q && <button onClick={submit} style={{ width:34, height:34, borderRadius:10, background:'var(--accent)', border:0, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, boxShadow:'0 2px 8px rgba(206,93,69,0.5)' }}>
              <Icon n='send' size={15} color='#fff' />
            </button>}
          </div>
        </div>

        {/* chips */}
        <div style={{ display:'flex', gap:7, marginTop:12, overflowX:'auto', paddingBottom:4 }}>
          {SUGGESTIONS.map(s => (
            <button key={s.label} onClick={() => { setQ(s.query); onSearch(s.query); }}
              style={{ flexShrink:0, fontFamily:'var(--font-body)', fontSize:12, fontWeight:500, background:'rgba(255,255,255,0.06)', color:'var(--fg-2)', border:'1px solid rgba(255,255,255,0.09)', padding:'7px 13px', borderRadius:9999, cursor:'pointer', whiteSpace:'nowrap' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* featured cards — horizontal scroll */}
      <div style={{ padding:'0 0 0 20px', marginBottom:28 }}>
        <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--fg-3)', marginBottom:14, paddingRight:20 }}>Available tonight</div>
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingRight:20, paddingBottom:4 }}>
          {featured.map(b => (
            <div key={b.id} onClick={() => onBiz(b)}
              style={{ flexShrink:0, width:180, borderRadius:16, overflow:'hidden', background:b.cover, position:'relative', height:220, cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
              <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(8px)', borderRadius:9999, padding:'3px 9px', display:'flex', alignItems:'center', gap:4 }}>
                <Icon n='star' size={10} color='#e3b34a' />
                <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#faf9f7' }}>{b.rating}</span>
              </div>
              {b.isOpen && <div style={{ position:'absolute', top:10, left:10, width:7, height:7, borderRadius:9999, background:'#3ecf5b', boxShadow:'0 0 6px #3ecf5b' }} />}
              <div style={{ position:'absolute', left:12, bottom:12, right:12 }}>
                <div style={{ fontFamily:'var(--font-body)', fontSize:15, fontWeight:700, color:'#fff', letterSpacing:'-0.005em' }}>{b.name}</div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:2 }}>{b.category} · {b.area}</div>
                <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:6 }}>{b.price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* near you list */}
      <div style={{ padding:'0 20px' }}>
        <div style={{ fontFamily:'var(--font-body)', fontSize:10, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--fg-3)', marginBottom:14 }}>Near you</div>
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, overflow:'hidden' }}>
          {BUSINESSES.slice(0,3).map((b, i) => <BizRow key={b.id} b={b} onPress={onBiz} aiMatch={i===0} />)}
        </div>
      </div>
    </div>
  );
}
window.HomeScreenB = HomeScreenB;
