const Pacotes={
  async ativosDoCliente(cid){return(await DB.todos('pacotesClientes')).filter(p=>p.clienteId===cid&&p.sessoesUsadas<p.sessoesTotal&&p.validade>=U.hoje())},
  async render(el){
    el.innerHTML=`<div id="m"></div><h2 style="margin:20px 0 8px">Pacotes vendidos</h2><div class="barra"><select id="fil"><option value="a">Ativos</option><option value="">Todos</option></select><button id="vender">Vender pacote</button></div><div id="v"></div>`;
    Crud.tela(el.querySelector('#m'),{store:'pacotes',novo:'Novo pacote',vazio:'Nenhum modelo de pacote. Ex.: 4 sessões de manicure com desconto.',colunas:['Pacote','Sessões','Preço','Validade'],busca:r=>r.nome,
      linha:r=>[`<b>${UI.h(r.nome)}</b><br><small>${UI.h(r.servicoNome)}</small>`,r.sessoes,U.R(r.preco),r.validadeDias+' dias'],
      campos:async()=>[{k:'nome',l:'Nome do pacote',req:1,wide:1},{k:'servicoId',l:'Serviço incluído',t:'select',req:1,opts:U.opts((await DB.todos('servicos')).sort((a,b)=>U.ord(a.nome,b.nome)))},{k:'sessoes',l:'Nº de sessões',type:'number',req:1},{k:'preco',l:'Preço do pacote (R$)',type:'number',req:1},{k:'validadeDias',l:'Validade (dias)',type:'number',req:1}],
      padrao:{sessoes:4,validadeDias:90},
      salvar:async v=>{const s=await DB.obter('servicos',v.servicoId);if(!s)throw new Error('Cadastre um serviço antes.');const n=Math.round(+v.sessoes),d=Math.round(+v.validadeDias),p=+v.preco;
        if(!(n>=1&&n<=100)||!(d>=1)||!(p>0))throw new Error('Confira sessões, preço e validade.');return{nome:v.nome,servicoId:s.id,servicoNome:s.nome,sessoes:n,preco:p,validadeDias:d}},
      bloqueio:async r=>(await DB.todos('pacotesClientes')).some(p=>p.pacoteId===r.id)?'Este pacote já foi vendido para clientes e não pode ser excluído.':''});
    const v=el.querySelector('#v'),fil=el.querySelector('#fil');
    const desenhar=async()=>{
      const cl=Object.fromEntries((await DB.todos('clientes')).map(c=>[c.id,c.nome])),h=U.hoje(),ls=(await DB.todos('pacotesClientes')).filter(p=>!fil.value||(p.sessoesUsadas<p.sessoesTotal&&p.validade>=h)).sort((a,b)=>b.compra.localeCompare(a.compra));
      v.innerHTML=UI.tabela(['Cliente','Pacote','Sessões','Validade','Pago',''],ls.map(p=>{const sit=p.sessoesUsadas>=p.sessoesTotal?'Esgotado':p.validade<h?'Vencido':'';
        return[UI.h(cl[p.clienteId]||'—'),UI.h(p.nome),`${p.sessoesUsadas}/${p.sessoesTotal}`,U.data(p.validade)+(sit?` <small class="atraso">${sit}</small>`:''),U.R(p.valorPago),`<button class="peq risco" data-id="${p.id}">Excluir</button>`]}),'Nenhum pacote vendido.');
    };
    fil.onchange=desenhar;
    v.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const p=await DB.obter('pacotesClientes',b.dataset.id);
      if(p.sessoesUsadas>0){App.toast('Este pacote já teve sessões usadas e não pode ser excluído.',true);return}
      if(await App.confirmar('Excluir esta venda de pacote? O valor sai do faturamento.')){await DB.remover('pacotesClientes',p.id);App.toast('Venda excluída.');desenhar()}};
    el.querySelector('#vender').onclick=async()=>{
      const cl=(await DB.todos('clientes')).sort((a,b)=>U.ord(a.nome,b.nome)),pk=await DB.todos('pacotes');
      if(!cl.length||!pk.length){App.toast('Cadastre clientes e ao menos um modelo de pacote.',true);return}
      UI.form('Vender pacote',[{k:'clienteId',l:'Cliente',t:'select',req:1,opts:U.opts(cl)},{k:'pacoteId',l:'Pacote',t:'select',req:1,opts:pk.map(p=>[p.id,`${p.nome} — ${U.R(p.preco)}`])},{k:'forma',l:'Forma de pagamento',t:'select',opts:Financeiro.formas()},{k:'compra',l:'Data da compra',type:'date',req:1}],{compra:U.hoje(),forma:'PIX'},async r=>{
        const p=pk.find(x=>x.id===r.pacoteId);await DB.salvar('pacotesClientes',{clienteId:r.clienteId,pacoteId:p.id,nome:p.nome,servicoId:p.servicoId,sessoesTotal:p.sessoes,sessoesUsadas:0,compra:r.compra,validade:U.add(r.compra,p.validadeDias),valorPago:p.preco,forma:r.forma});
        await DB.registrarHistorico('pacote vendido',p.nome);App.toast('Pacote vendido.');desenhar()});
    };
    desenhar();
  }
};
