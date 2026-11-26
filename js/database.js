const DB_NOME='salao_lucrativo',DB_VERSAO=1;
const STORES=['clientes','servicos','profissionais','agendamentos','atendimentos','pacotes','pacotesClientes','receitas','despesas','historico','configuracoes','imagens'];
const DB={
  _db:null,
  abrir(){
    if(this._db)return Promise.resolve(this._db);
    return new Promise((ok,erro)=>{
      const r=indexedDB.open(DB_NOME,DB_VERSAO);
      r.onupgradeneeded=e=>{ // migrações futuras: blocos "if(e.oldVersion<N)"
        const d=r.result;
        STORES.forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});});
      };
      r.onsuccess=()=>{this._db=r.result;this._db.onversionchange=()=>{this._db.close();this._db=null};ok(this._db);};
      r.onerror=()=>erro(r.error);
    });
  },
  async _tx(store,modo,fn){
    const d=await this.abrir();
    return new Promise((ok,erro)=>{
      const t=d.transaction(store,modo),s=t.objectStore(store);let res;
      const rq=fn(s);if(rq)rq.onsuccess=()=>{res=rq.result};
      t.oncomplete=()=>ok(res);t.onerror=t.onabort=()=>erro(t.error);
    });
  },
  uuid(){return crypto.randomUUID?crypto.randomUUID():'id-'+Date.now().toString(36)+Math.random().toString(36).slice(2)},
  todos(s){return this._tx(s,'readonly',o=>o.getAll())},
  obter(s,id){return this._tx(s,'readonly',o=>o.get(id))},
  async salvar(s,reg){
    const agora=new Date().toISOString();
    if(!reg.id){reg.id=this.uuid();reg.criadoEm=agora;}
    reg.atualizadoEm=agora;
    await this._tx(s,'readwrite',o=>o.put(reg));return reg;
  },
  remover(s,id){return this._tx(s,'readwrite',o=>o.delete(id))},
  limpar(s){return this._tx(s,'readwrite',o=>o.clear())},
  registrarHistorico(acao,detalhe){return this.salvar('historico',{acao,detalhe,data:new Date().toISOString()})}
};
