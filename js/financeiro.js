const Financeiro={
  FORMAS:['PIX','Dinheiro','Cartão de débito','Cartão de crédito','Transferência'],CATS:['Esmaltes e produtos','Aluguel','Energia','Internet','Marketing','Impostos','Outros'],
  formas(){return this.FORMAS.map(f=>[f,f])},
  async resumo(de,ate){
    const[at,pc,rec,des]=await Promise.all(['atendimentos','pacotesClientes','receitas','despesas'].map(s=>DB.todos(s))),no=d=>d&&d>=de&&d<=ate,a=at.filter(x=>no(x.data));
    const atend=a.reduce((s,x)=>s+x.total,0),pacotes=pc.filter(x=>no(x.compra)).reduce((s,x)=>s+x.valorPago,0),avulsas=rec.filter(x=>no(x.data)).reduce((s,x)=>s+x.valor,0);
    const despesas=des.filter(d=>d.pago&&no(d.dataPagamento)).reduce((s,d)=>s+d.valor,0),comissoes=a.reduce((s,x)=>s+(x.comissao||0),0),receita=atend+pacotes+avulsas;
    return{atend,pacotes,avulsas,receita,despesas,comissoes,qtd:a.length,lucro:receita-despesas-comissoes,apagar:des.filter(d=>!d.pago).reduce((s,d)=>s+d.valor,0)};
  },
  async render(el){
    const h=U.hoje();
    el.innerHTML=`<div class="barra"><div style="flex:1"><label for="de">De</label><input id="de" type="date" value="${h.slice(0,8)}01"></div><div style="flex:1"><label for="ate">Até</label><input id="ate" type="date" value="${h}"></div></div><div id="c2"></div>`;
    const c=el.querySelector('#c2'),de=el.querySelector('#de'),ate=el.querySelector('#ate'),R=U.R;
    const desenhar=async()=>{
      if(de.value>ate.value){App.toast('A data inicial não pode ser depois da final.',true);return}
      const s=await this.resumo(de.value,ate.value),[rec,des]=await Promise.all(['receitas','despesas'].map(x=>DB.todos(x))),no=d=>d&&d>=de.value&&d<=ate.value,btn=(a,id,t,cl='sec')=>`<button class="${cl} peq" data-a="${a}" data-id="${id}">${t}</button>`;
      const card=(t,v)=>`<div class="card metrica"><small>${t}</small><div class="total-os">${v}</div></div>`;
      c.innerHTML=`<div class="grade">${card('Receita no período',R(s.receita))}${card('Atendimentos ('+s.qtd+')',R(s.atend))}${card('Pacotes vendidos',R(s.pacotes))}${card('Receitas avulsas',R(s.avulsas))}${card('Despesas pagas',R(s.despesas))}${card('Comissões',R(s.comissoes))}${card('Lucro estimado',R(s.lucro))}${card('Contas a pagar (total)',R(s.apagar))}</div>
      <h2 style="margin:18px 0 8px">Receitas avulsas</h2><div class="barra"><button class="sec" data-a="novaRec">Nova receita avulsa</button></div>${UI.tabela(['Data','Descrição','Forma','Valor',''],rec.filter(r=>no(r.data)).sort((a,b)=>b.data.localeCompare(a.data)).map(r=>[U.data(r.data),UI.h(r.descricao),UI.h(r.forma),R(r.valor),btn('delr',r.id,'Excluir','risco')]),'Nenhuma receita avulsa no período.')}
      <h2 style="margin:18px 0 8px">Despesas</h2><div class="barra"><button class="sec" data-a="novaDes">Nova despesa</button></div>${UI.tabela(['Vencimento','Descrição','Categoria','Valor','Situação',''],des.filter(d=>!d.pago||no(d.dataPagamento)||no(d.vencimento)).sort((a,b)=>a.vencimento.localeCompare(b.vencimento)).map(d=>[U.data(d.vencimento),UI.h(d.descricao),UI.h(d.categoria),R(d.valor),d.pago?'Paga em '+U.data(d.dataPagamento):`<span class="${d.vencimento<h?'atraso':''}">${d.vencimento<h?'Vencida':'A pagar'}</span>`,
        `<div class="acoes">${d.pago?'':btn('pagar',d.id,'Pagar','')}${btn('edDes',d.id,'Editar')}${btn('deld',d.id,'Excluir','risco')}</div>`]),'Nenhuma despesa.')}`;
    };
    de.onchange=ate.onchange=desenhar;
    c.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a,id=b.dataset.id;
      if(a==='novaRec')this.novaReceita(desenhar);if(a==='novaDes')this.despesa({},desenhar);if(a==='edDes')this.despesa(await DB.obter('despesas',id),desenhar);if(a==='pagar')this.pagar(await DB.obter('despesas',id),desenhar);
      if(a==='delr'||a==='deld'){if(await App.confirmar('Excluir este lançamento? Esta ação não pode ser desfeita.')){await DB.remover(a==='delr'?'receitas':'despesas',id);App.toast('Excluído.');desenhar()}}};
    desenhar();
  },
  novaReceita(depois){UI.form('Nova receita avulsa',[{k:'descricao',l:'Descrição',req:1,wide:1},{k:'valor',l:'Valor (R$)',type:'number',req:1},{k:'forma',l:'Forma de pagamento',t:'select',opts:this.formas()},{k:'data',l:'Data',type:'date',req:1}],{data:U.hoje()},async r=>{
    if(!(+r.valor>0))throw new Error('Informe um valor maior que zero.');await DB.salvar('receitas',{...r,valor:+r.valor});App.toast('Receita registrada.');depois()})},
  despesa(d,depois){UI.form(d.id?'Editar despesa':'Nova despesa',[{k:'descricao',l:'Descrição',req:1,wide:1},{k:'categoria',l:'Categoria',list:this.CATS},{k:'valor',l:'Valor (R$)',type:'number',req:1},{k:'vencimento',l:'Vencimento',type:'date',req:1}],{vencimento:U.hoje(),...d},async r=>{
    if(!(+r.valor>0))throw new Error('Informe um valor maior que zero.');await DB.salvar('despesas',{pago:false,...d,...r,valor:+r.valor});App.toast('Despesa salva.');depois()})},
  pagar(d,depois){UI.form('Pagar — '+d.descricao,[{k:'forma',l:'Forma de pagamento',t:'select',opts:this.formas()},{k:'data',l:'Data do pagamento',type:'date',req:1}],{data:U.hoje()},async r=>{await DB.salvar('despesas',{...d,pago:true,dataPagamento:r.data,forma:r.forma});App.toast('Despesa paga.');depois()})}
};
