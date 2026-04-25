// Footer.jsx — landing footer with giant ghost wordmark
function Footer() {
  return (
    <footer style={{position:'relative',background:'#000',borderTop:'1px solid var(--border)',padding:'80px 24px 40px',overflow:'hidden'}}>
      <div style={{maxWidth:1200,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:48,marginBottom:64}}>
          <div>
            <div style={{fontFamily:'var(--font-logo)',fontSize:24,letterSpacing:'0.08em',color:'var(--fg-1)'}}>OPUS</div>
            <p style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--fg-3)',maxWidth:320,marginTop:16,lineHeight:1.55}}>
              Платформа за управување со бизнис базирана на вештачка интелигенција. Skopje, MK.
            </p>
          </div>
          {[
            { title:'Product',  links:['Features','Pricing','Marketplace','Changelog'] },
            { title:'Company',  links:['About','Careers','Contact','Press'] },
            { title:'Legal',    links:['Terms','Privacy','Cookies','GDPR'] },
          ].map(col=>(
            <div key={col.title}>
              <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--fg-3)',marginBottom:16}}>{col.title}</div>
              <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10}}>
                {col.links.map(l=><li key={l}><a href="#" style={{fontFamily:'var(--font-body)',fontSize:13,color:'var(--fg-2)',textDecoration:'none'}}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{
          height:1,
          backgroundImage:'repeating-linear-gradient(90deg, rgba(250,249,247,0.2) 0, rgba(250,249,247,0.2) 4px, transparent 4px, transparent 8px)',
        }}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:28,flexWrap:'wrap',gap:16}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-3)'}}>© 2026 OPUS MK. Сите права задржани.</div>
          <div style={{display:'flex',gap:20,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-3)'}}>
            <span>v 1.4.2</span><span>Skopje · MK</span><span>status • all systems normal</span>
          </div>
        </div>
        {/* giant ghost wordmark */}
        <div style={{
          fontFamily:'var(--font-logo)',
          fontSize:'clamp(120px, 22vw, 260px)',
          letterSpacing:'0.04em',
          color:'transparent',
          WebkitTextStroke:'1px rgba(250,249,247,0.12)',
          lineHeight:0.9,
          marginTop:40,marginBottom:-40,
          userSelect:'none',textAlign:'center',
        }}>OPUS</div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
