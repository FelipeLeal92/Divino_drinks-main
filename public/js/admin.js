document.addEventListener('DOMContentLoaded', () => {
  const sections = {
    hero: ['Página inicial', 'Edite a apresentação da Divino Drinks.'],
    about: ['Quem somos', 'Conte a história e os diferenciais da Divino.'],
    services: ['Serviços', 'Apresente cada experiência oferecida no seu evento.'],
    testimonials: ['Depoimentos', 'Compartilhe as experiências dos seus clientes.'],
    gallery: ['Galeria', 'Organize os álbuns, escolha as capas e ordene as fotos.'],
    footer: ['Contato e rodapé', 'Mantenha os contatos do site sempre atualizados.']
  };
  const $ = id => document.getElementById(id);
  const escape = value => ContentUtils.escapeHtml(value);
  const image = value => escape(ContentUtils.imageUrl(value));
  let content = {};
  let active = 'hero';
  let sequence = 0;
  let ready = false;
  let saving = false;
  let uploads = 0;
  let removed = null;
  const baseline = {};
  const dirty = new Set();
  const panel = key => $(`panel-${key}`);

  function plain(value) {
    const template = document.createElement('template');
    template.innerHTML = ContentUtils.richText(value);
    template.content.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    template.content.querySelectorAll('p').forEach(p => p.append('\n'));
    return template.content.textContent.trim();
  }
  function field(name, label, value = '', options = {}) {
    const id = options.id || `field-${++sequence}`;
    const original = options.rich ? ` data-original="${escape(value)}"` : '';
    const shown = options.rich ? plain(value) : value;
    const attributes = `id="${id}" name="${name}"${original}${options.max ? ` maxlength="${options.max}"` : ''}`;
    const control = options.rows
      ? `<textarea ${attributes} rows="${options.rows}">${escape(shown)}</textarea>`
      : `<input ${attributes} type="${options.type || 'text'}" value="${escape(shown)}"${options.inputmode ? ` inputmode="${options.inputmode}"` : ''}>`;
    return `<div class="field"><label for="${id}">${label}</label>${control}${options.hint ? `<p class="hint">${options.hint}</p>` : ''}</div>`;
  }
  function picker(name, value, label = 'Imagem', id = `image-${++sequence}`) {
    return `<div class="field"><label for="${id}-file">${label}</label><div class="image-picker">
      ${value ? `<img class="picker-image" src="${image(value)}" alt="Imagem atual de ${escape(label.toLowerCase())}">` : '<div class="picker-image" aria-hidden="true"></div>'}
      <div class="picker-info"><p class="file-name">${escape(value ? value.split('/').pop() : 'Nenhuma imagem selecionada')}</p>
        <p class="hint" id="${id}-hint">WebP, JPG ou PNG · até 2 MB</p>
        <input type="hidden" id="${id}-url" name="${name}" value="${escape(value || '')}">
        <input class="file-input" type="file" id="${id}-file" accept="image/webp,image/jpeg,image/png" data-upload="${id}-url" aria-describedby="${id}-hint">
      </div></div><p class="upload-status" role="status"></p></div>`;
  }
  function addButton(kind, label) {
    return `<button type="button" class="button secondary" data-add="${kind}">${label}</button>`;
  }
  function itemActions(noun) {
    return `<div class="item-actions"><button type="button" class="button quiet small-action" data-move="-1" aria-label="Mover ${noun} para cima">↑</button><button type="button" class="button quiet small-action" data-move="1" aria-label="Mover ${noun} para baixo">↓</button><button type="button" class="button danger small-action" data-remove aria-label="Remover ${noun}">Remover</button></div>`;
  }
  function badge(data = {}) {
    const id = `badge-${++sequence}`;
    const icons = { star: 'Estrela', award: 'Medalha', heart: 'Coração', 'glass-cheers': 'Brinde', cocktail: 'Coquetel', check: 'Conferido' };
    if (data.icon && !icons[data.icon]) icons[data.icon] = data.icon;
    return `<div class="badge-item" data-item="badge"><div class="field"><label for="${id}">Símbolo</label><select id="${id}" name="icon">${Object.entries(icons).map(([value,label]) => `<option value="${escape(value)}"${value === (data.icon || 'star') ? ' selected' : ''}>${label}</option>`).join('')}</select></div>${field('text', 'Diferencial', data.text, { max: 100 })}<button type="button" class="button danger badge-remove" data-remove>Remover</button></div>`;
  }
  function card(kind, data = {}) {
    const title = kind === 'about' ? 'Bloco de apresentação' : kind === 'services' ? 'Serviço' : 'Depoimento';
    return `<article class="collection-item" data-item="${kind}"><div class="item-heading"><h3>${escape(data.title || data.author || `Novo ${title.toLowerCase()}`)}</h3>${itemActions(title.toLowerCase())}</div>
      ${kind !== 'about' ? picker('image', data.image, kind === 'testimonials' ? 'Foto do cliente' : 'Foto do serviço') : ''}
      ${kind === 'testimonials' ? field('quote', 'Depoimento', data.quote, { rows: 5, max: 2000 }) + field('author', 'Nome do cliente', data.author, { max: 100 })
        : field('title', 'Título', data.title, { max: 100 }) + field('text', 'Descrição', data.text, { rows: 5, max: kind === 'about' ? 500 : 1000, rich: true })}
      </article>`;
  }
  function photo(url) {
    return `<div class="photo-item" data-item="photo"><img src="${image(url)}" alt="Foto do álbum" loading="lazy"><input type="hidden" name="photo" value="${escape(url)}"><div class="photo-caption"><span class="photo-position">Foto</span><button type="button" class="button quiet small-action" data-cover>Usar capa</button></div><div class="photo-actions"><button type="button" class="button quiet" data-move="-1" aria-label="Mover foto para antes">Antes</button><button type="button" class="button quiet" data-move="1" aria-label="Mover foto para depois">Depois</button><button type="button" class="button danger" data-remove>Remover</button></div></div>`;
  }
  function album(data = {}) {
    const id = ++sequence;
    return `<article class="collection-item album-item" data-item="album" data-album-id="${id}"><div class="item-heading"><h3>${escape(data.name || 'Novo álbum')}</h3>${itemActions('álbum')}</div>
      ${field('name', 'Nome do álbum', data.name, { max:100 })}${picker('thumbnail', data.thumbnail, 'Capa do álbum')}
      <h3>Fotos do álbum</h3><p class="hint">Use Antes e Depois para definir a ordem. O site acompanha essa sequência.</p>
      <div class="album-photos" id="album-${id}-photos">${(data.photos || []).map(photo).join('')}</div>
      <div class="field"><label for="album-${id}-files">Adicionar fotos</label><input id="album-${id}-files" class="file-input" type="file" multiple accept="image/webp,image/jpeg,image/png" data-upload-photos="album-${id}-photos"><p class="hint">WebP, JPG ou PNG · até 2 MB por foto · máximo de 100 fotos</p><p class="upload-status" role="status"></p></div></article>`;
  }

  function renderSection(key) {
    const data = content[key] || {};
    let html = '';
    if (key === 'hero') html = `<div class="editor-heading"><h2>Apresentação</h2><p>O primeiro contato do visitante com a Divino.</p></div>
      ${picker('background_image', data.background_image, 'Imagem de capa', 'hero-bg')}
      ${field('title','Título principal',data.title,{id:'hero-title',rows:3,max:200,rich:true,hint:'Use Enter para quebrar uma linha.'})}
      ${field('subtitle','Descrição curta',data.subtitle,{id:'hero-subtitle',rows:4,max:500})}
      <div class="content-block"><h2>Contatos e redes</h2>${field('instagram_url','Link do Instagram',data.instagram_url,{type:'url'})}${field('whatsapp_phone','WhatsApp',data.whatsapp_phone,{inputmode:'tel',max:15,hint:'Código do país, DDD e número, apenas números. Exemplo: 5571999998888.'})}</div>
      <div class="content-block"><h2>Diferenciais</h2><p class="hint">Destaques curtos apresentados abaixo do título.</p><div id="hero-badges-list">${(data.badges || []).map(badge).join('')}</div>${addButton('badge','Adicionar diferencial')}</div>`;
    if (key === 'about') html = `<div class="editor-heading"><h2>Sobre a Divino</h2></div>${field('description','Apresentação',data.description,{id:'about-desc',rows:8,max:2000,rich:true})}<div class="content-block"><h2>Blocos de apresentação</h2><div id="about-cards">${(data.cards || []).map(item => card('about',item)).join('')}</div>${addButton('about','Adicionar bloco')}</div>`;
    if (key === 'services') html = `<div class="editor-heading"><h2>Experiências que você oferece</h2><p>Reordene os serviços com os botões de mover.</p></div><div id="services-cards">${(data.cards || []).map(item => card('services',item)).join('')}</div>${addButton('services','Adicionar serviço')}`;
    if (key === 'testimonials') html = `<div class="editor-heading"><h2>Experiências dos clientes</h2><p>Confira a relação entre a foto, o nome e o depoimento.</p></div><div id="testimonials-list">${(data.testimonials || []).map(item => card('testimonials',item)).join('')}</div>${addButton('testimonials','Adicionar depoimento')}`;
    if (key === 'gallery') html = `<div class="editor-heading"><h2>Álbuns de fotos</h2><p>Capas recomendadas: 400 × 400 px. Fotos: 1200 × 800 px.</p></div><div id="albums-list">${(data.albums || []).map(album).join('')}</div><button id="add-album" type="button" class="button secondary" data-add="album">Adicionar álbum</button>`;
    if (key === 'footer') html = `<div class="editor-heading"><h2>Informações de contato</h2></div>${field('description','Descrição no rodapé',data.description,{rows:3,max:500})}${field('contact','E-mail de contato',data.contact,{type:'email'})}${field('phone','Telefone exibido',data.phone,{max:50,inputmode:'tel'})}`;
    $(`editor-${key}`).innerHTML = html;
    refreshCollectionState(key);
    baseline[key] = JSON.stringify(readSection(key));
  }
  function value(container, name) {
    const input = container.querySelector(`[name="${name}"]`);
    if (!input) return '';
    // Preserve existing emphasis markup when an editor leaves its visible text unchanged.
    if (input.hasAttribute('data-original') && input.value === plain(input.dataset.original)) return input.dataset.original;
    return input.value;
  }
  function readSection(key) {
    const root = panel(key);
    const data = { ...(content[key] || {}) };
    const entries = kind => [...root.querySelectorAll(`[data-item="${kind}"]`)];
    if (key === 'hero') {
      ['background_image','title','subtitle','instagram_url','whatsapp_phone'].forEach(name => { data[name] = value(root,name); });
      if (!data.instagram_url) delete data.instagram_url;
      if (!data.whatsapp_phone) delete data.whatsapp_phone;
      data.badges = entries('badge').map(item => ({ icon:value(item,'icon'), text:value(item,'text') }));
    }
    if (key === 'about') {
      data.description = value(root,'description');
      data.cards = entries('about').map(item => ({ title:value(item,'title'), text:value(item,'text') }));
    }
    if (key === 'services') data.cards = entries('services').map(item => ({ image:value(item,'image'), title:value(item,'title'), text:value(item,'text') }));
    if (key === 'testimonials') data.testimonials = entries('testimonials').map(item => ({ image:value(item,'image'), quote:value(item,'quote'), author:value(item,'author') }));
    if (key === 'gallery') data.albums = entries('album').map(item => ({ name:value(item,'name'), thumbnail:value(item,'thumbnail'), photos:[...item.querySelectorAll('[name="photo"]')].map(input => input.value) }));
    if (key === 'footer') ['description','contact','phone'].forEach(name => { data[name] = value(root,name); });
    return data;
  }
  function refreshCollectionState(key) {
    const root = panel(key);
    root.querySelectorAll('.album-item').forEach(item => {
      const cover = value(item,'thumbnail');
      item.querySelectorAll('.photo-item').forEach((photo,index) => {
        photo.querySelector('.photo-position').textContent = `Foto ${index+1}`;
        photo.classList.toggle('is-cover',value(photo,'photo') === cover);
        photo.querySelector('[data-cover]').textContent = value(photo,'photo') === cover ? 'Capa atual' : 'Usar capa';
      });
    });
    root.querySelectorAll('[data-move]').forEach(button => {
      const item = button.closest('[data-item]');
      button.disabled = Number(button.dataset.move) < 0 ? !item.previousElementSibling : !item.nextElementSibling;
    });
  }
  function updateDirty(key = active) {
    if (JSON.stringify(readSection(key)) === baseline[key]) dirty.delete(key); else dirty.add(key);
    refreshCollectionState(key);
    updateStatus();
    if (key === active) renderPreview();
  }
  function updateStatus(message) {
    $('save-current').disabled = !ready || saving || uploads > 0 || !dirty.has(active);
    $('discard-current').disabled = !ready || saving || uploads > 0 || !dirty.has(active);
    $('save-current').textContent = saving ? 'Salvando…' : 'Salvar alterações';
    $('save-status').textContent = message || (uploads ? 'Enviando imagens…' : dirty.has(active) ? 'Alterações não salvas' : 'Nenhuma alteração pendente nesta seção');
    $('save-status').classList.toggle('has-changes',dirty.has(active));
    const other = dirty.size - Number(dirty.has(active));
    $('pending-count').textContent = other ? `${other} ${other>1?'outras seções':'outra seção'} com alterações não salvas` : '';
    document.querySelectorAll('[data-section]').forEach(button => {
      button.classList.toggle('is-dirty',dirty.has(button.dataset.section));
      button.disabled = saving;
    });
    $('section-picker').disabled = saving;
    [...$('section-picker').options].forEach(option => { option.textContent = sections[option.value][0] + (dirty.has(option.value) ? ' • não salvo' : ''); });
  }
  function showSection(key, focus = false) {
    if (!sections[key] || saving) return;
    active = key;
    document.querySelectorAll('[data-panel]').forEach(element => { element.hidden = element.dataset.panel !== key; });
    document.querySelectorAll('[data-section]').forEach(button => {
      if (button.dataset.section === key) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    $('section-title').textContent = sections[key][0];
    $('section-description').textContent = sections[key][1];
    $('section-picker').value = key;
    $('feedback').hidden = true;
    updateStatus();
    renderPreview();
    if (focus) { $('section-title').tabIndex = -1; $('section-title').focus(); }
  }
  function previewImage(url, alt) { return url ? `<img src="${image(url)}" alt="${escape(alt)}">` : ''; }
  function renderPreview() {
    if (!ready) return;
    const data = readSection(active);
    const rich = value => ContentUtils.richText(value);
    let html = '';
    if (active === 'hero') html = `<div class="preview-hero">${previewImage(data.background_image,'Imagem de capa')}<div><h3>${rich(plain(data.title))}</h3><p>${escape(data.subtitle)}</p><span class="preview-cta">Solicitar orçamento</span></div></div>`;
    if (active === 'about') html = `<div class="preview-content"><h3>A Divino</h3><p>${rich(data.description)}</p>${data.cards.map(item => `<div class="preview-entry"><h3>${escape(item.title)}</h3><p>${rich(item.text)}</p></div>`).join('')}</div>`;
    if (active === 'services') html = `<div class="preview-content">${data.cards.length ? data.cards.map(item => `<div class="preview-entry">${previewImage(item.image,item.title)}<h3>${escape(item.title || 'Novo serviço')}</h3><p>${rich(item.text)}</p></div>`).join('') : '<p>Adicione o primeiro serviço para ver a prévia.</p>'}</div>`;
    if (active === 'testimonials') html = `<div class="preview-content">${data.testimonials.length ? data.testimonials.map(item => `<div class="preview-entry">${previewImage(item.image,item.author)}<blockquote>${escape(item.quote)}</blockquote><h3>${escape(item.author || 'Nome do cliente')}</h3></div>`).join('') : '<p>Adicione um depoimento para ver a prévia.</p>'}</div>`;
    if (active === 'gallery') html = `<div class="preview-content preview-grid">${data.albums.length ? data.albums.map(item => `<div class="preview-album">${previewImage(item.thumbnail,item.name)}<h3>${escape(item.name || 'Novo álbum')}</h3><p>${item.photos.length} foto${item.photos.length === 1 ? '' : 's'}</p></div>`).join('') : '<p>Adicione o primeiro álbum.</p>'}</div>`;
    if (active === 'footer') html = `<div class="preview-content"><h3>Divino Drinks</h3><p>${escape(data.description)}</p><div class="preview-entry"><h3>Contato</h3><p>${escape(data.contact)}</p><p>${escape(data.phone)}</p></div></div>`;
    $('section-preview').innerHTML = html;
  }
  function errorMessage(message, login = false) {
    $('feedback').textContent = message;
    $('feedback').hidden = false;
    if (login) {
      const link = document.createElement('a');
      link.href = '/login.html'; link.target = '_blank'; link.rel = 'noopener'; link.textContent = ' Entrar novamente em outra aba';
      $('feedback').append(link);
    }
  }
  async function loadContent() {
    $('loading').hidden = false; $('retry-load').hidden = true; $('feedback').hidden = true;
    try {
      const response = await fetch('/api/content');
      if (!response.ok) throw new Error('Não foi possível carregar o conteúdo. Tente novamente.');
      content = await response.json();
      Object.keys(sections).forEach(renderSection);
      ready = true;
      $('editing-layout').hidden = false;
      showSection(active);
    } catch (error) { errorMessage(error.message); $('retry-load').hidden = false; }
    finally { $('loading').hidden = true; }
  }
  async function save() {
    if (!ready || saving || uploads || !dirty.has(active)) return;
    const key = active;
    const controls = [...panel(key).querySelectorAll('input:not([type=hidden]):not([type=file]),textarea,select')];
    controls.forEach(input => input.removeAttribute('aria-invalid'));
    const invalid = controls.find(input => !input.checkValidity());
    if (invalid) { invalid.setAttribute('aria-invalid','true'); invalid.reportValidity(); invalid.focus(); return; }
    saving = true; $('editor-form').inert = true; $('feedback').hidden = true; updateStatus('Salvando alterações…');
    const data = readSection(key);
    try {
      const response = await fetch(`/api/content/${key}`,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        Object.keys(result.details || {}).forEach(name => panel(key).querySelector(`[name="${name}"]`)?.setAttribute('aria-invalid','true'));
        errorMessage(Object.values(result.details || {}).flat().join(' ') || result.error || 'Não foi possível salvar. Seus textos continuam na edição.',response.status === 401);
        return;
      }
      content[key] = structuredClone(data);
      baseline[key] = JSON.stringify(data);
      dirty.delete(key);
      removed = null; $('undo-message').hidden = true;
    } catch { errorMessage('A conexão falhou. Suas alterações continuam aqui. Tente salvar novamente.'); }
    finally {
      saving = false; $('editor-form').inert = false;
      updateStatus(dirty.has(key) ? 'Não salvo. Suas alterações continuam na edição.' : 'Alterações salvas no site');
    }
  }
  function removeItem(button) {
    const node = button.closest('[data-item]');
    removed = { node, parent:node.parentElement, next:node.nextElementSibling, key:active };
    node.remove();
    $('undo-text').textContent = 'Item removido da edição. Salve para atualizar o site.';
    $('undo-message').hidden = false;
    updateDirty();
  }
  function addItem(kind) {
    const map = {
      badge:['hero-badges-list',badge,10],about:['about-cards',() => card('about'),10],
      services:['services-cards',() => card('services'),20],testimonials:['testimonials-list',() => card('testimonials'),50],album:['albums-list',album,20]
    };
    const [id,render,limit] = map[kind];
    if ($(id).children.length >= limit) { errorMessage(`Esta seção aceita até ${limit} itens.`); return; }
    $(id).insertAdjacentHTML('beforeend',render());
    $(id).lastElementChild.querySelector('input:not([type=hidden]):not([type=file]),textarea,select')?.focus();
    updateDirty();
  }
  async function uploadFiles(input) {
    if (!input.files.length) return;
    const files = [...input.files];
    const key = input.closest('[data-panel]').dataset.panel;
    const fieldRoot = input.closest('.field');
    const status = fieldRoot.querySelector('.upload-status');
    const target = input.dataset.uploadPhotos ? $(input.dataset.uploadPhotos) : null;
    if (target && target.children.length + files.length > 100) { status.textContent = 'O álbum aceita até 100 fotos.'; input.value = ''; return; }
    if (files.some(file => !['image/webp','image/jpeg','image/png'].includes(file.type) || file.size > 2*1024*1024)) {
      status.textContent = 'Selecione WebP, JPG ou PNG, com até 2 MB por foto.'; input.value = ''; return;
    }
    uploads++; input.disabled = true; updateStatus();
    try {
      for (let index=0;index<files.length;index++) {
        status.textContent = `Enviando ${index+1} de ${files.length}…`;
        const body = new FormData(); body.append('image',files[index]);
        const response = await fetch('/api/upload',{method:'POST',body});
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a foto. Tente novamente.');
        if (target) target.insertAdjacentHTML('beforeend',photo(result.url));
        else {
          $(input.dataset.upload).value = result.url;
          const picker = input.closest('.image-picker');
          let preview = picker.querySelector('img');
          if (!preview) { preview = document.createElement('img'); preview.className = 'picker-image'; preview.alt = 'Imagem selecionada'; picker.querySelector('.picker-image').replaceWith(preview); }
          preview.src = ContentUtils.imageUrl(result.url);
          picker.querySelector('.file-name').textContent = files[index].name;
        }
        updateDirty(key);
      }
      status.textContent = `${files.length === 1 ? 'Imagem enviada.' : `${files.length} imagens enviadas.`} Salve a seção para atualizar o site.`;
    } catch(error) { status.textContent = error.message; }
    finally { uploads--; input.disabled = false; input.value = ''; updateStatus(); }
  }
  $('editor-form').addEventListener('submit',event => { event.preventDefault(); save(); });
  $('editor-form').addEventListener('input',event => {
    const key = event.target.closest('[data-panel]')?.dataset.panel;
    if (key) { event.target.removeAttribute('aria-invalid'); updateDirty(key); }
  });
  $('editor-form').addEventListener('change',event => {
    if (event.target.type === 'file') uploadFiles(event.target);
    else updateDirty(event.target.closest('[data-panel]').dataset.panel);
  });
  document.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (uploads && (button.hasAttribute('data-remove') || button.dataset.add || button.dataset.move || button.hasAttribute('data-cover'))) {
      errorMessage('Aguarde o envio das imagens antes de reorganizar ou remover itens.');
      return;
    }
    if (button.dataset.section) showSection(button.dataset.section,true);
    else if (button.dataset.add) addItem(button.dataset.add);
    else if (button.hasAttribute('data-remove')) removeItem(button);
    else if (button.dataset.move) {
      const item = button.closest('[data-item]');
      const sibling = Number(button.dataset.move) < 0 ? item.previousElementSibling : item.nextElementSibling;
      if (sibling) { if (Number(button.dataset.move)<0) sibling.before(item); else sibling.after(item); updateDirty(); button.focus(); }
    } else if (button.hasAttribute('data-cover')) {
      const item = button.closest('.album-item');
      const url = value(button.closest('.photo-item'),'photo');
      item.querySelector('[name=thumbnail]').value = url;
      item.querySelector('.image-picker img')?.setAttribute('src',ContentUtils.imageUrl(url));
      item.querySelector('.file-name').textContent = url.split('/').pop();
      updateDirty();
    }
  });
  $('section-picker').addEventListener('change',event => showSection(event.target.value));
  $('toggle-preview').addEventListener('click',() => {
    const open = document.body.classList.toggle('preview-open');
    $('toggle-preview').setAttribute('aria-expanded',String(open));
    $('toggle-preview').textContent = open ? 'Ocultar prévia' : 'Mostrar prévia';
    if (open) $('preview-pane').scrollIntoView({block:'start'});
  });
  $('discard-current').addEventListener('click',() => { if (!saving && !uploads) $('discard-dialog').showModal(); });
  $('cancel-discard').addEventListener('click',() => $('discard-dialog').close());
  $('confirm-discard').addEventListener('click',() => {
    renderSection(active); dirty.delete(active); removed = null; $('undo-message').hidden = true;
    $('discard-dialog').close(); $('feedback').hidden = true; renderPreview(); updateStatus('Alterações descartadas nesta seção.');
    $('section-title').tabIndex = -1; $('section-title').focus();
  });
  $('undo-remove').addEventListener('click',() => {
    if (!removed) return;
    const {node,parent,next,key} = removed;
    if (parent.isConnected) { if (next?.parentNode === parent) parent.insertBefore(node,next); else parent.append(node); updateDirty(key); }
    removed = null; $('undo-message').hidden = true;
  });
  $('retry-load').addEventListener('click',loadContent);
  window.addEventListener('beforeunload',event => {
    if (dirty.size || uploads || saving) { event.preventDefault(); event.returnValue = ''; }
  });
  const paths = {
    hero:'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',about:'M12 16v-5 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    services:'M4 4h16l-8 9z M12 13v7 M7 20h10',testimonials:'M4 4h16v12H9l-5 4z M8 8h8 M8 12h5',
    gallery:'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M8 7h.01',footer:'M3 5h18v14H3z M3 5l9 8 9-8'
  };
  document.querySelectorAll('[data-section]').forEach(button => button.insertAdjacentHTML('afterbegin',`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[button.dataset.section]}"></path></svg>`));
  loadContent();
});
