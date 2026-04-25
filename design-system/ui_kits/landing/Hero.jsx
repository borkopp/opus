// Hero.jsx — OPUS landing hero
function Hero() {
  return (
    <section style={{
      position:'relative',
      minHeight:'100vh',
      display:'flex',alignItems:'center',justifyContent:'center',
      padding:'160px 24px 100px',
      background:'#000',
      overflow:'hidden',
    }}>
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:"url('../../assets/abstract-bg.jpg')",
        backgroundSize:'cover',backgroundPosition:'center',
        opacity:0.85,
      }}/>
      <div style={{
        position:'absolute',inset:0,
        background:'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.95) 100%)',
      }}/>
      <div style={{position:'relative',textAlign:'center',maxWidth:920}}>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,
          background:'rgba(250,249,247,0.06)',border:'1px solid rgba(250,249,247,0.12)',
          backdropFilter:'blur(8px)',
          padding:'6px 14px',borderRadius:9999,
          fontFamily:'var(--font-body)',fontSize:12,color:'var(--fg-2)',
          marginBottom:28,
        }}>
          <span style={{width:6,height:6,borderRadius:9999,background:'#3ecf5b',boxShadow:'0 0 8px #3ecf5b'}}/>
          Запознајте го вашиот нов дигитален асистент
        </div>
        <h1 style={{
          fontFamily:'var(--font-display)',fontWeight:500,
          fontSize:'clamp(48px, 7vw, 96px)',
          lineHeight:1.02,letterSpacing:'-0.03em',
          color:'var(--fg-1)',margin:0,textWrap:'balance',
        }}>
          Вашиот бизнис работи.<br/>
          Вие <span style={{fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--accent)',fontWeight:500}}>владеете</span> со него.
        </h1>
        <p style={{
          fontFamily:'var(--font-body)',fontSize:18,lineHeight:1.55,
          color:'var(--fg-2)',maxWidth:640,margin:'28px auto 0',textWrap:'pretty',
        }}>
          OPUS го автоматизира закажувањето, плаќањата и комуникацијата со клиенти.
          Од салони за убавина до ресторани. Сè на едно место.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:36,flexWrap:'wrap'}}>
          <button style={{
            fontFamily:'var(--font-body)',fontSize:15,fontWeight:500,
            background:'var(--accent)',color:'#fff',border:0,borderRadius:9999,
            padding:'14px 28px',cursor:'pointer',whiteSpace:'nowrap',
            boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 3px 5px rgba(206,93,69,0.5), 0 10px 20px rgba(0,0,0,0.35)',
          }}>Започнете бесплатно</button>
          <button style={{
            fontFamily:'var(--font-body)',fontSize:15,fontWeight:500,
            background:'rgba(250,249,247,0.06)',color:'var(--fg-1)',
            border:'1px solid rgba(250,249,247,0.18)',borderRadius:9999,
            padding:'14px 28px',cursor:'pointer',backdropFilter:'blur(8px)',whiteSpace:'nowrap',
          }}>Дознајте повеќе</button>
        </div>
        <div style={{display:'flex',gap:32,justifyContent:'center',marginTop:56,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-3)',flexWrap:'wrap'}}>
          <span style={{whiteSpace:'nowrap'}}>3 месеци бесплатно</span>
          <span style={{color:'var(--fg-4)'}}>·</span>
          <span style={{whiteSpace:'nowrap'}}>Без картичка</span>
          <span style={{color:'var(--fg-4)'}}>·</span>
          <span style={{whiteSpace:'nowrap'}}>Откажете кога сакате</span>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
