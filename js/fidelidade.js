const Fid={
  async cfg(){return(await DB.obter('configuracoes','fidelidade'))||{id:'fidelidade',ativo:true,pontosPorReal:1,premioPontos:100,premioValor:20}},
  async saldos(){const s={};(await DB.todos('atendimentos')).forEach(a=>s[a.clienteId]=(s[a.clienteId]||0)+(a.pontosGanhos||0)-(a.pontosUsados||0));return s},
  async saldo(id){return(await this.saldos())[id]||0},
  async render(el){
    const c=await this.cfg(),cl=await DB.todos('clientes'),s=await this.saldos(),at=await DB.todos('atendimentos');
    const rank=cl.map(x=>({x,p:s[x.id]||0,v:at.filter(a=>a.clienteId===x.id).length})).sort((a,b)=>b.p-a.p).slice(0,15);
    el.innerHTML=`<form id="ff" class="card"><h2>Programa de fidelidade</h2><p>A cliente ganha pontos a cada atendimento pago e troca por desconto.</p><div class="grade">
      <div><label for="at">Programa</label><select id="at"><option value="1"${c.ativo?' selected':''}>Ativo</option><option value="0"${c.ativo?'':' selected'}>Desligado</option></select></div>
      <div><label for="pp">Pontos por R$ 1 pago</label><input id="pp" type="number" step="any" min="0" value="${c.pontosPorReal}"></div>
      <div><label for="pt">Pontos para um prêmio</label><input id="pt" type="number" step="1" min="1" value="${c.premioPontos}"></div>
      <div><label for="pv">Desconto do prêmio (R$)</label><input id="pv" type="number" step="any" min="0" value="${c.premioValor}"></div></div>
      <div class="acoes"><button type="submit">Salvar</button></div></form>
      <h2 style="margin:18px 0 8px">Clientes com mais pontos</h2>${UI.tabela(['Cliente','Atendimentos','Pontos'],rank.filter(r=>r.p>0||r.v>0).map(r=>[UI.h(r.x.nome),r.v,`<b>${r.p}</b>`]),'Ainda sem pontos. Eles aparecem após os primeiros atendimentos.')}`;
    el.querySelector('#ff').onsubmit=async e=>{e.preventDefault();const n={id:'fidelidade',ativo:el.querySelector('#at').value==='1',pontosPorReal:+el.querySelector('#pp').value,premioPontos:Math.round(+el.querySelector('#pt').value),premioValor:+el.querySelector('#pv').value};
      if(!(n.pontosPorReal>=0)||!(n.premioPontos>0)||!(n.premioValor>=0)){App.toast('Confira os valores informados.',true);return}
      await DB.salvar('configuracoes',n);App.toast('Fidelidade salva.');this.render(el)};
  }
};
