const App={
  telas:[
    {id:'inicio',nome:'Início',render:el=>Dashboard.render(el)},
    {id:'agenda',nome:'Agenda',render:el=>Agenda.render(el)},
    {id:'atendimentos',nome:'Atendimentos',render:el=>Atendimentos.render(el)},
    {id:'clientes',nome:'Clientes',render:el=>Clientes.render(el)},
    {id:'servicos',nome:'Serviços',render:el=>Servicos.render(el)},
    {id:'pacotes',nome:'Pacotes',render:el=>Pacotes.render(el)},
    {id:'fidelidade',nome:'Fidelidade',render:el=>Fid.render(el)},
    {id:'profissionais',nome:'Equipe e comissões',render:el=>Profissionais.render(el)},
    {id:'financeiro',nome:'Financeiro',render:el=>Financeiro.render(el)},
    {id:'relatorios',nome:'Relatórios',render:el=>Dashboard.relatorios(el)},
    {id:'config',nome:'Configurações',render:el=>Config.render(el)},
    {id:'backup',nome:'Backup e restauração',render:el=>App.backup(el)},
    {id:'licenca',nome:'Licença e instalação',render:el=>Licenca.render(el)}
  ],
  toast(msg,erro){const t=document.createElement('div');t.className='toast'+(erro?' erro':'');t.textContent=msg;document.getElementById('toasts').appendChild(t);setTimeout(()=>t.remove(),3500)},
  confirmar(msg){return new Promise(ok=>{const m=document.getElementById('modal');document.getElementById('modalTexto').textContent=msg;m.hidden=false;
    const f=v=>{m.hidden=true;ok(v)};document.getElementById('modalSim').onclick=()=>f(true);document.getElementById('modalNao').onclick=()=>f(false)})},
  ir(id){
    const t=this.telas.find(x=>x.id===id)||this.telas[0];
    document.getElementById('titulo').textContent=t.nome;
    document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('ativo',a.dataset.id===t.id));
    document.getElementById('menu').classList.remove('aberto');
    Promise.resolve(t.render(document.getElementById('view'))).catch(e=>this.toast(e.message,true));
  },
  statusBackup(){
    const d=Backup.diasDesdeUltimo(),u=Backup.ultimo();
    if(d===null)return`<div class="aviso">Você ainda não fez nenhum backup. Seus dados ficam apenas neste navegador: faça um backup agora.</div>`;
    const txt=`Último backup: ${new Date(u).toLocaleString('pt-BR')}.`;
    return d>=7?`<div class="aviso">${txt} Já se passaram ${d} dias — faça um novo backup.</div>`:`<div class="aviso ok">${txt}</div>`;
  },
  async inicio(el){
    const c=await Config.obter(),n=document.createElement('h2');n.textContent=c.nomeFantasia||'Bem-vindo ao Salão Lucrativo';
    el.innerHTML=this.statusBackup()+`<div class="card"><p>${c.nomeFantasia?'Os dados da oficina já estão configurados.':'Comece cadastrando os dados da sua oficina em Configurações.'}</p><p>Os dados ficam salvos neste dispositivo. Faça backups regularmente.</p></div>`;
    el.querySelector('.card').prepend(n);
  },
  async backup(el){
    el.innerHTML=this.statusBackup()+`<div class="card"><h2>Backup completo</h2><p>Salva todos os dados da oficina em um arquivo JSON.</p>
      <div class="acoes"><button id="bExp">Exportar backup</button></div></div>
      <div class="card"><h2>Restaurar backup</h2><p>Substitui os dados atuais pelos do arquivo. Antes de restaurar, o aplicativo baixa um backup dos dados atuais.</p>
      <input type="file" id="bArq" accept=".json,application/json"></div>
      <div class="card"><h2>Exportar relatórios CSV</h2><div class="acoes" id="csvs"></div></div>`;
    el.querySelector('#bExp').onclick=async()=>{try{await Backup.exportar();this.toast('Backup exportado.');this.ir('backup')}catch(e){this.toast(e.message,true)}};
    el.querySelector('#bArq').onchange=async e=>{
      const f=e.target.files[0];if(!f)return;
      try{
        const b=await Backup.lerArquivo(f);
        const n=Object.values(b.dados).reduce((s,l)=>s+l.length,0);
        if(!await this.confirmar(`Restaurar backup de ${new Date(b.exportadoEm).toLocaleString('pt-BR')} (${n} registros)? Os dados atuais serão substituídos.`)){e.target.value='';return}
        await Backup.exportar(); // backup de segurança antes de sobrescrever
        await Backup.restaurar(b);await Config.aplicarCor();this.toast('Backup restaurado.');this.ir('backup');
      }catch(x){this.toast(x.message,true)}
    };
    const nomes={clientes:'Clientes',servicos:'Serviços',agendamentos:'Agenda',atendimentos:'Atendimentos',pacotes:'Modelos de pacote',pacotesClientes:'Pacotes vendidos',receitas:'Receitas avulsas',despesas:'Despesas',profissionais:'Equipe',historico:'Histórico'};
    for(const[k,v]of Object.entries(nomes)){const b=document.createElement('button');b.className='sec';b.textContent=v;
      b.onclick=()=>Backup.csv(k).catch(x=>this.toast(x.message,true));el.querySelector('#csvs').appendChild(b)}
  },
  async iniciar(){
    const btn=document.getElementById('btnTema'),rot=()=>{btn.textContent=document.documentElement.dataset.tema==='escuro'?'☀ Tema claro':'☾ Tema escuro'};
    btn.onclick=()=>{const n=document.documentElement.dataset.tema==='escuro'?'claro':'escuro';document.documentElement.dataset.tema=n;try{localStorage.setItem('sl_tema',n)}catch(e){}rot()};rot();
    try{await DB.abrir();await Profissionais.garantir();if(navigator.storage?.persist)navigator.storage.persist()}
    catch(e){document.getElementById('view').innerHTML='<div class="aviso">Não foi possível abrir o armazenamento local. Verifique se o navegador permite IndexedDB (não use aba anônima).</div>';return}
    await Config.aplicarCor();
    const nav=document.getElementById('nav');
    this.telas.forEach(t=>{const a=document.createElement('a');a.textContent=t.nome;a.dataset.id=t.id;a.tabIndex=0;a.onclick=()=>{location.hash=t.id};
      a.onkeydown=e=>{if(e.key==='Enter')a.click()};nav.appendChild(a)});
    document.getElementById('btnMenu').onclick=()=>document.getElementById('menu').classList.toggle('aberto');
    window.onhashchange=()=>this.ir(location.hash.slice(1));
    this.ir(location.hash.slice(1));
    if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }
};
App.iniciar();
