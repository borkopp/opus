// MarketplaceHeader.jsx — sticky header with search
function MarketplaceHeader({ onSearch }) {
  return (
    <header style={{
      position:'sticky',top:0,zIndex:40,
      background:'rgba(13,13,13,0.88)',backdropFilter:'blur(14px)',
      borderBottom:'1px solid var(--border)',
      padding:'14px 24px',
    }}>
      <div style={{maxWidth:1280,margin:'0 auto',display:'flex',alignItems:'center',gap:20}}>
        <a href="#" style={{fontFamily:'var(--font-logo)',fontSize:18,letterSpacing:'0.08em',color:'var(--fg-1)',textDecoration:'none'}}>OPUS</a>
        <div style={{flex:1,position:'relative',maxWidth:520}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}>
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input placeholder="Search businesses, services, or locations…" onChange={e=>onSearch?.(e.target.value)}
            style={{
              width:'100%',padding:'11px 14px 11px 40px',
              background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:9999,
              color:'var(--fg-1)',fontFamily:'var(--font-body)',fontSize:14,outline:'none',
            }}/>
        </div>
        <div style={{display:'flex',gap:4}}>
          <a href="#" style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--fg-2)',padding:'8px 12px',borderRadius:9999,textDecoration:'none'}}>For business</a>
          <button style={{fontFamily:'var(--font-body)',fontSize:13,fontWeight:500,background:'var(--fg-1)',color:'#141412',border:0,borderRadius:9999,padding:'8px 16px',cursor:'pointer'}}>Sign in</button>
        </div>
      </div>
    </header>
  );
}
window.MarketplaceHeader = MarketplaceHeader;
