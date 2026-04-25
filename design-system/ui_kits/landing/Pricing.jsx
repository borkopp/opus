// Pricing.jsx — simple pricing block
function Pricing() {
  const features = [
    'Неограничени закажувања',
    'AI асистент за клиенти',
    'Плаќања со картички',
    'Автоматски потсетувања',
    'Извештаи и статистики',
    '24/7 поддршка',
  ];
  return (
    <section style={{position:'relative',padding:'120px 24px',background:'#000',overflow:'hidden'}}>
      {/* dotted grid */}
      <div style={{
        position:'absolute',inset:0,opacity:0.4,
        backgroundImage:'radial-gradient(rgba(206,93,69,0.14) 1px, transparent 1px)',
        backgroundSize:'24px 24px',
        maskImage:'radial-gradient(circle at 50% 50%, black 40%, transparent 80%)',
        WebkitMaskImage:'radial-gradient(circle at 50% 50%, black 40%, transparent 80%)',
      }}/>
      <div style={{position:'relative',maxWidth:520,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontFamily:'var(--font-body)',fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--accent)'}}>Pricing</div>
        <h2 style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:'clamp(36px,5vw,64px)',lineHeight:1.05,letterSpacing:'-0.02em',color:'var(--fg-1)',margin:'16px 0 16px',textWrap:'balance'}}>
          Едноставен <span style={{fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--accent)'}}>ценовник</span>.
        </h2>
        <p style={{fontFamily:'var(--font-body)',fontSize:17,color:'var(--fg-2)',margin:'0 0 56px'}}>
          Бесплатно првите 3 месеци, потоа само 20€ месечно.
        </p>

        <div style={{
          background:'var(--bg-3)',
          border:'1px solid rgba(206,93,69,0.25)',
          borderRadius:24,padding:'40px 32px',
          boxShadow:'0 1px 0 rgba(255,255,255,0.05) inset, 0 30px 60px rgba(0,0,0,0.5), 0 0 80px rgba(206,93,69,0.12)',
          textAlign:'left',
        }}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:28}}>
            <div>
              <div style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:24,color:'var(--fg-1)'}}>OPUS Pro</div>
              <div style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--fg-3)',marginTop:2}}>Сè, за секој бизнис.</div>
            </div>
            <span style={{
              fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',
              color:'var(--accent-soft)',background:'rgba(206,93,69,0.12)',border:'1px solid rgba(206,93,69,0.25)',
              padding:'4px 10px',borderRadius:9999,
            }}>3 месеци бесплатно</span>
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:32}}>
            <span style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:72,letterSpacing:'-0.03em',color:'var(--fg-1)',lineHeight:1}}>€20</span>
            <span style={{fontFamily:'var(--font-body)',fontSize:15,color:'var(--fg-3)'}}>/ месец</span>
          </div>
          <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:12,marginBottom:32}}>
            {features.map(f=>(
              <li key={f} style={{display:'flex',alignItems:'center',gap:12,fontFamily:'var(--font-body)',fontSize:14,color:'var(--fg-2)'}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6fcf97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <button style={{
            width:'100%',
            fontFamily:'var(--font-body)',fontSize:15,fontWeight:500,
            background:'var(--accent)',color:'#fff',border:0,borderRadius:9999,
            padding:'14px 24px',cursor:'pointer',
            boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 3px 5px rgba(206,93,69,0.5)',
          }}>Започнете бесплатно</button>
        </div>
      </div>
    </section>
  );
}
window.Pricing = Pricing;
