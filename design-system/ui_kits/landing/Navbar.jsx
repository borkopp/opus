// Navbar.jsx — floating blurred pill navbar
const { useState, useEffect } = React;

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('pricing');
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const items = [
    { id: 'features', label: 'Features' },
    { id: 'pricing',  label: 'Pricing' },
    { id: 'about',    label: 'About' },
    { id: 'contact',  label: 'Contact' },
  ];
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:50,padding:scrolled?'12px 20px':'20px 24px',transition:'padding .3s var(--ease-out-quart)'}}>
      <div style={{
        maxWidth: scrolled ? 880 : 1200,
        margin:'0 auto',
        display:'flex',alignItems:'center',justifyContent:'space-between',
        background: scrolled ? 'rgba(13,13,13,0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        border: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        borderRadius: 9999,
        padding: scrolled ? '8px 8px 8px 20px' : '10px 10px 10px 24px',
        transition:'all .3s var(--ease-out-quart)',
      }}>
        <a href="#" style={{fontFamily:'var(--font-logo)',fontSize:18,letterSpacing:'0.08em',color:'var(--fg-1)',textDecoration:'none'}}>OPUS</a>
        <div style={{display:'flex',gap:2}}>
          {items.map(it => (
            <a key={it.id} href="#" onClick={e=>{e.preventDefault();setActive(it.id);}}
              style={{
                fontFamily:'var(--font-body)',fontSize:13,fontWeight:500,
                padding:'7px 14px',borderRadius:9999,
                color: active===it.id ? 'var(--fg-1)' : 'var(--fg-2)',
                background: active===it.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                textDecoration:'none',transition:'all .2s',cursor:'pointer'
              }}>{it.label}</a>
          ))}
        </div>
        <button style={{
          fontFamily:'var(--font-body)',fontSize:13,fontWeight:500,
          background:'var(--accent)',color:'#fff',border:0,borderRadius:9999,
          padding:'9px 18px',cursor:'pointer',whiteSpace:'nowrap',
          boxShadow:'0 1px 0 rgba(255,255,255,0.15) inset, 0 3px 5px rgba(206,93,69,0.5)',
        }}>Започнете →</button>
      </div>
    </div>
  );
}
window.Navbar = Navbar;
