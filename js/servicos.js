const Servicos={render(el){Crud.tela(el,{store:'servicos',novo:'Novo serviço',vazio:'Nenhum serviço cadastrado. Cadastre os serviços que você oferece.',colunas:['Serviço','Duração','Preço','Disponível'],
  busca:r=>r.nome,linha:r=>[`<b>${UI.h(r.nome)}</b>`,r.duracao+' min',U.R(r.preco),r.ativo==='Não'?'Não':'Sim'],
  campos:[{k:'nome',l:'Nome do serviço',req:1,wide:1},{k:'duracao',l:'Duração (min)',type:'number',req:1},{k:'preco',l:'Preço (R$)',type:'number',req:1},{k:'ativo',l:'Disponível',t:'select',opts:[['Sim','Sim'],['Não','Não']]}],
  padrao:{duracao:60,ativo:'Sim'},
  salvar:async(v,r)=>{const d=Math.round(+v.duracao),p=+v.preco;if(!(d>0&&d<=720))throw new Error('A duração deve ficar entre 1 e 720 minutos.');if(!(p>=0))throw new Error('Preço inválido.');
    if((await DB.todos('servicos')).some(x=>x.id!==r.id&&UI.norm(x.nome)===UI.norm(v.nome)))throw new Error('Já existe um serviço com este nome.');return{nome:v.nome,duracao:d,preco:p,ativo:v.ativo}},
  bloqueio:async r=>(await DB.todos('pacotes')).some(p=>p.servicoId===r.id)?'Este serviço faz parte de um pacote. Remova o pacote antes.':''})}};
const Profissionais={
  async garantir(){if(!(await DB.todos('profissionais')).length)await DB.salvar('profissionais',{nome:'Eu (profissional)',comissao:0,ativo:'Sim'})},
  async ativos(){return(await DB.todos('profissionais')).filter(p=>p.ativo!=='Não').sort((a,b)=>U.ord(a.nome,b.nome))},
  render(el){Crud.tela(el,{store:'profissionais',novo:'Nova profissional',vazio:'Nenhuma profissional cadastrada.',colunas:['Nome','Comissão','Ativa'],busca:r=>r.nome,linha:r=>[`<b>${UI.h(r.nome)}</b>`,r.comissao+'%',r.ativo==='Não'?'Não':'Sim'],
    campos:[{k:'nome',l:'Nome',req:1,wide:1},{k:'comissao',l:'Comissão (%)',type:'number'},{k:'ativo',l:'Ativa',t:'select',opts:[['Sim','Sim'],['Não','Não']]}],padrao:{comissao:0,ativo:'Sim'},
    salvar:async(v)=>{const c=+v.comissao||0;if(c<0||c>100)throw new Error('A comissão deve ficar entre 0 e 100%.');return{nome:v.nome,comissao:c,ativo:v.ativo}},
    bloqueio:async r=>{const a=(await DB.todos('atendimentos')).some(x=>x.profissionalId===r.id)||(await DB.todos('agendamentos')).some(x=>x.profissionalId===r.id);
      return a?'Esta profissional tem atendimentos ou agendamentos. Desative-a em vez de excluir.':((await DB.todos('profissionais')).length<2?'É preciso manter ao menos uma profissional.':'')}})}
};
