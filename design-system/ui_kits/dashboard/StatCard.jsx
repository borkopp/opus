// StatCard.jsx — reusable dashboard KPI tile
function StatCard({ label, value, unit, delta, deltaLabel, glow }) {
  const positive = delta && delta.startsWith('+');
  const color = positive ? '#6fcf97' : (delta||'').startsWith('-') ? '#e8472a' : 'var(--fg-3)';
  return (
    <div style={{
      position:'relative',overflow:'hidden',
      background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,padding:18,
    }}>
      {glow && <div style={{position:'absolute',inset:0,background:'radial-gradient(circle at 85% 10%, rgba(206,93,69,0.22), transparent 60%)',pointerEvents:'none'}}/>}
      <div style={{position:'relative'}}>
        <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:glow?'var(--accent-soft)':'var(--fg-3)'}}>{label}</div>
        <div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:10}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:34,fontWeight:500,letterSpacing:'-0.02em',color:'var(--fg-1)',lineHeight:1}}>{value}</div>
          {unit && <div style={{fontFamily:'var(--font-body)',fontSize:12,color:'var(--fg-3)'}}>{unit}</div>}
        </div>
        {delta && <div style={{fontFamily:'var(--font-mono)',fontSize:11,color,marginTop:6}}>{delta} <span style={{color:'var(--fg-3)'}}>{deltaLabel}</span></div>}
      </div>
    </div>
  );
}
window.StatCard = StatCard;
