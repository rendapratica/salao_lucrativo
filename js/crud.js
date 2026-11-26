// Tela padrão de cadastro: lista + busca + formulário + exclusão com confirmação.
const Crud={
  tela(el,o){
    el.innerHTML=`<div class="barra"><input id="busca" type="search" placeholder="Pesquisar"><button id="novo">${o.novo}</button></div><div id="lista"></div>`;
    const lista=el.querySelector('#lista'),busca=el.querySelector('#busca');
    const desenhar=async()=>{
      const ctx=o.ctx?await o.ctx():{},q=UI.norm(busca.value),todos=(await DB.todos(o.store)).sort(o.ordem||((a,b)=>U.ord(a.nome,b.nome)));
      const ls=todos.filter(r=>!q||UI.norm(o.busca(r)).includes(q));
      lista.innerHTML=UI.tabela(o.colunas.concat(['']),ls.map(r=>[...o.linha(r,ctx),`<div class="acoes">${(o.acoes||[]).map(a=>`<button class="sec peq" data-a="${a[0]}" data-id="${r.id}">${a[1]}</button>`).join('')}<button class="sec peq" data-a="ed" data-id="${r.id}">Editar</button><button class="peq risco" data-a="ex" data-id="${r.id}">Excluir</button></div>`]),todos.length?'Nada encontrado.':o.vazio);
    };
    busca.oninput=desenhar;
    el.querySelector('#novo').onclick=()=>this.editar(o,{},desenhar);
    lista.onclick=async e=>{const b=e.target.closest('button');if(!b)return;const r=await DB.obter(o.store,b.dataset.id);if(!r)return;
      if(b.dataset.a==='ed')this.editar(o,r,desenhar);else if(b.dataset.a==='ex')this.excluir(o,r,desenhar);else o.acao(b.dataset.a,r,desenhar)};
    desenhar();
  },
  async editar(o,r,depois){
    const campos=typeof o.campos==='function'?await o.campos(r):o.campos;
    UI.form(r.id?'Editar':o.novo,campos,{...(o.padrao||{}),...r},async v=>{const reg=await o.salvar(v,r);await DB.salvar(o.store,{...r,...reg});await DB.registrarHistorico(r.id?'editado':'criado',o.store+': '+(reg.nome||''));App.toast('Salvo.');depois()});
  },
  async excluir(o,r,depois){
    const msg=o.bloqueio?await o.bloqueio(r):'';if(msg){App.toast(msg,true);return}
    if(!await App.confirmar(`Excluir "${r.nome||'este registro'}"? Esta ação não pode ser desfeita.`))return;
    if(o.aoExcluir)await o.aoExcluir(r);await DB.remover(o.store,r.id);await DB.registrarHistorico('excluído',o.store+': '+(r.nome||''));App.toast('Excluído.');depois();
  }
};
