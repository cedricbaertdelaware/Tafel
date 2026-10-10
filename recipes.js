// Recipes: list/search/filter, editor with ingredient autocomplete, photo compression, random suggestion.
import { state, save, remove, getMeta } from './state.js';
import { esc, uid, toast, form, UNITS } from './utils.js';
let root, q = '', tag = '', fav = false, draft = null, suggest = null, sugFilter = { max: 0, tag: '' };
const total = r => (+r.prep || 0) + (+r.cook || 0);
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const on = a => a ? 'style="border-color:var(--accent);color:var(--accent)"' : '';
export function render(r) { root = r; root.onclick = onClick; root.onsubmit = onSubmit; root.onchange = onChange;
  root.oninput = e => { if (e.target.id === 's') { q = e.target.value; drawList(); } }; draw(); }

function draw() {
  if (draft) return editor();
  const tags = [...new Set(state.recipes.flatMap(r => r.tags || []))].sort();
  root.innerHTML = `<h1>Recipes</h1><div class="row"><input id="s" class="grow" type="search" placeholder="Search recipes" aria-label="Search recipes" value="${esc(q)}"><button class="btn primary" data-a="new">New</button></div>
   <div class="row" style="margin:10px 0"><button class="btn" data-a="favf" ${on(fav)}>★ Favorites</button>${tags.map(t => `<button class="btn" data-a="tag" data-t="${esc(t)}" ${on(tag === t)}>${esc(t)}</button>`).join('')}
   <button class="btn" data-a="suggest">🎲 What should I cook?</button></div><div id="list"></div>`;
  drawList();
}
function drawList() {
  const t = q.trim().toLowerCase(), rs = state.recipes.filter(r => (!t || r.name.toLowerCase().includes(t) || (r.tags || []).some(x => x.toLowerCase().includes(t))) && (!tag || (r.tags || []).includes(tag)) && (!fav || r.favorite))
    .sort((a, b) => a.name.localeCompare(b.name));
  const s = state.recipes.find(r => r.id === suggest);
  root.querySelector('#list').innerHTML = (s ? `<div class="card" style="border-color:var(--accent)"><strong>Tonight: ${esc(s.name)}</strong><div class="muted">${total(s) || '?'} min</div>
    <div class="row" style="margin-top:8px"><button class="btn primary" data-a="edit" data-id="${s.id}">Open</button><button class="btn" data-a="suggest">Another</button></div></div>` : '')
   + (rs.map(r => `<div class="card" data-id="${r.id}">${r.photo ? `<img src="${esc(r.photo)}" alt="" loading="lazy" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;margin-bottom:8px">` : ''}
    <div class="row"><div class="grow"><strong>${esc(r.name)}</strong><div class="muted">${r.servings} servings${total(r) ? ` · ${total(r)} min` : ''}${(r.tags || []).length ? ' · ' + esc(r.tags.join(', ')) : ''}</div>
    ${safeUrl(r.link) ? `<a class="muted" href="${esc(safeUrl(r.link))}" target="_blank" rel="noopener noreferrer">Source link</a>` : ''}</div>
    <button class="ib" data-a="star" aria-label="Toggle favorite" style="${r.favorite ? 'color:#e8a900' : ''}">${r.favorite ? '★' : '☆'}</button>
    <button class="ib" data-a="edit" aria-label="Edit ${esc(r.name)}">✎</button><button class="ib" data-a="dup" aria-label="Duplicate">⎘</button><button class="ib" data-a="del" aria-label="Delete ${esc(r.name)}">✕</button></div></div>`).join('')
   || '<div class="card muted">No recipes match. Tap New to add your first recipe.</div>');
}
const rowHtml = g => `<div class="item rrow" style="flex-wrap:wrap;padding:6px 0"><input class="grow" data-f="name" list="ings" placeholder="Ingredient" aria-label="Ingredient" value="${esc(g.name)}">
 <input data-f="quantity" type="number" step="any" inputmode="decimal" style="width:80px" aria-label="Quantity" value="${esc(g.quantity)}">
 <select data-f="unit" style="width:84px" aria-label="Unit">${Object.keys(UNITS).map(u => `<option ${u === g.unit ? 'selected' : ''}>${u}</option>`).join('')}</select>
 <button type="button" class="ib" data-a="rm" aria-label="Remove ingredient">✕</button><input data-f="note" placeholder="note (optional)" style="width:100%" aria-label="Note" value="${esc(g.note)}"></div>`;
function editor() {
  const d = draft, f = (l, n, v, x = '') => `<label class="f grow">${l}<input name="${n}" value="${esc(v)}" ${x}></label>`;
  root.innerHTML = `<h1>${d.exists ? 'Edit' : 'New'} recipe</h1><form id="rf">${f('Name', 'name', d.name, 'required')}
   <div class="row">${f('Servings', 'servings', d.servings, 'type="number" min="1"')}${f('Prep (min)', 'prep', d.prep, 'type="number" min="0"')}${f('Cook (min)', 'cook', d.cook, 'type="number" min="0"')}</div>
   ${f('Tags (comma separated)', 'tags', d.tags.join(', '))}${f('Link', 'link', d.link, 'type="url"')}
   <label class="f">Photo<input type="file" accept="image/*" id="ph"></label>${d.photo ? `<img src="${esc(d.photo)}" alt="" style="max-width:100%;border-radius:12px;margin-top:8px">` : ''}
   <label class="f">Instructions<textarea name="instructions" rows="5">${esc(d.instructions)}</textarea></label><label class="f">Notes<textarea name="notes" rows="2">${esc(d.notes)}</textarea></label>
   <label class="row f"><input type="checkbox" name="favorite" style="width:24px;min-height:24px" ${d.favorite ? 'checked' : ''}> Favorite</label>
   <h2>Ingredients</h2><datalist id="ings">${state.ingredients.map(g => `<option value="${esc(g.name)}">`).join('')}</datalist>
   <div id="rows">${d.ingredients.map(rowHtml).join('')}</div><button type="button" class="btn" data-a="addrow">+ Ingredient</button>
   <div class="row" style="margin-top:16px"><button type="button" class="btn grow" data-a="cancel">Cancel</button><button class="btn primary grow">Save</button></div></form>`;
}
function collect() {   // copy form state into draft so re-renders don't lose input
  const f = root.querySelector('#rf'), fd = new FormData(f), g = k => fd.get(k) ?? '';
  Object.assign(draft, { name: g('name'), servings: g('servings'), prep: g('prep'), cook: g('cook'), tags: String(g('tags')).split(',').map(t => t.trim()).filter(Boolean),
    link: g('link'), instructions: g('instructions'), notes: g('notes'), favorite: fd.get('favorite') === 'on' });
  draft.ingredients = [...f.querySelectorAll('.rrow')].map(r => ({ name: r.querySelector('[data-f=name]').value, quantity: r.querySelector('[data-f=quantity]').value, unit: r.querySelector('[data-f=unit]').value, note: r.querySelector('[data-f=note]').value }));
}
const blank = () => ({ id: uid(), exists: false, name: '', servings: getMeta('servings', 2), prep: '', cook: '', tags: [], link: '', instructions: '', notes: '', favorite: false, photo: '', ingredients: [{ name: '', quantity: '', unit: 'g', note: '' }] });
const toDraft = r => ({ ...r, exists: true, tags: [...(r.tags || [])], link: r.link || '', photo: r.photo || '', instructions: r.instructions || '', notes: r.notes || '',
  ingredients: r.ingredients.map(i => ({ name: state.ingredients.find(g => g.id === i.ingredientId)?.name ?? '', quantity: i.quantity, unit: i.unit, note: i.note || '' })) });
function compress(file) { return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => { const s = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .7)); };
  img.onerror = () => rej(new Error('Could not read that image.')); img.src = u; }); }
async function onChange(e) {
  if (e.target.id !== 'ph' || !e.target.files[0]) return; collect();
  try { draft.photo = await compress(e.target.files[0]); } catch (err) { toast(err.message, { error: true }); } editor();
}
async function onSubmit(e) {
  e.preventDefault(); if (!draft) return; collect(); const d = draft;
  if (!d.name.trim()) return toast('Name is required', { error: true });
  const ings = [];
  for (const r of d.ingredients) { const n = r.name.trim(); if (!n) continue;
    let g = state.ingredients.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (!g) g = await save('ingredients', { id: uid(), name: n, category: 'other', preferredStoreId: null, alternativeStoreIds: [], price: null, priceUnit: null, notes: '' });
    ings.push({ ingredientId: g.id, quantity: +r.quantity > 0 ? +r.quantity : 1, unit: r.unit, note: r.note.trim() }); }
  const { exists, ...rest } = d;
  await save('recipes', { ...rest, name: d.name.trim(), servings: Math.max(1, +d.servings || 2), prep: +d.prep || 0, cook: +d.cook || 0, link: safeUrl(d.link), ingredients: ings });
  draft = null; toast('Recipe saved'); draw();
}
async function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, id = b.dataset.id || b.closest('[data-id]')?.dataset.id, r = state.recipes.find(x => x.id === id);
  if (a === 'new') { draft = blank(); return editor(); }
  if (a === 'addrow') { collect(); draft.ingredients.push({ name: '', quantity: '', unit: 'g', note: '' }); return editor(); }
  if (a === 'rm') { collect(); const i = [...root.querySelectorAll('.rrow')].indexOf(b.closest('.rrow')); draft.ingredients.splice(i, 1); return editor(); }
  if (a === 'cancel') { draft = null; return draw(); }
  if (a === 'favf') { fav = !fav; return draw(); }
  if (a === 'tag') { tag = tag === b.dataset.t ? '' : b.dataset.t; return draw(); }
  if (a === 'edit' && r) { draft = toDraft(r); return editor(); }
  if (a === 'star' && r) { await save('recipes', { ...r, favorite: !r.favorite }); return drawList(); }
  if (a === 'dup' && r) { await save('recipes', { ...r, id: uid(), name: r.name + ' (copy)', sample: false }); toast('Duplicated'); return drawList(); }
  if (a === 'del' && r) { await remove('recipes', id); drawList(); return toast(`${r.name} deleted`, { undo: async () => { await save('recipes', r); drawList(); } }); }
  if (a === 'suggest') {
    if (!state.recipes.length) return toast('Add a recipe first');
    if (b.textContent.includes('Another') === false) { const v = await form('What should I cook?', [{ name: 'max', label: 'Max total minutes (optional)', type: 'number' }, { name: 'tag', label: 'Tag (optional)' }]); if (!v) return; sugFilter = { max: +v.max || 0, tag: v.tag.trim().toLowerCase() }; }
    const f = sugFilter;
    const pool = state.recipes.filter(x => (!f.max || (total(x) && total(x) <= f.max)) && (!f.tag || (x.tags || []).some(t => t.toLowerCase() === f.tag)));
    if (!pool.length) { suggest = null; return toast('No recipe matches those filters'); }
    suggest = pool[Math.floor(Math.random() * pool.length)].id; draw();
  }
}
