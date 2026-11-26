const Dashboard={
  iso(d){return d.toLocaleDateString('sv-SE')},
  meses(n,ref=new Date()){return Array.from({length:n},(_,k)=>{const i=n-1-k,a=new Date(ref.getFullYear(),ref.getMonth()-i,1),b=new Date(ref.getFullYear(),ref.getMonth()-i+1,0);return{rot:a.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}),de:this.iso(a),ate:this.iso(b)}})},
  csv(l){const e=v=>{v=v==null?'':String(v);return/[",;\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};return'\ufeff'+l.map(r=>r.map(e).join(';')).join('\n')},
  periodo(){const h=U.hoje();return`<div class="periodo"><div><label for="de">De</label><input id="de" type="date" value="${h.slice(0,8)}01"></div><div><label for="ate">Até</label><input id="ate" type="date" value="${h}"></div></div>`},
  grafico(host,rot,series,fmt){
    if(window.Chart){Chart.defaults.color=getComputedStyle(document.documentElement).getPropertyValue('--texto').trim()||'#333';host.innerHTML='<canvas></canvas>';
      new Chart(host.firstChild,{type:'bar',data:{labels:rot,datasets:series.map(s=>({label:s.nome,data:s.dados,backgroundColor:s.cor}))},options:{responsive:true,plugins:{legend:{display:series.length>1}}}});return}
    const max=Math.max(1,...series.flatMap(s=>s.dados));
    host.innerHTML=(series.length>1?`<small>${series.map(s=>`<span style="color:${s.cor}">■</span> ${UI.h(s.nome)}`).join(' &nbsp; ')}</small>`:'')+(rot.length?rot.map((l,i)=>`<div class="linha"><span>${UI.h(l)}</span><div>${series.map(s=>`<div class="fill" style="width:${Math.max(1,s.dados[i]/max*100)}%;background:${s.cor}"></div>`).join('')}</div><span>${series.map(s=>fmt(s.dados[i])).join(' / ')}</span></div>`).join(''):'<p class="vazio">Sem dados no período.</p>');
  },
  async render(el){
    el.innerHTML=App.statusBackup()+Licenca.aviso()+this.periodo()+'<div id="painel"></div>';
    const de=el.querySelector('#de'),ate=el.querySelector('#ate'),p=el.querySelector('#painel'),R=U.R;
    const desenhar=async()=>{
      if(de.value>ate.value){App.toast('A data inicial não pode ser depois da final.',true);return}
      const[ag,cl,at,pk,sv]=await Promise.all(['agendamentos','clientes','atendimentos','pacotesClientes','servicos'].map(s=>DB.todos(s))),f=await Financeiro.resumo(de.value,ate.value),h=U.hoje();
      const hoje=ag.filter(a=>a.data===h&&Agenda.ATIVOS.includes(a.status)).sort((a,b)=>a.hora.localeCompare(b.hora)),prox=ag.filter(a=>(a.data>h||(a.data===h&&a.hora>=new Date().toTimeString().slice(0,5)))&&Agenda.ATIVOS.includes(a.status)).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora))[0];
      const nc=Object.fromEntries(cl.map(c=>[c.id,c.nome])),mes=h.slice(5,7),aniv=cl.filter(c=>c.nascimento&&c.nascimento.slice(5,7)===mes).sort((a,b)=>a.nascimento.slice(8).localeCompare(b.nascimento.slice(8)));
      const per=at.filter(a=>a.data>=de.value&&a.data<=ate.value),cont={};per.forEach(a=>a.itens.forEach(i=>cont[i.nome]=(cont[i.nome]||0)+1));const top=Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,6);
      const fim=pk.filter(x=>x.sessoesUsadas<x.sessoesTotal&&x.validade>=h&&(x.validade<=U.add(h,15)||x.sessoesTotal-x.sessoesUsadas<=1));
      const M=(i,t,v)=>`<div class="card metrica">${Icones.svg(i)}<div><small>${t}</small><div class="total-os">${v}</div></div></div>`;
      p.innerHTML=`<div class="metricas">${M('calcheck','Atendimentos hoje',hoje.length)}${M('clock','Próximo horário',prox?`${prox.hora}${prox.data!==h?' ('+U.data(prox.data).slice(0,5)+')':''} · ${UI.h(nc[prox.clienteId]||'')}`:'—')}${M('bag','Receita no período',R(f.receita))}
        ${M('card','Despesas pagas',R(f.despesas))}${M('coins','Comissões',R(f.comissoes))}${M('trend','Lucro estimado',R(f.lucro))}${M('ticket','Ticket médio',R(f.qtd?f.atend/f.qtd:0))}${M('users','Clientes cadastradas',cl.length)}</div>
        <div class="card"><h2>${Icones.svg('gift')}Receita x despesas — últimos 6 meses</h2><div class="graf" id="g1"></div></div>
        <div class="card"><h2>${Icones.svg('scissors')}Serviços mais realizados no período</h2><div class="graf" id="g2"></div></div>
        <div class="card"><h2>${Icones.svg('gift')}Aniversariantes do mês</h2>${aniv.length?aniv.map(c=>`<span class="pill">${U.data(c.nascimento).slice(0,5)} · ${UI.h(c.nome)}</span> `).join(''):'<p class="vazio">Nenhuma aniversariante neste mês.</p>'}</div>
        <div class="card"><h2>${Icones.svg('box')}Pacotes acabando</h2>${UI.tabela(['Cliente','Pacote','Restam','Validade'],fim.map(x=>[UI.h(nc[x.clienteId]||'—'),UI.h(x.nome),x.sessoesTotal-x.sessoesUsadas,U.data(x.validade)]),'Nenhum pacote perto do fim.')}</div>`;
      const ms=this.meses(6),rs=[];for(const m of ms)rs.push(await Financeiro.resumo(m.de,m.ate));
      this.grafico(p.querySelector('#g1'),ms.map(m=>m.rot),[{nome:'Receita',dados:rs.map(r=>r.receita),cor:'#d6177f'},{nome:'Despesas',dados:rs.map(r=>r.despesas),cor:'#b9a0ad'}],R);
      this.grafico(p.querySelector('#g2'),top.map(t=>t[0]),[{nome:'Vezes',dados:top.map(t=>t[1]),cor:'#d6177f'}],v=>v);
    };
    de.onchange=ate.onchange=desenhar;desenhar();
  },
  async relatorios(el){
    el.innerHTML=this.periodo()+'<div id="rel"></div>';
    const de=el.querySelector('#de'),ate=el.querySelector('#ate'),box=el.querySelector('#rel'),R=U.R;
    const desenhar=async()=>{
      const[at,cl,pf]=await Promise.all(['atendimentos','clientes','profissionais'].map(s=>DB.todos(s))),nc=Object.fromEntries(cl.map(c=>[c.id,c.nome])),np=Object.fromEntries(pf.map(p=>[p.id,p.nome]));
      const ls=at.filter(a=>a.data>=de.value&&a.data<=ate.value).sort((a,b)=>a.data.localeCompare(b.data)),formas={},profs={},servs={};
      ls.forEach(a=>{formas[a.total?a.forma:'Pacote']=(formas[a.total?a.forma:'Pacote']||0)+a.total;const q=profs[a.profissionalId]=profs[a.profissionalId]||{n:0,v:0,c:0};q.n++;q.v+=a.total;q.c+=a.comissao||0;a.itens.forEach(i=>{const s=servs[i.nome]=servs[i.nome]||{n:0,v:0};s.n++;s.v+=i.pacoteClienteId?0:i.preco})});
      const linhas=ls.map(a=>[U.data(a.data),nc[a.clienteId]||'',a.itens.map(i=>i.nome).join(' + '),np[a.profissionalId]||'',a.forma,a.total,a.comissao||0]);
      box.innerHTML=`<div class="card"><h2>Comissões por profissional</h2>${UI.tabela(['Profissional','Atendimentos','Faturado','Comissão a pagar'],Object.entries(profs).map(([id,q])=>[UI.h(np[id]||'—'),q.n,R(q.v),`<b>${R(q.c)}</b>`]),'Sem atendimentos no período.')}</div>
        <div class="card"><h2>Atendimentos do período</h2><div class="acoes" style="margin:0 0 10px"><button id="csv"${linhas.length?'':' disabled'}>Exportar CSV</button></div>${UI.tabela(['Data','Cliente','Serviços','Prof.','Total'],linhas.map(l=>[l[0],UI.h(l[1]),UI.h(l[2]),UI.h(l[3]),R(l[5])]),'Nenhum atendimento no período.')}</div>
        <div class="card"><h2>Recebimentos por forma de pagamento</h2>${UI.tabela(['Forma','Total'],Object.entries(formas).map(([k,v])=>[UI.h(k),R(v)]),'Sem recebimentos.')}</div>
        <div class="card"><h2>Serviços</h2>${UI.tabela(['Serviço','Vezes','Receita'],Object.entries(servs).sort((a,b)=>b[1].n-a[1].n).map(([k,s])=>[UI.h(k),s.n,R(s.v)]),'Sem serviços no período.')}</div>`;
      const b=box.querySelector('#csv');if(b)b.onclick=()=>Backup.baixar(`atendimentos-${de.value}-a-${ate.value}.csv`,this.csv([['Data','Cliente','Serviços','Profissional','Forma','Total','Comissão'],...linhas]),'text/csv;charset=utf-8');
    };
    de.onchange=ate.onchange=desenhar;desenhar();
  }
};
