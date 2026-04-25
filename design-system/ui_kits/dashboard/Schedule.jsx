// Schedule.jsx — today's schedule list
function Schedule() {
  const items = [
    { time:'09:30', client:'Goran Petrov',    service:'Men\'s haircut',         staff:'Andrej',  duration:30, status:'done' },
    { time:'10:30', client:'Stefan Jovanov',  service:'Hair + beard combo',      staff:'Marko',   duration:45, status:'done' },
    { time:'11:30', client:'Dimitri K.',      service:'Beard trim',              staff:'Andrej',  duration:15, status:'now'  },
    { time:'14:00', client:'Nikola S.',       service:'Hot-towel shave',         staff:'Bojan',   duration:30, status:'up'   },
    { time:'15:00', client:'Martin A.',       service:'Men\'s haircut',          staff:'Marko',   duration:30, status:'up'   },
    { time:'16:30', client:'Aleksandar V.',   service:'Hair + beard combo',      staff:'Nikola',  duration:45, status:'up'   },
  ];
  const badge = {
    done: { bg:'rgba(78,169,122,0.12)', fg:'#8fd2a9', border:'rgba(78,169,122,0.3)', label:'Done' },
    now:  { bg:'rgba(206,93,69,0.18)',  fg:'#f4a07a', border:'rgba(206,93,69,0.4)',  label:'In session' },
    up:   { bg:'var(--bg-4)',           fg:'var(--fg-2)', border:'var(--border)',     label:'Upcoming' },
  };
  return (
    <div style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)'}}>Today</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:500,color:'var(--fg-1)',letterSpacing:'-0.01em',marginTop:2}}>Schedule · Thu, Apr 23</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button style={{fontFamily:'var(--font-body)',fontSize:12,background:'var(--bg-4)',color:'var(--fg-2)',border:'1px solid var(--border)',borderRadius:9999,padding:'6px 12px',cursor:'pointer'}}>Day</button>
          <button style={{fontFamily:'var(--font-body)',fontSize:12,background:'var(--fg-1)',color:'#141412',border:0,borderRadius:9999,padding:'6px 12px',cursor:'pointer',fontWeight:500}}>Week</button>
          <button style={{fontFamily:'var(--font-body)',fontSize:12,background:'var(--bg-4)',color:'var(--fg-2)',border:'1px solid var(--border)',borderRadius:9999,padding:'6px 12px',cursor:'pointer'}}>Month</button>
        </div>
      </div>
      <div>
        {items.map((it,i)=>{
          const s = badge[it.status];
          return (
            <div key={i} style={{display:'grid',gridTemplateColumns:'70px 1fr auto',gap:16,padding:'14px 20px',alignItems:'center',borderTop:i?'1px solid var(--border)':'0'}}>
              <div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:14,color:it.status==='now'?'var(--accent)':'var(--fg-1)',fontWeight:500}}>{it.time}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--fg-3)',marginTop:1}}>{it.duration} min</div>
              </div>
              <div>
                <div style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--fg-1)',fontWeight:500}}>{it.client}</div>
                <div style={{fontFamily:'var(--font-body)',fontSize:12,color:'var(--fg-3)',marginTop:1}}>{it.service} · {it.staff}</div>
              </div>
              <span style={{fontFamily:'var(--font-body)',fontSize:11,fontWeight:500,background:s.bg,color:s.fg,border:`1px solid ${s.border}`,padding:'3px 9px',borderRadius:9999}}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
window.Schedule = Schedule;
