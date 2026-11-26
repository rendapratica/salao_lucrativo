const UI={
  h(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')},
  norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()},
  abrir(html){const d=document.getElementById('dlg');d.innerHTML=html;if(!d.open)d.showModal();return d},
  fechar(){const d=document.getElementById('dlg');if(d.open)d.close()},
  info(titulo,html){const d=this.abrir(`<h2>${this.h(titulo)}</h2>${html}<div class="acoes"><button class="sec" data-x>Fechar</button></div>`);d.querySelector('[data-x]').onclick=()=>this.fechar()},
  form(titulo,campos,v,salvar,depois){
    const h=this.h;
    const campo=c=>{const id='f_'+c.k,val=h(v[c.k]);let i;
      if(c.t==='select')i=`<select id="${id}">${c.opts.map(([a,b])=>`<option value="${h(a)}"${a===v[c.k]?' selected':''}>${h(b)}</option>`).join('')}</select>`;
      else if(c.t==='textarea')i=`<textarea id="${id}" rows="2">${val}</textarea>`;
      else i=`<input id="${id}" value="${val}"${c.list?` list="${id}_l"`:''}${c.type?` type="${c.type}"`:''}${c.type==='number'?' step="any" min="0"':''}>`+(c.list?`<datalist id="${id}_l">${c.list.map(x=>`<option value="${h(x)}">`).join('')}</datalist>`:'');
      return`<div${c.wide?' class="larga"':''}><label for="${id}">${h(c.l)}${c.req?' *':''}</label>${i}</div>`};
    const d=this.abrir(`<form><h2>${h(titulo)}</h2><div class="grade">${campos.map(campo).join('')}</div><div id="extra"></div><div class="acoes"><button type="submit">Salvar</button><button type="button" class="sec" data-x>Cancelar</button></div></form>`);
    d.querySelector('[data-x]').onclick=()=>this.fechar();
    if(depois)depois(d.querySelector('#extra'));
    d.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const r={};
      for(const c of campos){r[c.k]=d.querySelector('#f_'+c.k).value.trim();if(c.req&&!r[c.k]){App.toast(`Preencha: ${c.l}.`,true);return}}
      try{await salvar(r);this.fechar()}catch(x){App.toast(x.message,true)}
    };
  },
  tabela(cols,linhas,vazio){
    if(!linhas.length)return`<div class="card vazio">${this.h(vazio)}</div>`;
    return`<div class="tabela card" style="padding:0"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${linhas.map(l=>`<tr>${l.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
};

UI.fotos=function(box,fotos){
  box.innerHTML=`<label for="arqFotos">Fotografias</label><input type="file" id="arqFotos" accept="image/*" multiple><div class="fotos">${fotos.map((f,i)=>`<div><img src="${f.data}" alt="Foto ${i+1}"><button type="button" class="risco" data-i="${i}" aria-label="Remover foto">×</button></div>`).join('')}</div>`;
  box.querySelector('#arqFotos').onchange=async ev=>{for(const a of ev.target.files){try{fotos.push({data:await Config.comprimirImagem(a,1000,.7)})}catch(er){App.toast(er.message,true)}}UI.fotos(box,fotos)};
  box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{fotos.splice(+b.dataset.i,1);UI.fotos(box,fotos)});
};
