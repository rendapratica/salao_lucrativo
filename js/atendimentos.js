const Atendimentos={
  calcular({itens,desconto,resgateValor,pct,cfg}){
    const cobr=itens.filter(i=>!i.pacote).reduce((s,i)=>s+i.preco,0),desc=Math.min(Math.max(0,+desconto||0)+(+resgateValor||0),cobr),total=Math.round((cobr-desc)*100)/100,k=cobr>0?(cobr-desc)/cobr:0;
    const base=itens.reduce((s,i)=>s+(i.pacote?i.pacote.valorSessao:i.preco*k),0);
    return{cobrado:cobr,desconto:desc,total,comissao:Math.round(base*(+pct||0))/100,pontos:cfg&&cfg.ativo?Math.floor(total*(+cfg.pontosPorReal||0)):0};
  },
  async render(el){
    const h=U.hoje();
    el.innerHTML=`<div class="barra"><div style="flex:1"><label for="de">De</label><input id="de" type="date" value="${h.slice(0,8)}01"></div><div style="flex:1"><label for="ate">Até</label><input id="ate" type="date" value="${h}"></div><button id="novo" style="align-self:end">Novo atendimento</button></div><div id="lista"></div>`;
    const lista=el.querySelector('#lista'),de=el.querySelector('#de'),ate=el.querySelector('#ate');
    const desenhar=async()=>{
      const cl=Object.fromEntries((await DB.todos('clientes')).map(c=>[c.id,c.nome])),pf=Object.fromEntries((await DB.todos('profissionais')).map(p=>[p.id,p.nome]));
      const ls=(await DB.todos('atendimentos')).filter(a=>a.data>=de.value&&a.data<=ate.value).sort((a,b)=>b.data.localeCompare(a.data));
      lista.innerHTML=UI.tabela(['Data','Cliente','Serviços','Total','Pontos',''],ls.map(a=>[U.data(a.data),UI.h(cl[a.clienteId]||'—'),UI.h(a.itens.map(i=>i.nome).join(', '))+`<br><small>${UI.h(pf[a.profissionalId]||'')}</small>`,
        `<b>${U.R(a.total)}</b><br><small>${UI.h(a.total?a.forma:'pacote')}</small>`,(a.pontosGanhos||0)-(a.pontosUsados||0),`<div class="acoes"><button class="sec peq" data-a="ver" data-id="${a.id}">Ver</button><button class="peq risco" data-a="ex" data-id="${a.id}">Excluir</button></div>`]),'Nenhum atendimento no período.');
    };
    de.onchange=ate.onchange=desenhar;el.querySelector('#novo').onclick=()=>this.novo({},desenhar);
    lista.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=await DB.obter('atendimentos',b.dataset.id);if(!a)return;
      if(b.dataset.a==='ver'){const fs=[];for(const id of a.fotos||[]){const i=await DB.obter('imagens',id);if(i)fs.push(i.data)}
        UI.info('Atendimento de '+U.data(a.data),UI.tabela(['Serviço','Valor'],a.itens.map(i=>[UI.h(i.nome),i.pacoteClienteId?'Pacote':U.R(i.preco)]),'')+`<p>Desconto: ${U.R(a.desconto)} · Total: <b>${U.R(a.total)}</b> · Comissão: ${U.R(a.comissao)}</p>${a.obs?'<p>'+UI.h(a.obs)+'</p>':''}<div class="fotos">${fs.map(s=>`<img src="${s}" alt="Foto">`).join('')}</div>`)}
      if(b.dataset.a==='ex')this.excluir(a,desenhar)};
    desenhar();
  },
  async excluir(a,depois){
    if(!await App.confirmar('Excluir este atendimento? As sessões de pacote usadas voltam e os pontos são desfeitos.'))return;
    for(const i of a.itens)if(i.pacoteClienteId){const p=await DB.obter('pacotesClientes',i.pacoteClienteId);if(p&&p.sessoesUsadas>0){p.sessoesUsadas--;await DB.salvar('pacotesClientes',p)}}
    for(const id of a.fotos||[])await DB.remover('imagens',id);
    if(a.agendamentoId){const g=await DB.obter('agendamentos',a.agendamentoId);if(g){g.status='Agendado';delete g.atendimentoId;await DB.salvar('agendamentos',g)}}
    await DB.remover('atendimentos',a.id);await DB.registrarHistorico('atendimento excluído',U.data(a.data));App.toast('Atendimento excluído.');depois();
  },
  async novo(pre,depois){
    const[cl,sv,pf,cfg]=await Promise.all([DB.todos('clientes'),DB.todos('servicos'),Profissionais.ativos(),Fid.cfg()]);
    if(!cl.length||!sv.length){App.toast('Cadastre ao menos uma cliente e um serviço antes.',true);return}
    cl.sort((a,b)=>U.ord(a.nome,b.nome));const ativos=sv.filter(s=>s.ativo!=='Não'||(pre.servicoIds||[]).includes(s.id)).sort((a,b)=>U.ord(a.nome,b.nome));
    const st={sel:new Set(pre.servicoIds||[]),pacote:{},resgate:false,fotos:[]};let pks=[],saldo=0;
    const itensAtuais=()=>ativos.filter(s=>st.sel.has(s.id)).map(s=>{const pk=st.pacote[s.id]&&pks.find(p=>p.id===st.pacote[s.id]);return{servicoId:s.id,nome:s.nome,preco:s.preco,pacote:pk?{id:pk.id,valorSessao:pk.valorPago/pk.sessoesTotal}:null}});
    const campos=[{k:'clienteId',l:'Cliente',t:'select',req:1,opts:U.opts(cl)},{k:'profissionalId',l:'Profissional',t:'select',req:1,opts:U.opts(pf)},{k:'data',l:'Data',type:'date',req:1},{k:'forma',l:'Forma de pagamento',t:'select',opts:Financeiro.formas()},{k:'desconto',l:'Desconto (R$)',type:'number'},{k:'obs',l:'Observações',t:'textarea',wide:1}];
    UI.form('Novo atendimento',campos,{clienteId:pre.clienteId||cl[0].id,profissionalId:pre.profissionalId||pf[0].id,data:pre.data||U.hoje(),forma:'PIX',desconto:''},async r=>{
      const itens=itensAtuais();if(!itens.length)throw new Error('Marque ao menos um serviço realizado.');if(+r.desconto<0)throw new Error('O desconto não pode ser negativo.');
      for(const i of itens)if(i.pacote){const p=await DB.obter('pacotesClientes',i.pacote.id);if(!p||p.sessoesUsadas>=p.sessoesTotal||p.validade<r.data)throw new Error('O pacote escolhido não tem sessões disponíveis nessa data.')}
      const pr=pf.find(p=>p.id===r.profissionalId),resg=st.resgate&&cfg.ativo&&saldo>=cfg.premioPontos,c=this.calcular({itens,desconto:r.desconto,resgateValor:resg?cfg.premioValor:0,pct:pr?pr.comissao:0,cfg});
      const ids=[];for(const f of st.fotos){const g=await DB.salvar('imagens',{data:f.data});ids.push(g.id)}
      const reg=await DB.salvar('atendimentos',{clienteId:r.clienteId,profissionalId:r.profissionalId,data:r.data,forma:r.forma,itens:itens.map(i=>({servicoId:i.servicoId,nome:i.nome,preco:i.preco,pacoteClienteId:i.pacote?i.pacote.id:''})),desconto:c.desconto,total:c.total,comissao:c.comissao,pontosGanhos:c.pontos,pontosUsados:resg?cfg.premioPontos:0,obs:r.obs,fotos:ids,agendamentoId:pre.agendamentoId||''});
      for(const i of itens)if(i.pacote){const p=await DB.obter('pacotesClientes',i.pacote.id);p.sessoesUsadas++;await DB.salvar('pacotesClientes',p)}
      if(pre.agendamentoId){const g=await DB.obter('agendamentos',pre.agendamentoId);if(g){g.status='Concluído';g.atendimentoId=reg.id;await DB.salvar('agendamentos',g)}}
      await DB.registrarHistorico('atendimento',U.data(r.data)+' · '+U.R(c.total));App.toast('Atendimento registrado.'+(c.pontos?` +${c.pontos} pontos.`:''));if(depois)depois();else location.hash='atendimentos';
    },x=>{
      const cid=()=>document.getElementById('f_clienteId').value,tot=()=>{const c=this.calcular({itens:itensAtuais(),desconto:document.getElementById('f_desconto').value,resgateValor:st.resgate&&saldo>=cfg.premioPontos?cfg.premioValor:0,pct:0,cfg});
        x.querySelector('#tot').textContent='Total: '+U.R(c.total)+(c.pontos?` · +${c.pontos} pontos`:'')};
      const redesenhar=async()=>{pks=await Pacotes.ativosDoCliente(cid());saldo=await Fid.saldo(cid());
        x.innerHTML=`<label>Serviços realizados</label><div class="chks">${ativos.map(s=>{const p=pks.find(k=>k.servicoId===s.id);return`<div><label><input type="checkbox" data-s="${s.id}"${st.sel.has(s.id)?' checked':''}> ${UI.h(s.nome)} — ${U.R(s.preco)}</label>${p&&st.sel.has(s.id)?`<label style="margin-left:24px"><input type="checkbox" data-p="${s.id}" data-pc="${p.id}"${st.pacote[s.id]?' checked':''}> Usar sessão do pacote "${UI.h(p.nome)}" (${p.sessoesTotal-p.sessoesUsadas} restantes)</label>`:''}</div>`}).join('')}</div>
          ${cfg.ativo&&saldo>=cfg.premioPontos?`<label class="chks"><span><input type="checkbox" id="resg"${st.resgate?' checked':''}> Resgatar prêmio: ${cfg.premioPontos} pontos = ${U.R(cfg.premioValor)} de desconto (saldo ${saldo})</span></label>`:cfg.ativo?`<p><small>Pontos da cliente: ${saldo}</small></p>`:''}
          <div class="total-os" id="tot"></div><div id="fb" style="margin-top:12px"></div>`;
        x.querySelectorAll('[data-s]').forEach(c=>c.onchange=()=>{c.checked?st.sel.add(c.dataset.s):(st.sel.delete(c.dataset.s),delete st.pacote[c.dataset.s]);redesenhar()});
        x.querySelectorAll('[data-p]').forEach(c=>c.onchange=()=>{st.pacote[c.dataset.p]=c.checked?c.dataset.pc:'';tot()});
        const rg=x.querySelector('#resg');if(rg)rg.onchange=()=>{st.resgate=rg.checked;tot()};
        UI.fotos(x.querySelector('#fb'),st.fotos);tot()};
      document.getElementById('f_clienteId').onchange=()=>{st.pacote={};st.resgate=false;redesenhar()};document.getElementById('f_desconto').oninput=tot;redesenhar();
    });
  }
};
