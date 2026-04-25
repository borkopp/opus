// RevenueChart.jsx — lightweight SVG bar chart
function RevenueChart() {
  const data = [ 820, 1100, 960, 1340, 1180, 1480, 1248 ];
  const labels = ['Fri','Sat','Sun','Mon','Tue','Wed','Thu'];
  const max = Math.max(...data);
  const w = 520, h = 180, pad = 24, bw = (w - pad*2) / data.length;
  return (
    <div style={{background:'var(--bg-3)',border:'1px solid var(--border)',borderRadius:16,padding:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
        <div>
          <div style={{fontFamily:'var(--font-body)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--fg-3)'}}>Last 7 days</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:500,color:'var(--fg-1)',letterSpacing:'-0.01em',marginTop:2}}>Revenue</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:500,color:'var(--fg-1)',letterSpacing:'-0.02em'}}>€8,128</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#6fcf97'}}>↑ 14% vs last week</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:'auto',display:'block'}}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#ce5d45" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#ce5d45" stopOpacity="0.18"/>
          </linearGradient>
        </defs>
        {data.map((v,i)=>{
          const bh = (v/max) * (h-pad*2-20);
          const x  = pad + i*bw + bw*0.2;
          const bwi= bw*0.6;
          const y  = h - pad - bh;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bwi} height={bh} rx="4" fill="url(#barGrad)"/>
              <text x={x+bwi/2} y={h-6} textAnchor="middle" fontFamily="DM Mono" fontSize="10" fill="#8a8680">{labels[i]}</text>
              <text x={x+bwi/2} y={y-6} textAnchor="middle" fontFamily="DM Mono" fontSize="10" fill="#c7c3bc">€{(v/1000).toFixed(1)}k</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
window.RevenueChart = RevenueChart;
