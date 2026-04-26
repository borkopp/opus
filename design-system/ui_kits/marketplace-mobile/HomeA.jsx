// HomeA.jsx — Variation A: "Ambient" — cinematic full-bleed, bottom search
function HomeScreenA({ onSearch }) {
  const [q, setQ] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef(null);

  const submit = () => { if (q.trim()) onSearch(q); };

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
      {/* full-bleed bg */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('../../assets/abstract-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.9 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 50%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.97) 100%)' }} />

      {/* top status area */}
      <div style={{ position: 'relative', zIndex: 2, padding: '56px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-logo)', fontSize: 16, letterSpacing: '0.08em', color: 'rgba(250,249,247,0.9)' }}>OPUS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 9999, padding: '5px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#3ecf5b', boxShadow: '0 0 8px #3ecf5b' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(250,249,247,0.85)' }}>Skopje</span>
        </div>
      </div>

      {/* hero text */}
      <div style={{ position: 'relative', zIndex: 2, padding: '0 24px', marginTop: 80 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(244,160,122,0.9)', marginBottom: 12 }}>Friday evening</div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 36, lineHeight: 1.1, color: '#fff', letterSpacing: '-0.025em', textWrap: 'balance' }}>
          Where do you want to{' '}
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--accent)' }}>go tonight?</span>
        </div>
      </div>

      {/* bottom search area */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 16px 108px' }}>
        {/* suggestion chips */}
        {!focused && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {SUGGESTIONS.slice(0, 4).map(s => (
              <button key={s.label} onClick={() => { setQ(s.query); onSearch(s.query); }}
                style={{ flexShrink: 0, fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)', color: 'rgba(250,249,247,0.9)', border: '1px solid rgba(255,255,255,0.16)', padding: '7px 13px', borderRadius: 9999, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* main input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(20,20,18,0.85)', backdropFilter: 'blur(20px)', border: `1px solid ${focused ? 'rgba(206,93,69,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 18, padding: '12px 12px 12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', transition: 'border-color .2s' }}>
          <Icon n='spark' size={18} color='var(--accent-soft)' />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Ask anything — 'date night tonight'…"
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', fontFamily: 'var(--font-body)', fontSize: 15, color: '#fff', caretColor: 'var(--accent)' }} />
          <button onClick={submit}
            style={{ width: 38, height: 38, borderRadius: 12, background: q.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.08)', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: q.trim() ? 'pointer' : 'default', transition: 'background .2s', flexShrink: 0, boxShadow: q.trim() ? '0 2px 8px rgba(206,93,69,0.5)' : 'none' }}>
            <Icon n='send' size={16} color={q.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
          </button>
        </div>
      </div>
    </div>
  );
}
window.HomeScreenA = HomeScreenA;
