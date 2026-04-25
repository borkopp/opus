// Features.jsx — landing feature grid
function FeatureIcon({ name }) {
  const common = { width: 22, height: 22, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.6, strokeLinecap:'round', strokeLinejoin:'round' };
  if (name==='cal')  return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>;
  if (name==='msg')  return <svg {...common}><path d="M21 15a4 4 0 01-4 4H7l-4 3V6a4 4 0 014-4h10a4 4 0 014 4z"/></svg>;
  if (name==='pay')  return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/></svg>;
  if (name==='spark')return <svg {...common}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>;
  return null;
}

function Features() {
  const items = [
    { icon:'cal',   title:'Закажување 24/7', desc:'Клиентите резервираат онлајн, а календарот сам се организира. Никогаш повеќе пропуштен повик.' },
    { icon:'msg',   title:'AI асистент',     desc:'Одговара на пораки, потврдува резервации, и те потсетува за се. Како дополнителен член на тимот.' },
    { icon:'pay',   title:'Плаќања',         desc:'Картички, готовина, Apple Pay. Еден извештај, без табели, без главоболка.' },
    { icon:'spark', title:'Статистики',      desc:'Види што работи, што не, и каде да вложиш наредниот месец.' },
  ];
  return (
    <section style={{position:'relative',padding:'120px 24px',background:'#0d0d0d',overflow:'hidden'}}>
      <div style={{
        position:'absolute',top:'-10%',left:'50%',transform:'translateX(-50%)',
        width:800,height:800,
        background:'radial-gradient(circle, rgba(206,93,69,0.10), transparent 60%)',
        filter:'blur(60px)',pointerEvents:'none',
      }}/>
      <div style={{position:'relative',maxWidth:1200,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:72}}>
          <div style={{fontFamily:'var(--font-body)',fontSize:11,fontWeight:700,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--accent)'}}>Features</div>
          <h2 style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:'clamp(36px,5vw,64px)',lineHeight:1.05,letterSpacing:'-0.02em',color:'var(--fg-1)',margin:'16px 0 0',textWrap:'balance'}}>
            Сè што ти треба за да водиш <span style={{fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--accent)'}}>бизнис</span>.
          </h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:16}}>
          {items.map(it=>(
            <div key={it.title} style={{
              background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:20,padding:24,
              transition:'transform .3s var(--ease-out-quart), border-color .3s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(206,93,69,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';}}>
              <div style={{
                width:44,height:44,borderRadius:12,
                background:'rgba(206,93,69,0.12)',color:'var(--accent-soft)',
                border:'1px solid rgba(206,93,69,0.22)',
                display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16,
              }}><FeatureIcon name={it.icon}/></div>
              <div style={{fontFamily:'var(--font-display)',fontWeight:500,fontSize:18,color:'var(--fg-1)',letterSpacing:'-0.005em'}}>{it.title}</div>
              <div style={{fontFamily:'var(--font-body)',fontSize:14,color:'var(--fg-2)',marginTop:8,lineHeight:1.55}}>{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
window.Features = Features;
