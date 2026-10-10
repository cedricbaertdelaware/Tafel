// Ingredients database + store management (add, rename, recolor, reorder, delete).
import { state, save, remove } from './state.js';
import { esc, uid, toast, form, CATS, UNITS, eur } from './utils.js';
let root, q = '', limit = 60;
const store = id => state.stores.find(s => s.id === id);
const sorted = () => state.stores.sort((a, b) => a.order - b.order);

export function render(r) { root = r; root.onclick = onClick; root.onchange = onChange; root.oninput = onInput; root.onsubmit = onSubmit;
  root.innerHTML = `<h1>Items</h1><div id="stores"></div><h2>Ingredients</h2>
   <div class="row"><input id="s" class="grow" type="search" placeholder="Search ingredients" aria-label="Search ingredients" value="${esc(q)}"><button class="btn primary" data-a="new">New</button></div><div id="list" style="margin-top:12px"></div>`;
  drawStores(); drawList(); }

function drawStores() {
  root.querySelector('#stores').innerHTML = `<details class="card"><summary>Stores (${state.stores.length})</summary>
   ${sorted().map((s, i) => `<div class="item" data-id="${s.id}"><input type="color" data-a="color" value="${esc(s.color)}" aria-label="Color for ${esc(s.name)}">
    <input data-a="sname" class="grow" value="${esc(s.name)}" aria-label="Store name">
    <button class="ib" data-a="up" ${i ? '' : 'disabled'} aria-label="Move up">↑</button><button class="ib" data-a="down" ${i < state.stores.length - 1 ? '' : 'disabled'} aria-label="Move down">↓</button>
    <button class="ib" data-a="sdel" aria-label="Delete ${esc(s.name)}">✕</button></div>`).join('')}
   <form class="row" id="sf" style="margin-top:10px"><input id="sn" class="grow" placeholder="New store name" aria-label="New store name"><button class="btn">Add store</button></form></details>`;
}
function drawList() {
  const t = q.trim().toLowerCase(), all = state.ingredients.filter(g => g.name.toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name)), shown = all.slice(0, limit);
  root.querySelector('#list').innerHTML = shown.map(g => { const s = store(g.preferredStoreId);
    return `<div class="card" data-id="${g.id}"><div class="row"><div class="grow"><strong>${esc(g.name)}</strong>
     <div class="muted">${esc(g.category)}${s ? ` · <span class="dot" style="background:${esc(s.color)};width:10px;height:10px"></span> ${esc(s.name)}` : ''}${g.price ? ` · ${eur(g.price)}/${esc(g.priceUnit)}` : ''}</div>
     ${g.lastBoughtAt ? `<div class="muted">Last bought${store(g.lastBoughtStoreId) ? ' at ' + esc(store(g.lastBoughtStoreId).name) : ''} on ${esc(new Date(g.lastBoughtAt).toLocaleDateString('en-BE', { day: 'numeric', month: 'short' }))}</div>` : ''}
     ${g.notes ? `<div class="muted">${esc(g.notes)}</div>` : ''}</div>
     <button class="ib" data-a="edit" aria-label="Edit ${esc(g.name)}">✎</button><button class="ib" data-a="del" aria-label="Delete ${esc(g.name)}">✕</button></div></div>`; }).join('')
   || '<div class="card muted">No ingredients yet. Add one here or just add items on the Shopping tab.</div>';
  if (all.length > limit) root.querySelector('#list').insertAdjacentHTML('beforeend', `<button class="btn" data-a="more" style="width:100%">Show more (${all.length - limit})</button>`);
}
const onInput = e => { if (e.target.id === 's') { q = e.target.value; limit = 60; drawList(); } };
async function onSubmit(e) {
  e.preventDefault(); const n = root.querySelector('#sn').value.trim(); if (!n) return;
  await save('stores', { id: uid(), name: n, color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'), order: state.stores.length });
  drawStores(); root.querySelector('details').open = true;
}
async function onChange(e) {
  const a = e.target.dataset.a, s = store(e.target.closest('.item')?.dataset.id); if (!s) return;
  if (a === 'color') await save('stores', { ...s, color: e.target.value });
  if (a === 'sname') { const n = e.target.value.trim(); if (n) await save('stores', { ...s, name: n }); else e.target.value = s.name; }
}
async function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, id = b.closest('[data-id]')?.dataset.id;
  if (a === 'more') { limit += 60; return drawList(); }
  if (a === 'new') return edit();
  if (a === 'edit') return edit(state.ingredients.find(g => g.id === id));
  if (a === 'del') { const g = state.ingredients.find(x => x.id === id); await remove('ingredients', id); drawList(); toast(`${g.name} deleted`, { undo: async () => { await save('ingredients', g); drawList(); } }); }
  if (a === 'up' || a === 'down') { const l = sorted(), i = l.findIndex(s => s.id === id), j = i + (a === 'up' ? -1 : 1);
    if (j < 0 || j >= l.length) return; const [x, y] = [l[i], l[j]]; await save('stores', { ...x, order: y.order }); await save('stores', { ...y, order: x.order }); sorted(); drawStores(); root.querySelector('details').open = true; }
  if (a === 'sdel') { const s = store(id); await remove('stores', id); drawStores(); root.querySelector('details').open = true;
    toast(`${s.name} deleted (its items move to "Any store")`, { undo: async () => { await save('stores', s); sorted(); drawStores(); } }); }
}
async function edit(g) {
  const v = await form(g ? 'Edit ingredient' : 'New ingredient', [{ name: 'name', label: 'Name' }, { name: 'category', label: 'Category', type: 'select', options: CATS.map(c => [c, c]) },
    { name: 'preferredStoreId', label: 'Preferred store', type: 'select', options: [['', 'No preference'], ...sorted().map(s => [s.id, s.name])] },
    { name: 'price', label: 'Typical price (€)', type: 'number' }, { name: 'priceUnit', label: 'Price per', type: 'select', options: Object.keys(UNITS).map(u => [u, u]) }, { name: 'staple', label: 'Recurring staple (quick add)', type: 'select', options: [['no', 'No'], ['yes', 'Yes']] }, { name: 'notes', label: 'Notes' }],
    { category: 'other', priceUnit: 'kg', ...g, preferredStoreId: g?.preferredStoreId ?? '', staple: g?.staple ? 'yes' : 'no' });
  if (!v) return; if (!v.name.trim()) return toast('Name is required', { error: true });
  await save('ingredients', { alternativeStoreIds: [], ...g, id: g?.id ?? uid(), name: v.name.trim(), category: v.category, preferredStoreId: v.preferredStoreId || null,
    price: v.price === '' ? null : Math.max(0, +v.price), priceUnit: v.priceUnit, notes: v.notes.trim(), staple: v.staple === 'yes' });
  drawList();
}
