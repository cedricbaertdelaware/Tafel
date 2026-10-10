// Pantry: stock used to subtract from generated shopping lists.
import { state, save, remove } from './state.js';
import { esc, uid, toast, form, parseQuick, UNITS } from './utils.js';
let root;
export function render(r) { root = r; root.onclick = onClick; root.onsubmit = onSubmit; root.onchange = null; root.oninput = null; draw(); }
function draw() {
  const rows = state.pantry.map(p => ({ p, g: state.ingredients.find(i => i.id === p.id) })).filter(x => x.g).sort((a, b) => a.g.name.localeCompare(b.g.name));
  root.innerHTML = `<h1>Pantry</h1><form class="row" id="pf"><input id="pq" class="grow" list="ings" placeholder='Add stock, e.g. "500 g rice"' aria-label="Add pantry item" autocomplete="off">
   <datalist id="ings">${state.ingredients.map(g => `<option value="${esc(g.name)}">`).join('')}</datalist><button class="btn primary">Add</button></form>
   <div style="margin-top:12px">${rows.map(({ p, g }) => `<div class="item card" data-id="${p.id}"><span class="grow">${esc(g.name)} — ${+p.quantity.toFixed(2)} ${esc(p.unit)}</span>
    <button class="ib" data-a="edit" aria-label="Edit ${esc(g.name)}">✎</button><button class="ib" data-a="del" aria-label="Delete ${esc(g.name)}">✕</button></div>`).join('')
    || '<div class="card muted">Your pantry is empty. Items you mark as bought land here automatically.</div>'}</div>`;
}
async function onSubmit(e) {
  e.preventDefault(); const t = root.querySelector('#pq').value.trim(); if (!t) return; const p = parseQuick(t);
  let g = state.ingredients.find(x => x.name.toLowerCase() === p.name.toLowerCase());
  if (!g) g = await save('ingredients', { id: uid(), name: p.name, category: 'other', preferredStoreId: null, alternativeStoreIds: [], price: null, priceUnit: null, notes: '' });
  await save('pantry', { id: g.id, ingredientId: g.id, quantity: p.quantity, unit: p.unit }); draw();
}
async function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return; const id = b.closest('[data-id]').dataset.id, p = state.pantry.find(x => x.id === id);
  if (b.dataset.a === 'del') { await remove('pantry', id); draw(); toast('Removed from pantry', { undo: async () => { await save('pantry', p); draw(); } }); }
  if (b.dataset.a === 'edit') { const v = await form('Edit stock', [{ name: 'quantity', label: 'Quantity', type: 'number' }, { name: 'unit', label: 'Unit', type: 'select', options: Object.keys(UNITS).map(u => [u, u]) }], p);
    if (v && +v.quantity >= 0) { await save('pantry', { ...p, quantity: +v.quantity, unit: v.unit }); draw(); } }
}
