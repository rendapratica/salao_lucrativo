// Licença: guardada à parte dos dados (localStorage). Nunca apaga nem bloqueia os dados da oficina.
// Não há servidor: a chave é apenas registrada neste dispositivo, sem validação online.
const Licenca={
  K:'sl_licenca',instalar:null,
  obter(){try{return JSON.parse(localStorage.getItem(this.K))}catch(e){return null}},
  formatoOk(c){return/^[A-Za-z0-9-]{8,64}$/.test(c)},
  aviso(){return this.obter()?'':'<div class="aviso">Nenhuma chave de licença registrada neste dispositivo. O sistema continua funcionando normalmente. <a href="#licenca">Registrar chave</a></div>'},
  async render(el){
    const l=this.obter(),h=UI.h,inst=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
    el.innerHTML=`<div class="card"><h2>Licença</h2>
      <div class="aviso">A chave que você recebe da Hotmart fica registrada apenas neste dispositivo. Este aplicativo não tem servidor e <b>não valida a chave online</b>. Problemas com a licença nunca apagam os seus dados.</div>
      ${l?`<p>Chave registrada: <b>${h(l.chave.slice(0,4))}••••${h(l.chave.slice(-3))}</b> em ${new Date(l.em).toLocaleDateString('pt-BR')}.</p><div class="acoes"><button class="sec" id="rem">Remover chave</button></div>`:
      `<form id="fl"><label for="chave">Chave de licença</label><input id="chave" autocomplete="off" placeholder="Cole aqui a chave recebida"><div class="acoes"><button type="submit">Registrar chave</button></div></form>`}</div>
      <div class="card"><h2>Instalar o aplicativo</h2>${inst?'<p>O aplicativo já está instalado neste dispositivo.</p>':`<p>Instale para abrir como um programa, em tela cheia e com funcionamento offline.</p><div class="acoes"><button id="inst" ${this.instalar?'':'hidden'}>Instalar agora</button></div>
      <p><small>No Safari (Mac): menu Arquivo > Adicionar ao Dock. No iPhone/iPad: botão Compartilhar > Adicionar à Tela de Início. No Chrome/Edge: ícone de instalação na barra de endereço.</small></p>`}</div>`;
    const f=el.querySelector('#fl');
    if(f)f.onsubmit=e=>{e.preventDefault();const c=el.querySelector('#chave').value.trim();
      if(!this.formatoOk(c)){App.toast('Chave inválida: use de 8 a 64 letras, números ou hífens.',true);return}
      localStorage.setItem(this.K,JSON.stringify({chave:c,em:new Date().toISOString()}));App.toast('Chave registrada neste dispositivo.');this.render(el)};
    const r=el.querySelector('#rem');
    if(r)r.onclick=async()=>{if(await App.confirmar('Remover a chave deste dispositivo? Seus dados não serão apagados.')){localStorage.removeItem(this.K);this.render(el)}};
    const i=el.querySelector('#inst');
    if(i)i.onclick=async()=>{this.instalar.prompt();await this.instalar.userChoice;this.instalar=null;this.render(el)};
  }
};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();Licenca.instalar=e});
