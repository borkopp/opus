// CategoryBar.jsx — horizontal category filter pills
function CategoryBar({ active, onChange }) {
  const cats = [
    { id:'all',    label:'All' },
    { id:'barber', label:'Barbershop' },
    { id:'hair',   label:'Hair Salon' },
    { id:'nail',   label:'Nail Studio' },
    { id:'spa',    label:'Spa' },
    { id:'lash',   label:'Lash Studio' },
    { id:'tattoo', label:'Tattoo' },
    { id:'beauty', label:'Beauty' },
  ];
  return (
    <div style={{padding:'20px 24px 12px',background:'var(--bg-1)',borderBottom:'1px solid var(--border)'}}>
      <div style={{maxWidth:1280,margin:'0 auto',display:'flex',gap:8,alignItems:'center',overflowX:'auto'}}>
        {cats.map((c,i)=>(<React.Fragment key={c.id}>
          {i>0 && i%3===0 && <span style={{color:'var(--fg-4)',flexShrink:0}}>✦</span>}
          <button onClick={()=>onChange?.(c.id)}
            style={{
              flexShrink:0,
              fontFamily:'var(--font-body)',fontSize:12,fontWeight:500,
              background: active===c.id ? 'var(--fg-1)' : 'var(--bg-3)',
              color:    active===c.id ? '#141412'     : 'var(--fg-2)',
              border:   active===c.id ? '0'           : '1px solid var(--border)',
              padding:'7px 14px',borderRadius:9999,cursor:'pointer',whiteSpace:'nowrap',
              transition:'transform .15s, background .2s',
            }}
            onMouseDown={e=>e.currentTarget.style.transform='scale(0.98)'}
            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}>
            {c.label}
          </button>
        </React.Fragment>))}
      </div>
    </div>
  );
}
window.CategoryBar = CategoryBar;
