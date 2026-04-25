// Inbox.jsx — AI-assisted inbox preview
function Inbox() {
  const msgs = [
    { who:'Goran P.',   preview:'Може ли да го поместам терминот...',     time:'2m',  ai:true,  unread:true },
    { who:'Ana S.',     preview:'Фала многу, ја сакам новата фризура!',   time:'14m', ai:false, unread:false },
    { who:'Stefan J.',  preview:'Утре во 10 е во ред?',                    time:'38m', ai:true,  unread:true },
    { who:'Dimitri K.', preview:'Колку чини боење на брада?',              time:'1h',  ai:true,  unread:false },
    { who:'Martin A.',  preview:'Откажувам за петок, благодарам.',         time:'3h',  ai:false, unread:false },
  ];
  return (
    <div style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)'}}>Inbox</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:500,color:'var(--fg-1)',letterSpacing:'-0.01em',marginTop:2}}>AI assistant</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(206,93,69,0.12)',border:'1px solid rgba(206,93,69,0.25)',borderRadius:9999,padding:'4px 10px'}}>
          <span style={{width:6,height:6,borderRadius:9999,background:'#3ecf5b',boxShadow:'0 0 8px #3ecf5b'}}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--accent-soft)'}}>active</span>
        </div>
      </div>
      <div>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderTop:i?'1px solid var(--border)':'0',cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-4)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div style={{width:32,height:32,borderRadius:9999,background:`linear-gradient(135deg, hsl(${20+i*35},50%,40%), hsl(${20+i*35},70%,60%))`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'var(--font-body)',fontSize:12,fontWeight:500}}>
              {m.who[0]}
            </div>
            <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                <span style={{fontFamily:'var(--font-body)',fontSize:13,fontWeight: m.unread?600:400,color:'var(--fg-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>{m.who}</span>
                {m.ai && <span style={{flexShrink:0,fontFamily:'var(--font-mono)',fontSize:9,color:'var(--accent-soft)',background:'rgba(206,93,69,0.12)',border:'1px solid rgba(206,93,69,0.25)',padding:'1px 6px',borderRadius:9999,whiteSpace:'nowrap'}}>AI handled</span>}
              </div>
              <div style={{fontFamily:'var(--font-body)',fontSize:12,color:'var(--fg-3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.preview}</div>
            </div>
            <div style={{flexShrink:0,fontFamily:'var(--font-mono)',fontSize:11,color: m.unread?'var(--accent)':'var(--fg-3)'}}>{m.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Inbox = Inbox;
