// Sidebar.jsx — dashboard left nav
function Sidebar({ active, onChange }) {
  const sections = [
    { heading:'Workspace', items:[
      { id:'home',      label:'Home',        icon:'home' },
      { id:'bookings',  label:'Bookings',    icon:'calendar', count:12 },
      { id:'inbox',     label:'Inbox',       icon:'message',  count:3 },
    ]},
    { heading:'Manage', items:[
      { id:'staff',     label:'Staff',       icon:'users' },
      { id:'services',  label:'Services',    icon:'list' },
      { id:'clients',   label:'Clients',     icon:'book' },
    ]},
    { heading:'Business', items:[
      { id:'finance',   label:'Finance',     icon:'card' },
      { id:'analytics', label:'Analytics',   icon:'chart' },
      { id:'settings',  label:'Settings',    icon:'cog' },
    ]},
  ];

  function Icon({name}) {
    const p = { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.7, strokeLinecap:'round', strokeLinejoin:'round' };
    if (name==='home')     return <svg {...p}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>;
    if (name==='calendar') return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>;
    if (name==='message')  return <svg {...p}><path d="M21 15a4 4 0 01-4 4H7l-4 3V6a4 4 0 014-4h10a4 4 0 014 4z"/></svg>;
    if (name==='users')    return <svg {...p}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M17 11a4 4 0 000-8"/></svg>;
    if (name==='list')     return <svg {...p}><path d="M3 7h18M3 12h18M3 17h12"/></svg>;
    if (name==='book')     return <svg {...p}><path d="M4 4a2 2 0 012-2h12v20H6a2 2 0 01-2-2zM4 20a2 2 0 012-2h12"/></svg>;
    if (name==='card')     return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h4"/></svg>;
    if (name==='chart')    return <svg {...p}><path d="M3 20h18M6 16V9M11 16V6M16 16v-4M21 16v-8"/></svg>;
    if (name==='cog')      return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    return null;
  }
  return (
    <aside style={{
      width:240,minHeight:'100vh',flexShrink:0,
      background:'var(--bg-1)',borderRight:'1px solid var(--border)',
      padding:'20px 14px',display:'flex',flexDirection:'column',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 10px 20px'}}>
        <div style={{width:32,height:32,borderRadius:10,background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 3px 6px rgba(206,93,69,0.4)'}}>
          <span style={{fontFamily:'var(--font-logo)',fontSize:13,color:'#fff'}}>O</span>
        </div>
        <div>
          <div style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:500,color:'var(--fg-1)'}}>Studio Nord</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-3)'}}>Barbershop · Skopje</div>
        </div>
      </div>

      {sections.map(sec=>(
        <div key={sec.heading} style={{marginTop:8,marginBottom:8}}>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)',padding:'10px 12px 6px'}}>{sec.heading}</div>
          {sec.items.map(it=>(
            <button key={it.id} onClick={()=>onChange?.(it.id)}
              style={{
                width:'100%',display:'flex',alignItems:'center',gap:10,
                padding:'8px 12px',borderRadius:10,cursor:'pointer',
                background: active===it.id ? 'var(--bg-4)' : 'transparent',
                color:    active===it.id ? 'var(--fg-1)'  : 'var(--fg-2)',
                border:0,textAlign:'left',
                fontFamily:'var(--font-body)',fontSize:13,fontWeight: active===it.id ? 500 : 400,
                transition:'background .15s',
              }}
              onMouseEnter={e=>{if(active!==it.id) e.currentTarget.style.background='var(--bg-3)';}}
              onMouseLeave={e=>{if(active!==it.id) e.currentTarget.style.background='transparent';}}>
              <span style={{color: active===it.id ? 'var(--accent)' : 'var(--fg-3)', display:'flex'}}><Icon name={it.icon}/></span>
              {it.label}
              {it.count && <span style={{marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-2)',background:'var(--bg-5)',padding:'1px 7px',borderRadius:9999}}>{it.count}</span>}
            </button>
          ))}
        </div>
      ))}

      <div style={{marginTop:'auto',padding:'14px 12px 4px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:30,height:30,borderRadius:9999,background:'linear-gradient(135deg,#ce5d45,#e3b34a)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'var(--font-body)',fontSize:12,fontWeight:500}}>AM</div>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:'var(--font-body)',fontSize:12,color:'var(--fg-1)',fontWeight:500}}>Andrej M.</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>owner</div>
        </div>
      </div>
    </aside>
  );
}
window.Sidebar = Sidebar;
