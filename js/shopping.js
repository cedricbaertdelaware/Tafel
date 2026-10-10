// Shopping list: quick add, grouped by store > category, check-off, move, merge, mark bought, share.
import { state, save, remove } from './state.js';
import { esc, uid, toast, parseQuick, toBase, fromBase, UNITS, CATS, eur, form } from './utils.js';
let root; const closed = new Set();
const ing = id => state.ingredients.find(i => i.id === id);
const sid = i => state.stores.some(s => s.id === i.storeId) ? i.storeId : null;   // deleted store => "Any store"
const line = i => `${+i.quantity.toFixed(2)} ${i.unit} ${i.name}${i.note ? ` (${i.note})` : ''}`;
function cost(i) { const g = ing(i.ingredientId); if (!g?.price || !g.priceUnit) return 0;
  const a = toBase(i.quantity, i.unit), b = toBase(1, g.priceUnit); return a.dim === b.dim ? a.q / b.q * g.price : 0; }
const storeOpts = sel => `<option value="">Any store</option>` + state.stores.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');

export function render(r) { root = r; root.onclick = onClick; root.onchange = onChange; root.onsubmit = onSubmit; draw(); }

function row(i) {
  return `<div class="item ${i.checked ? 'done' : ''}" data-id="${i.id}"><input type="checkbox" data-a="check" ${i.checked ? 'checked' : ''} aria-label="Check ${esc(i.name)}">
  <span class="grow">${esc(line(i))}</span><select data-a="store" aria-label="Store for ${esc(i.name)}">${storeOpts(sid(i))}</select>
  <button class="ib" data-a="edit" aria-label="Edit ${esc(i.name)}">✎</button><button class="ib" data-a="del" aria-label="Delete ${esc(i.name)}">✕</button></div>`;
}
function draw() {
  const open = state.shopping.filter(i => !i.checked), done = state.shopping.filter(i => i.checked);
  const groups = [...state.stores.map(s => ({ id: s.id, name: s.name, color: s.color })), { id: null, name: 'Any store', color: '#9aa5a0' }];
  const html = groups.map(g => {
    const items = open.filter(i => sid(i) === g.id); if (!items.length) return '';
    const total = items.reduce((t, i) => t + cost(i), 0), key = g.id ?? 'any';
    const cats = CATS.map(c => { const x = items.filter(i => (i.category || 'other') === c); return x.length ? `<p class="cat">${esc(c)}</p>${x.map(row).join('')}` : ''; }).join('');
    return `<details class="card" data-g="${key}" ${closed.has(key) ? '' : 'open'}><summary><span class="dot" style="background:${esc(g.color)}"></span><span class="grow">${esc(g.name)} · ${items.length}</span>
      ${total ? `<span class="muted">≈ ${eur(total)}</span>` : ''}<button class="ib" data-a="share" data-s="${key}" aria-label="Share ${esc(g.name)}">⬆︎</button></summary>${cats}</details>`;
  }).join('');
  root.innerHTML = `<h1>Shopping</h1>
  <form class="row" id="qf"><input id="q" class="grow" list="ings" placeholder='Add e.g. "2 kg potatoes"' aria-label="Add item" autocomplete="off" enterkeyhint="done">
   <datalist id="ings">${state.ingredients.map(g => `<option value="${esc(g.name)}">`).join('')}</datalist><button class="btn primary">Add</button></form>
  <div class="row" style="margin:12px 0"><button class="btn" data-a="staples">Add staples</button><button class="btn" data-a="merge">Merge duplicates</button><button class="btn" data-a="share" data-s="all">Share all</button></div>
  ${html || '<div class="card muted">Your list is empty. Type something above to add your first item.</div>'}
  ${done.length ? `<h2>Done (${done.length})</h2><div class="card">${done.map(row).join('')}</div>
   <div class="row"><button class="btn primary" data-a="bought">Mark bought</button><button class="btn" data-a="clear">Clear checked</button></div>` : ''}`;
}
async function onSubmit(e) {
  e.preventDefault(); const inp = root.querySelector('#q'), text = inp.value.trim(); if (!text) return;
  const p = parseQuick(text); let g = state.ingredients.find(x => x.name.toLowerCase() === p.name.toLowerCase());
  if (!g) g = await save('ingredients', { id: uid(), name: p.name, category: 'other', preferredStoreId: null, alternativeStoreIds: [], price: null, priceUnit: null, notes: '' });
  await save('shopping', { id: uid(), ingredientId: g.id, name: g.name, quantity: p.quantity, unit: p.unit, storeId: g.preferredStoreId || null,
    category: g.category, note: '', checked: false, source: 'manual', addedAt: Date.now() });
  draw(); root.querySelector('#q').focus();
}
async function onChange(e) {
  const el = e.target, a = el.dataset.a, id = el.closest('.item')?.dataset.id, it = state.shopping.find(i => i.id === id); if (!it) return;
  if (a === 'check') await save('shopping', { ...it, checked: el.checked });
  if (a === 'store') { await save('shopping', { ...it, storeId: el.value || null }); toast(`Moved to ${state.stores.find(s => s.id === el.value)?.name ?? 'Any store'}`); }
  draw();
}
async function onClick(e) {
  const sum = e.target.closest('summary'), btn = e.target.closest('[data-a]'), a = btn?.dataset.a;
  if (sum && a !== 'share') { const d = sum.parentElement; d.open ? closed.add(d.dataset.g) : closed.delete(d.dataset.g); return; }
  if (!a || a === 'check' || a === 'store') return;
  if (a === 'share') { e.preventDefault(); return share(btn.dataset.s); }
  const id = btn.closest('.item')?.dataset.id, it = state.shopping.find(i => i.id === id);
  if (a === 'del' && it) { await remove('shopping', id); toast('Item deleted', { undo: async () => { await save('shopping', it); draw(); } }); }
  if (a === 'edit' && it) {
    const v = await form('Edit item', [{ name: 'quantity', label: 'Quantity', type: 'number' }, { name: 'unit', label: 'Unit', type: 'select', options: Object.keys(UNITS).map(u => [u, u]) },
      { name: 'storeId', label: 'Store', type: 'select', options: [['', 'Any store'], ...state.stores.map(s => [s.id, s.name])] }, { name: 'note', label: 'Note' }], { ...it, storeId: sid(it) ?? '' });
    if (v && +v.quantity > 0) await save('shopping', { ...it, quantity: +v.quantity, unit: v.unit, storeId: v.storeId || null, note: v.note.trim() });
  }
  if (a === 'clear') { const gone = state.shopping.filter(i => i.checked); for (const i of gone) await remove('shopping', i.id);
    toast(`${gone.length} cleared`, { undo: async () => { for (const i of gone) await save('shopping', i); draw(); } }); }
  if (a === 'staples') { const have = new Set(state.shopping.filter(i => !i.checked).map(i => i.ingredientId)), st = state.ingredients.filter(g => g.staple && !have.has(g.id));
    for (const g of st) await save('shopping', { id: uid(), ingredientId: g.id, name: g.name, quantity: 1, unit: g.priceUnit || 'pcs', storeId: g.preferredStoreId || null, category: g.category, note: '', checked: false, source: 'manual', addedAt: Date.now() });
    toast(st.length ? `${st.length} staples added` : 'No staples to add (mark ingredients as staples in Items)'); }
  if (a === 'merge') await merge();
  if (a === 'bought') await bought();
  draw();
}
async function merge() {   // combine unchecked items with same ingredient + store + unit dimension
  const map = new Map(); let n = 0;
  for (const i of state.shopping.filter(x => !x.checked)) {
    const b = toBase(i.quantity, i.unit), k = `${i.ingredientId ?? i.name}|${sid(i)}|${b.dim}`, f = map.get(k);
    if (!f) { map.set(k, { item: i, q: b.q, dim: b.dim }); continue; }
    f.q += b.q; n++; await remove('shopping', i.id);
  }
  for (const f of map.values()) { const u = fromBase(f.q, f.dim); await save('shopping', { ...f.item, quantity: u.q, unit: u.unit }); }
  toast(n ? `Merged ${n} duplicate${n > 1 ? 's' : ''}` : 'No duplicates found');
}
async function bought() {   // update purchase history + pantry, then remove from list
  const items = state.shopping.filter(i => i.checked);
  for (const i of items) {
    const g = ing(i.ingredientId); if (g) await save('ingredients', { ...g, lastBoughtAt: Date.now(), lastBoughtStoreId: sid(i) });
    if (g) { const p = state.pantry.find(x => x.id === g.id), b = toBase(i.quantity, i.unit), pb = p && toBase(p.quantity, p.unit);
      const sum = p && pb.dim === b.dim ? pb.q + b.q : b.q, u = fromBase(sum, b.dim); await save('pantry', { id: g.id, ingredientId: g.id, quantity: u.q, unit: u.unit }); }
    await remove('shopping', i.id);
  }
  toast(`${items.length} item${items.length === 1 ? '' : 's'} added to pantry`);
}
async function share(key) {
  const open = state.shopping.filter(i => !i.checked), parts = [];
  for (const g of [...state.stores, { id: null, name: 'Any store' }]) {
    if (key !== 'all' && (g.id ?? 'any') !== key) continue;
    const x = open.filter(i => sid(i) === g.id); if (x.length) parts.push(`${g.name}\n${x.map(i => '- ' + line(i)).join('\n')}`);
  }
  const text = parts.join('\n\n'); if (!text) return toast('Nothing to share');
  try { if (navigator.share) await navigator.share({ text }); else throw 0; }
  catch (e) { if (e?.name === 'AbortError') return; try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch { toast('Could not share or copy', { error: true }); } }
}
