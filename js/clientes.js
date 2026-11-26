const Clientes={
  render(el){Crud.tela(el,{store:'clientes',novo:'Nova cliente',vazio:'Nenhuma cliente cadastrada ainda.',colunas:['Cliente','Aniversário','Pontos'],busca:r=>r.nome+' '+(r.telefone||''),ctx:async()=>({pts:await Fid.saldos()}),
    linha:(r,c)=>[`<b>${UI.h(r.nome)}</b><br><small>${UI.h(r.telefone)}</small>`,r.nascimento?U.data(r.nascimento).slice(0,5):'—',c.pts[r.id]||0],acoes:[['ag','Agendar'],['hi','Histórico']],
    acao:(a,r)=>a==='ag'?Agenda.editar({clienteId:r.id},()=>{location.hash='agenda'}):this.historico(r),
    campos:[{k:'nome',l:'Nome',req:1,wide:1},{k:'telefone',l:'WhatsApp / telefone'},{k:'nascimento',l:'Aniversário',type:'date'},{k:'alergias',l:'Alergias e cuidados',t:'textarea',wide:1},{k:'obs',l:'Observações (gostos, cores favoritas…)',t:'textarea',wide:1}],
    salvar:async v=>{const d=v.telefone.replace(/\D/g,'');if(v.telefone&&(d.length<10||d.length>13))throw new Error('Telefone inválido: informe com DDD.');if(v.nascimento&&v.nascimento>U.hoje())throw new Error('O aniversário não pode estar no futuro.');return{nome:v.nome,telefone:v.telefone,nascimento:v.nascimento,alergias:v.alergias,obs:v.obs}},
    bloqueio:async r=>(await DB.todos('atendimentos')).some(a=>a.clienteId===r.id)||(await DB.todos('pacotesClientes')).some(a=>a.clienteId===r.id)||(await DB.todos('agendamentos')).some(a=>a.clienteId===r.id)?'Esta cliente tem agenda, atendimentos ou pacotes. Exclua-os antes.':''})},
  async historico(c){
    const at=(await DB.todos('atendimentos')).filter(a=>a.clienteId===c.id).sort((a,b)=>b.data.localeCompare(a.data)),gasto=at.reduce((s,a)=>s+a.total,0),pts=await Fid.saldo(c.id),pk=await Pacotes.ativosDoCliente(c.id);
    const linhas=[];for(const a of at){const fs=[];for(const id of a.fotos||[]){const i=await DB.obter('imagens',id);if(i)fs.push(i.data)}
      linhas.push([U.data(a.data),UI.h(a.itens.map(i=>i.nome).join(', ')),U.R(a.total)+(a.obs?`<br><small>${UI.h(a.obs)}</small>`:'')+(fs.length?`<div class="fotos">${fs.map(s=>`<img src="${s}" alt="Foto do atendimento">`).join('')}</div>`:'')])}
    UI.info('Histórico — '+c.nome,`<p>${at.length} atendimento(s) · ${U.R(gasto)} gastos · ${pts} pontos${c.nascimento?' · aniversário '+U.data(c.nascimento).slice(0,5):''}</p>${c.alergias?`<div class="aviso"><b>Alergias e cuidados:</b> ${UI.h(c.alergias)}</div>`:''}${pk.length?`<p>Pacotes ativos: ${pk.map(p=>UI.h(p.nome)+' ('+(p.sessoesTotal-p.sessoesUsadas)+' restantes)').join('; ')}</p>`:''}${UI.tabela(['Data','Serviços','Valor / fotos'],linhas,'Nenhum atendimento ainda.')}`);
  }
};
