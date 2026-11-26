const Backup={
  APP:'salao-lucrativo',VERSAO:1,
  ultimo(){return localStorage.getItem('sl_ultimo_backup')},
  diasDesdeUltimo(){const u=this.ultimo();return u?Math.floor((Date.now()-new Date(u))/864e5):null},
  baixar(nome,texto,tipo){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([texto],{type:tipo}));
    a.download=nome;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  },
  async gerar(){
    const dados={};for(const s of STORES)dados[s]=await DB.todos(s);
    return{app:this.APP,versao:this.VERSAO,exportadoEm:new Date().toISOString(),dados};
  },
  async exportar(){
    const b=await this.gerar();
    this.baixar(`backup-salao-lucrativo-${b.exportadoEm.slice(0,10)}.json`,JSON.stringify(b),'application/json');
    localStorage.setItem('sl_ultimo_backup',b.exportadoEm);return b;
  },
  validar(b){
    if(!b||typeof b!=='object')return'Arquivo inválido.';
    if(b.app!==this.APP)return'Este arquivo não é um backup do Salão Lucrativo.';
    if(typeof b.versao!=='number'||b.versao>this.VERSAO)return'Versão do backup não suportada por este aplicativo.';
    if(!b.dados||typeof b.dados!=='object')return'O backup não contém dados.';
    for(const s of STORES){
      if(!Array.isArray(b.dados[s]))return`Tabela ausente ou inválida no backup: ${s}.`;
      if(b.dados[s].some(r=>!r||!r.id))return`Há registros sem identificador em: ${s}.`;
    }
    return null;
  },
  async lerArquivo(arq){
    let b;try{b=JSON.parse(await arq.text())}catch{throw new Error('O arquivo não é um JSON válido.')}
    const e=this.validar(b);if(e)throw new Error(e);return b;
  },
  async restaurar(b){ // chamar somente após confirmação do usuário
    const e=this.validar(b);if(e)throw new Error(e);
    const d=await DB.abrir();
    await new Promise((ok,erro)=>{ // transação única: se falhar, nada é alterado
      const t=d.transaction(STORES,'readwrite');
      STORES.forEach(s=>{const o=t.objectStore(s);o.clear();b.dados[s].forEach(r=>o.put(r));});
      t.oncomplete=ok;t.onerror=t.onabort=()=>erro(t.error);
    });
    await DB.registrarHistorico('restauracao','Backup de '+b.exportadoEm);
  },
  async csv(store){
    const l=await DB.todos(store);if(!l.length)throw new Error('Não há registros para exportar.');
    const cols=[...new Set(l.flatMap(r=>Object.keys(r)))];
    const esc=v=>{v=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);return/[",;\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
    const txt='\ufeff'+[cols.join(';'),...l.map(r=>cols.map(c=>esc(r[c])).join(';'))].join('\n');
    this.baixar(`${store}-${new Date().toISOString().slice(0,10)}.csv`,txt,'text/csv;charset=utf-8');
  }
};
