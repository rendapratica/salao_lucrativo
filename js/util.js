const U={
  R:v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
  hoje(){const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)},
  add(iso,n){const d=new Date(iso+'T12:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)},
  data(d){return d?new Date(d.length>10?d:d+'T12:00').toLocaleDateString('pt-BR'):'—'},
  min(h){const p=String(h||'0:0').split(':');return(+p[0])*60+(+p[1]||0)},
  hhmm(m){return String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0')},
  fone(t){const d=String(t||'').replace(/\D/g,'');if(d.length<10)return'';return d.length<=11?'55'+d:d},
  wa(tel,txt){const n=this.fone(tel);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(txt):''},
  opts(l,k){return l.map(x=>[x.id,x[k||'nome']])},
  ord(a,b){return String(a).localeCompare(String(b),'pt-BR')}
};
