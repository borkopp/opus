// BusinessCard.jsx — marketplace tile
function BusinessCard({ b, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',
        cursor:'pointer',transition:'transform .25s var(--ease-out-quart), border-color .25s',
      }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--border-strong)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';}}>
      <div style={{
        height:160,position:'relative',
        background:b.cover || 'linear-gradient(135deg,#2a1712 0%,#5c2a1a 55%,#ce5d45 100%)',
      }}>
        <span style={{
          position:'absolute',top:12,left:12,
          fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',
          background:'rgba(0,0,0,0.55)',color:'var(--fg-1)',padding:'4px 9px',borderRadius:9999,backdropFilter:'blur(8px)',whiteSpace:'nowrap',
        }}>{b.category}</span>
        {b.isOpen && <span style={{
          position:'absolute',top:12,right:12,display:'flex',alignItems:'center',gap:5,
          fontFamily:'var(--font-body)',fontSize:11,fontWeight:500,
          background:'rgba(78,169,122,0.85)',color:'#042611',padding:'3px 9px',borderRadius:9999,
        }}>
          <span style={{width:6,height:6,borderRadius:9999,background:'#042611'}}/>Open
        </span>}
      </div>
      <div style={{padding:'14px 16px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
          <div style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:17,color:'var(--fg-1)',letterSpacing:'-0.01em'}}>{b.name}</div>
          <div style={{display:'flex',alignItems:'center',gap:4,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-2)',flexShrink:0}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#e3b34a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {b.rating}
          </div>
        </div>
        <div style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--fg-3)',marginTop:2}}>{b.area} · {b.city}</div>
        <div style={{display:'flex',gap:6,marginTop:12,flexWrap:'wrap'}}>
          {b.tags.map(t=><span key={t} style={{
            fontFamily:'var(--font-body)',fontSize:11,color:'var(--fg-2)',
            background:'var(--bg-4)',border:'1px solid var(--border)',
            padding:'3px 8px',borderRadius:9999,
          }}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}
window.BusinessCard = BusinessCard;
