// TopBar.jsx — dashboard top bar
function TopBar({ title, sub }) {
  return (
    <div style={{
      height:64,borderBottom:'1px solid var(--border)',
      background:'rgba(13,13,13,0.72)',backdropFilter:'blur(14px)',
      padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',
      position:'sticky',top:0,zIndex:30,
    }}>
      <div>
        <div style={{fontFamily:'var(--font-display)',fontSize:17,color:'var(--fg-1)',fontWeight:500,letterSpacing:'-0.01em'}}>{title}</div>
        {sub && <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-3)',marginTop:1}}>{sub}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{position:'relative'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a8680" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)'}}>
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input placeholder="Search…" style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:9999,padding:'7px 14px 7px 32px',color:'var(--fg-1)',fontFamily:'var(--font-body)',fontSize:12,outline:'none',width:220}}/>
          <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-3)',border:'1px solid var(--border)',borderRadius:4,padding:'1px 5px'}}>⌘K</span>
        </div>
        <button style={{width:32,height:32,borderRadius:9999,background:'var(--bg-3)',border:'1px solid var(--border)',color:'var(--fg-2)',cursor:'pointer',position:'relative'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:'block',margin:'auto'}}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
          <span style={{position:'absolute',top:4,right:4,width:6,height:6,background:'var(--accent)',borderRadius:9999,border:'2px solid var(--bg-1)'}}/>
        </button>
        <button style={{fontFamily:'var(--font-body)',fontSize:12,fontWeight:500,background:'var(--accent)',color:'#fff',border:0,borderRadius:9999,padding:'8px 16px',cursor:'pointer',boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 3px 5px rgba(206,93,69,0.4)'}}>
          + New booking
        </button>
      </div>
    </div>
  );
}
window.TopBar = TopBar;
