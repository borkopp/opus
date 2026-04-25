// BusinessProfile.jsx — full profile view
function BusinessProfile({ b, onBack, onBook }) {
  const services = [
    { name:'Men\'s haircut',     duration:30, price:15 },
    { name:'Beard trim',         duration:15, price:8 },
    { name:'Hair + beard combo', duration:45, price:20 },
    { name:'Hot-towel shave',    duration:30, price:18 },
  ];
  const staff = ['Andrej','Marko','Bojan','Nikola'];
  return (
    <div style={{maxWidth:1100,margin:'0 auto',padding:'24px'}}>
      <button onClick={onBack} style={{
        display:'flex',alignItems:'center',gap:6,
        fontFamily:'var(--font-body)',fontSize:13,color:'var(--fg-2)',
        background:'transparent',border:0,cursor:'pointer',padding:'6px 0',marginBottom:16,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </button>
      {/* cover */}
      <div style={{
        height:260,borderRadius:20,background:b.cover,position:'relative',overflow:'hidden',
        border:'1px solid var(--border)',
      }}>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.8))'}}/>
        <div style={{position:'absolute',left:24,bottom:24,right:24,display:'flex',justifyContent:'space-between',alignItems:'end',gap:16}}>
          <div>
            <span style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',background:'rgba(0,0,0,0.55)',padding:'4px 10px',borderRadius:9999,backdropFilter:'blur(8px)'}}>{b.category}</span>
            <h1 style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:48,letterSpacing:'-0.02em',color:'#fff',margin:'12px 0 4px'}}>{b.name}</h1>
            <div style={{fontFamily:'var(--font-body)',fontSize:14,color:'rgba(255,255,255,0.78)'}}>{b.area} · {b.city}</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(8px)',padding:'8px 14px',borderRadius:9999,display:'flex',alignItems:'center',gap:6,fontFamily:'var(--font-mono)',fontSize:13,color:'#fff'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#e3b34a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {b.rating}
            </div>
          </div>
        </div>
      </div>
      {/* 2-col */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:32,marginTop:32}}>
        {/* left */}
        <div>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)'}}>About</div>
          <p style={{fontFamily:'var(--font-body)',fontSize:15,color:'var(--fg-2)',lineHeight:1.65,marginTop:12,textWrap:'pretty'}}>
            Independent barbershop in the heart of {b.area}. We cut, trim, and listen — since 2018.
            Walk-ins welcome but booking saves a seat and the coffee.
          </p>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)',marginTop:32}}>Services</div>
          <div style={{marginTop:14,background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
            {services.map((s,i)=>(
              <div key={s.name} style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:i?'1px solid var(--border)':'0'}}>
                <div>
                  <div style={{fontFamily:'var(--font-body)',fontSize:15,color:'var(--fg-1)',fontWeight:500}}>{s.name}</div>
                  <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-3)',marginTop:2}}>{s.duration} min</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:18,color:'var(--fg-1)',fontWeight:500}}>€{s.price}</div>
                  <button onClick={onBook} style={{fontFamily:'var(--font-body)',fontSize:12,fontWeight:500,background:'var(--accent)',color:'#fff',border:0,borderRadius:9999,padding:'7px 14px',cursor:'pointer',boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 3px 5px rgba(206,93,69,0.4)'}}>Book</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)',marginTop:32}}>Gallery</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:14}}>
            {[0,1,2,3,4,5].map(i=>(
              <div key={i} style={{paddingBottom:'100%',borderRadius:12,background:`linear-gradient(${135+i*30}deg, #2a1712, #5c2a1a ${50+i*5}%, #ce5d45)`}}/>
            ))}
          </div>
        </div>
        {/* right */}
        <div>
          <div style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,padding:20,position:'sticky',top:86}}>
            <div style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:17,color:'var(--fg-1)'}}>Book appointment</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-3)',marginTop:4}}>Choose a service above</div>
            <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid var(--border)'}}>
              <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)',marginBottom:10}}>Staff</div>
              <div style={{display:'flex',gap:-4}}>
                {staff.map((s,i)=>(
                  <div key={s} title={s} style={{
                    width:34,height:34,borderRadius:9999,
                    background:`linear-gradient(135deg, hsl(${20+i*30},50%,40%), hsl(${20+i*30},70%,60%))`,
                    border:'2px solid var(--bg-3)',marginLeft:i?-8:0,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'var(--font-body)',fontSize:12,color:'#fff',fontWeight:500,
                  }}>{s[0]}</div>
                ))}
              </div>
            </div>
            <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid var(--border)'}}>
              <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)',marginBottom:10}}>Hours</div>
              {['Mon–Fri  09:00 – 20:00','Sat       10:00 – 18:00','Sun       closed'].map(h=>(
                <div key={h} style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-2)',padding:'3px 0',whiteSpace:'pre'}}>{h}</div>
              ))}
            </div>
            <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
              <button style={{flex:1,fontFamily:'var(--font-body)',fontSize:13,background:'var(--bg-4)',color:'var(--fg-1)',border:'1px solid var(--border)',borderRadius:9999,padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 16.92V21a1 1 0 01-1.1 1 19.86 19.86 0 01-8.64-3.07A19.5 19.5 0 016.12 13 19.86 19.86 0 013 4.1 1 1 0 014 3h4.09a1 1 0 011 .75 12 12 0 00.7 2.81 1 1 0 01-.23 1L8 9a16 16 0 006 6l1.44-1.44a1 1 0 011-.23 12 12 0 002.81.7 1 1 0 01.75 1z"/></svg>
                Call
              </button>
              <button style={{flex:1,fontFamily:'var(--font-body)',fontSize:13,background:'var(--bg-4)',color:'var(--fg-1)',border:'1px solid var(--border)',borderRadius:9999,padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Map
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.BusinessProfile = BusinessProfile;
