const Agenda={
  STATUS:['Agendado','Confirmado','Concluído','Cancelado','Faltou'],ATIVOS:['Agendado','Confirmado'],
  async conflito(a){
    const ini=U.min(a.hora),fim=ini+a.duracao;
    return(await DB.todos('agendamentos')).filter(x=>x.id!==a.id&&x.data===a.data&&x.profissionalId===a.profissionalId&&this.ATIVOS.includes(x.status)).find(x=>{const i=U.min(x.hora);return ini<i+x.duracao&&i<fim})||null;
  },
  async render(el){
    let dia=U.hoje();
    el.innerHTML=`<div class="barra"><button class="sec" id="ant">‹ Anterior</button><input id="dia" type="date" style="max-width:170px"><button class="sec" id="prox">Próximo ›</button><button class="sec" id="hoje">Hoje</button><button id="novo">Novo agendamento</button></div><div id="lista"></div>`;
    const lista=el.querySelector('#lista'),inp=el.querySelector('#dia');
    const desenhar=async()=>{
      inp.value=dia;const cl=Object.fromEntries((await DB.todos('clientes')).map(c=>[c.id,c])),sv=Object.fromEntries((await DB.todos('servicos')).map(s=>[s.id,s.nome])),pf=Object.fromEntries((await DB.todos('profissionais')).map(p=>[p.id,p.nome]));
      const ls=(await DB.todos('agendamentos')).filter(a=>a.data===dia).sort((a,b)=>a.hora.localeCompare(b.hora));
      lista.innerHTML=UI.tabela(['Horário','Cliente','Serviços','Status',''],ls.map(a=>{const c=cl[a.clienteId]||{},nomes=(a.servicoIds||[]).map(i=>sv[i]||'serviço').join(', '),
        w=U.wa(c.telefone,`Olá, ${c.nome||''}! Lembrete do seu horário: ${U.data(a.data)} às ${a.hora} (${nomes}). Podemos confirmar?`);
        return[`<b>${a.hora}</b><br><small>até ${U.hhmm(U.min(a.hora)+a.duracao)}</small>`,`<b>${UI.h(c.nome||'—')}</b>${c.alergias?'<br><small class="atraso">⚠ '+UI.h(c.alergias)+'</small>':''}`,UI.h(nomes)+`<br><small>${UI.h(pf[a.profissionalId]||'')}</small>`,
          `<select data-st data-id="${a.id}" aria-label="Status">${this.STATUS.map(s=>`<option${s===a.status?' selected':''}>${s}</option>`).join('')}</select>`,
          `<div class="acoes">${this.ATIVOS.includes(a.status)?`<button class="peq" data-a="at" data-id="${a.id}">Atender</button>`:''}${w?`<a class="peq sec" style="padding:5px 10px;border:1px solid var(--borda);border-radius:6px;font-size:13px;text-decoration:none;color:inherit" target="_blank" rel="noopener" href="${w}">WhatsApp</a>`:''}<button class="sec peq" data-a="ed" data-id="${a.id}">Editar</button><button class="peq risco" data-a="ex" data-id="${a.id}">Excluir</button></div>`]}),'Nenhum horário marcado neste dia.');
    };
    const ir=n=>{dia=U.add(dia,n);desenhar()};
    el.querySelector('#ant').onclick=()=>ir(-1);el.querySelector('#prox').onclick=()=>ir(1);el.querySelector('#hoje').onclick=()=>{dia=U.hoje();desenhar()};
    inp.onchange=()=>{if(inp.value){dia=inp.value;desenhar()}};
    el.querySelector('#novo').onclick=()=>this.editar({data:dia},desenhar);
    lista.onchange=async e=>{if(!e.target.dataset.st)return;const a=await DB.obter('agendamentos',e.target.dataset.id);
      if(e.target.value==='Concluído'){desenhar();Atendimentos.novo({clienteId:a.clienteId,profissionalId:a.profissionalId,data:a.data,servicoIds:a.servicoIds,agendamentoId:a.id},desenhar);return}
      a.status=e.target.value;await DB.salvar('agendamentos',a);App.toast('Status atualizado.');desenhar()};
    lista.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=await DB.obter('agendamentos',b.dataset.id);if(!a)return;
      if(b.dataset.a==='ed')this.editar(a,desenhar);
      if(b.dataset.a==='at')Atendimentos.novo({clienteId:a.clienteId,profissionalId:a.profissionalId,data:a.data,servicoIds:a.servicoIds,agendamentoId:a.id},desenhar);
      if(b.dataset.a==='ex'&&await App.confirmar('Excluir este agendamento?')){await DB.remover('agendamentos',a.id);App.toast('Agendamento excluído.');desenhar()}};
    desenhar();
  },
  async editar(a,depois){
    const[cl,sv,pf]=await Promise.all([DB.todos('clientes'),DB.todos('servicos'),Profissionais.ativos()]);
    if(!cl.length||!sv.length){App.toast('Cadastre ao menos uma cliente e um serviço antes de agendar.',true);return}
    const ativos=sv.filter(s=>s.ativo!=='Não'||(a.servicoIds||[]).includes(s.id)).sort((x,y)=>U.ord(x.nome,y.nome)),sel=new Set(a.servicoIds||[]);
    const campos=[{k:'clienteId',l:'Cliente',t:'select',req:1,opts:U.opts(cl.sort((x,y)=>U.ord(x.nome,y.nome)))},{k:'profissionalId',l:'Profissional',t:'select',req:1,opts:U.opts(pf)},{k:'data',l:'Data',type:'date',req:1},{k:'hora',l:'Hora',type:'time',req:1},
      {k:'duracao',l:'Duração (min)',type:'number',req:1},{k:'status',l:'Status',t:'select',opts:this.STATUS.map(s=>[s,s])},{k:'obs',l:'Observações',t:'textarea',wide:1}];
    UI.form(a.id?'Editar agendamento':'Novo agendamento',campos,{clienteId:cl[0].id,profissionalId:pf[0].id,data:U.hoje(),status:'Agendado',duracao:'',...a},async r=>{
      const ids=[...sel],dur=Math.round(+r.duracao);if(!ids.length)throw new Error('Escolha ao menos um serviço.');if(!(dur>0&&dur<=720))throw new Error('Informe a duração em minutos.');
      const reg={...a,...r,duracao:dur,servicoIds:ids};
      if(this.ATIVOS.includes(reg.status)){const c=await this.conflito(reg);if(c)throw new Error(`Horário ocupado: já existe um agendamento às ${c.hora} para esta profissional.`)}
      await DB.salvar('agendamentos',reg);App.toast('Agendamento salvo.');depois()},x=>{
      x.innerHTML=`<label>Serviços</label><div class="chks">${ativos.map(s=>`<label><input type="checkbox" data-s="${s.id}" data-d="${s.duracao}"${sel.has(s.id)?' checked':''}> ${UI.h(s.nome)} (${s.duracao} min · ${U.R(s.preco)})</label>`).join('')}</div>`;
      x.querySelectorAll('[data-s]').forEach(c=>c.onchange=()=>{c.checked?sel.add(c.dataset.s):sel.delete(c.dataset.s);document.getElementById('f_duracao').value=[...x.querySelectorAll('[data-s]:checked')].reduce((t,i)=>t+(+i.dataset.d),0)||''});
    });
  }
};
