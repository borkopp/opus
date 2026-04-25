// BookingFlow.jsx — bottom-sheet modal for picking time slot
const { useState } = React;

function BookingFlow({ business, onClose }) {
  const [step, setStep] = useState(1);
  const [service, setService] = useState('Men\'s haircut · €15');
  const [date, setDate]   = useState('Thu · Apr 23');
  const [time, setTime]   = useState(null);

  const days = [
    { label:'Thu', date:'Apr 23' },
    { label:'Fri', date:'Apr 24' },
    { label:'Sat', date:'Apr 25' },
    { label:'Mon', date:'Apr 27' },
    { label:'Tue', date:'Apr 28' },
  ];
  const slots = ['09:00','09:30','10:00','10:30','11:00','11:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];

  const canContinue = step===1 ? !!service : step===2 ? !!time : true;

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:60,
      background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',
      display:'flex',alignItems:'flex-end',justifyContent:'center',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%',maxWidth:560,background:'var(--bg-2)',
        borderTopLeftRadius:24,borderTopRightRadius:24,
        border:'1px solid var(--border)',borderBottom:0,
        boxShadow:'0 -20px 60px rgba(0,0,0,0.5)',
        padding:'20px 24px 24px',maxHeight:'85vh',overflow:'auto',
      }}>
        <div style={{width:36,height:4,background:'var(--fg-4)',borderRadius:9999,margin:'0 auto 16px'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)'}}>Step {step} / 3</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:22,fontWeight:500,color:'var(--fg-1)',marginTop:4,letterSpacing:'-0.015em'}}>
              {step===1 && 'Choose service'}
              {step===2 && 'Pick a time'}
              {step===3 && `Confirm at ${business.name}`}
            </div>
          </div>
          <button onClick={onClose} style={{background:'var(--bg-4)',border:'1px solid var(--border)',borderRadius:9999,width:32,height:32,cursor:'pointer',color:'var(--fg-2)'}}>×</button>
        </div>

        {step===1 && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {["Men's haircut · €15","Beard trim · €8","Hair + beard · €20","Hot-towel shave · €18"].map(s=>(
              <button key={s} onClick={()=>setService(s)}
                style={{
                  textAlign:'left',fontFamily:'var(--font-body)',fontSize:14,
                  background: service===s ? 'rgba(206,93,69,0.10)' : 'var(--bg-3)',
                  color:'var(--fg-1)',
                  border:`1px solid ${service===s?'var(--accent)':'var(--border)'}`,
                  borderRadius:12,padding:'14px 16px',cursor:'pointer',
                }}>{s}</button>
            ))}
          </div>
        )}

        {step===2 && (
          <div>
            <div style={{display:'flex',gap:8,overflowX:'auto',marginBottom:20}}>
              {days.map(d=>(
                <button key={d.label+d.date} onClick={()=>setDate(`${d.label} · ${d.date}`)}
                  style={{
                    flexShrink:0,padding:'12px 16px',borderRadius:12,
                    background: date===`${d.label} · ${d.date}` ? 'var(--fg-1)' : 'var(--bg-3)',
                    color:    date===`${d.label} · ${d.date}` ? '#141412'     : 'var(--fg-2)',
                    border:'1px solid var(--border)',cursor:'pointer',textAlign:'center',
                    fontFamily:'var(--font-body)',
                  }}>
                  <div style={{fontSize:11,opacity:0.8}}>{d.label}</div>
                  <div style={{fontSize:13,fontWeight:500,marginTop:2}}>{d.date}</div>
                </button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {slots.map(t=>(
                <button key={t} onClick={()=>setTime(t)}
                  style={{
                    fontFamily:'var(--font-mono)',fontSize:13,
                    background: time===t ? 'var(--accent)' : 'var(--bg-3)',
                    color:    time===t ? '#fff' : 'var(--fg-1)',
                    border:`1px solid ${time===t?'var(--accent)':'var(--border)'}`,
                    borderRadius:10,padding:'10px 0',cursor:'pointer',
                  }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {step===3 && (
          <div style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:14,padding:20}}>
            {[['Business',business.name],['Service',service],['Date',date],['Time',time||'—']].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:k==='Business'?'0':'1px solid var(--border)'}}>
                <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)'}}>{k}</div>
                <div style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--fg-1)'}}>{v}</div>
              </div>
            ))}
            <div style={{marginTop:16,padding:'12px 14px',background:'rgba(78,169,122,0.08)',border:'1px solid rgba(78,169,122,0.22)',borderRadius:10,fontFamily:'var(--font-body)',fontSize:12,color:'#8fd2a9'}}>
              No payment now. The business will confirm within 15 min.
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:8,marginTop:24}}>
          {step>1 && (
            <button onClick={()=>setStep(step-1)} style={{
              flex:1,fontFamily:'var(--font-body)',fontSize:14,fontWeight:500,
              background:'var(--bg-3)',color:'var(--fg-1)',border:'1px solid var(--border)',
              borderRadius:9999,padding:'12px 20px',cursor:'pointer',
            }}>Back</button>
          )}
          <button onClick={()=>step<3 ? setStep(step+1) : onClose()} disabled={!canContinue}
            style={{
              flex:2,fontFamily:'var(--font-body)',fontSize:14,fontWeight:500,
              background: canContinue?'var(--accent)':'var(--bg-4)',
              color: canContinue?'#fff':'var(--fg-3)',
              border:0,borderRadius:9999,padding:'12px 20px',
              cursor:canContinue?'pointer':'not-allowed',
              boxShadow: canContinue?'0 1px 0 rgba(255,255,255,0.15) inset, 0 3px 5px rgba(206,93,69,0.5)':'none',
            }}>
            {step<3 ? 'Continue →' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
window.BookingFlow = BookingFlow;
