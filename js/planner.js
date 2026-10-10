// Weekly planner: one meal per day/slot (tap or drag), copy meal/week, leftovers, servings scaling, week -> shopping list.
import { state, save, remove, getMeta } from './state.js';
import { esc, uid, toast, form, toBase, fromBase, eur, isoDate } from './utils.js';
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
let root, anchor;
const rec = id => state.recipes.find(r => r.id === id), ing = id => state.ingredients.find(i => i.id === id);
const fmt = d => d.toLocaleDateString('en-BE', { weekday: 'short', day: 'numeric', month: 'short' });
function monday(d) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() - getMeta('weekStart', 1) + 7) % 7); return x; }
const days = () => [...Array(7)].map((_, i) => { const d = new Date(anchor); d.setDate(d.getDate() + i); return d; });
const entry = (date, slot) => state.plan.find(e => e.key === `${date}|${slot}`);
const mkKey = (date, slot) => `${date}|${slot}`;

export function render(r) {
  root = r; anchor ??= monday(new Date()); root.onclick = onClick;
  root.ondragstart = e => { const m = e.target.closest('.meal'); if (m) e.dataTransfer.setData('text/plain', m.dataset.key); };
  root.ondragover = e => { if (e.target.closest('.slot')) e.preventDefault(); };
  root.ondrop = onDrop; draw();
}
function cost(g, q, u) { if (!g?.price || !g.priceUnit) return 0; const a = toBase(q, u), b = toBase(1, g.priceUnit); return a.dim === b.dim ? a.q / b.q * g.price : 0; }
function need() {   // aggregate week's recipe ingredients (scaled by servings), minus pantry stock
  const wk = new Set(days().map(isoDate)), map = new Map();
  for (const e of state.plan.filter(x => wk.has(x.date) && !x.leftover)) {
    const r = rec(e.recipeId); if (!r) continue; const f = (e.servings || r.servings) / r.servings;
    for (const ri of r.ingredients) { const b = toBase(ri.quantity * f, ri.unit), k = `${ri.ingredientId}|${b.dim}`, c = map.get(k) ?? { id: ri.ingredientId, dim: b.dim, q: 0 }; c.q += b.q; map.set(k, c); }
  }
  return [...map.values()].map(c => { const p = state.pantry.find(x => x.id === c.id), pb = p && toBase(p.quantity, p.unit); if (p && pb.dim === c.dim) c.q = Math.max(0, c.q - pb.q); return c; })
    .filter(c => c.q > 0.001 && ing(c.id)).map(c => ({ g: ing(c.id), ...fromBase(c.q, c.dim) }));
}
function draw() {
  const ds = days(), items = need(), per = new Map();
  for (const i of items) { const k = i.g.preferredStoreId || ''; per.set(k, (per.get(k) || 0) + cost(i.g, i.q, i.unit)); }
  const chips = [...per].filter(([, v]) => v > 0).map(([k, v]) => `${esc(state.stores.find(s => s.id === k)?.name ?? 'Any store')} ${eur(v)}`).join(' · ');
  root.innerHTML = `<h1>Plan</h1><div class="row" style="margin-bottom:8px"><button class="btn" data-a="prev" aria-label="Previous week">‹</button><strong class="grow" style="text-align:center">${fmt(ds[0])} – ${fmt(ds[6])}</strong>
   <button class="btn" data-a="next" aria-label="Next week">›</button><button class="btn" data-a="today">Today</button></div>
   <div class="row" style="margin-bottom:12px"><button class="btn primary" data-a="gen">Add week to shopping</button><button class="btn" data-a="copyweek">Copy week → next</button></div>
   ${chips ? `<p class="muted">Estimated cost: ${chips}</p>` : ''}
   ${ds.map(d => { const iso = isoDate(d); return `<div class="card"><strong>${fmt(d)}</strong>${SLOTS.map(s => { const e = entry(iso, s), r = e && rec(e.recipeId);
     return `<div class="slot" data-date="${iso}" data-slot="${s}"><span class="lbl">${s}</span>${e ? `<div class="grow meal" draggable="true" data-key="${esc(e.key)}"><button class="btn" style="border:0;background:none;padding:0;text-align:left;min-height:44px" data-a="edit">
       ${esc(r?.name ?? e.text)} <span class="muted">· ${e.servings || r?.servings || ''} serv</span>${e.leftover ? ' <span class="badge">leftovers</span>' : ''}</button></div>
       <button class="ib" data-a="copy" aria-label="Copy meal">⎘</button><button class="ib" data-a="del" aria-label="Remove meal">✕</button>`
       : `<button class="btn grow" style="border-style:dashed;color:var(--muted)" data-a="add" aria-label="Add ${s} on ${fmt(d)}">+ Add</button>`}</div>`; }).join('')}</div>`; }).join('')}`;
}
async function assign(date, slot) {
  const e = entry(date, slot);
  const v = await form(`${slot} · ${date}`, [{ name: 'recipeId', label: 'Recipe', type: 'select', options: [['', '— free text —'], ...[...state.recipes].sort((a, b) => a.name.localeCompare(b.name)).map(r => [r.id, r.name])] },
    { name: 'text', label: 'Free-text meal (if no recipe)' }, { name: 'servings', label: 'Servings (blank = recipe default)', type: 'number' },
    { name: 'leftover', label: 'Leftover / batch cook (skips shopping)', type: 'select', options: [['no', 'No'], ['yes', 'Yes']] }, { name: 'notes', label: 'Notes' }],
    { ...e, leftover: e?.leftover ? 'yes' : 'no', recipeId: e?.recipeId ?? '' });
  if (!v) return; if (!v.recipeId && !v.text.trim()) return toast('Pick a recipe or type a meal', { error: true });
  await save('plan', { key: mkKey(date, slot), date, slot, recipeId: v.recipeId || null, text: v.text.trim(), servings: +v.servings > 0 ? +v.servings : null, leftover: v.leftover === 'yes', notes: v.notes.trim() });
  draw();
}
async function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, sl = b.closest('.slot'), date = sl?.dataset.date, slot = sl?.dataset.slot, en = sl && entry(date, slot);
  if (a === 'prev' || a === 'next') { anchor.setDate(anchor.getDate() + (a === 'next' ? 7 : -7)); return draw(); }
  if (a === 'today') { anchor = monday(new Date()); return draw(); }
  if (a === 'add' || a === 'edit') return assign(date, slot);
  if (a === 'del' && en) { await remove('plan', en.key); draw(); return toast('Meal removed', { undo: async () => { await save('plan', en); draw(); } }); }
  if (a === 'copy' && en) {
    const opts = [...Array(14)].map((_, i) => { const d = new Date(anchor); d.setDate(d.getDate() + i); return [isoDate(d), fmt(d)]; });
    const v = await form('Copy meal to…', [{ name: 'date', label: 'Day', type: 'select', options: opts }, { name: 'slot', label: 'Slot', type: 'select', options: SLOTS.map(s => [s, s]) }], { date, slot });
    if (v) { await save('plan', { ...en, key: mkKey(v.date, v.slot), date: v.date, slot: v.slot }); draw(); toast('Meal copied'); } return;
  }
  if (a === 'copyweek') {
    const wk = new Set(days().map(isoDate)), src = state.plan.filter(x => wk.has(x.date)); if (!src.length) return toast('Nothing planned this week');
    for (const x of src) { const d = new Date(x.date + 'T12:00:00'); d.setDate(d.getDate() + 7); const nd = isoDate(d); await save('plan', { ...x, key: mkKey(nd, x.slot), date: nd }); }
    return toast(`Copied ${src.length} meals to next week`);
  }
  if (a === 'gen') return generate();
}
async function onDrop(e) {   // drag a meal to another slot (swaps if occupied)
  const sl = e.target.closest('.slot'), key = e.dataTransfer?.getData('text/plain'); if (!sl || !key) return; e.preventDefault();
  const src = state.plan.find(x => x.key === key), nk = mkKey(sl.dataset.date, sl.dataset.slot); if (!src || nk === key) return;
  const other = state.plan.find(x => x.key === nk); await remove('plan', key);
  await save('plan', { ...src, key: nk, date: sl.dataset.date, slot: sl.dataset.slot });
  if (other) await save('plan', { ...other, key, date: src.date, slot: src.slot }); draw();
}
function generate() {
  const items = need(), d = document.createElement('dialog'), sn = g => state.stores.find(s => s.id === g.preferredStoreId)?.name ?? 'Any store';
  d.innerHTML = `<h2 style="margin-top:0">Add to shopping list</h2>${items.length ? `<div style="max-height:50vh;overflow:auto">${items.map(i => `<div class="item"><span class="grow">${esc(+i.q.toFixed(2) + ' ' + i.unit + ' ' + i.g.name)}</span><span class="muted">${esc(sn(i.g))}</span></div>`).join('')}</div>`
    : '<p class="muted">Nothing to add: no recipes planned this week, or your pantry already covers everything.</p>'}
   <form method="dialog" class="row" style="margin-top:14px"><button class="btn grow" value="x">Cancel</button>${items.length ? `<button class="btn primary grow" value="ok">Add ${items.length} items</button>` : ''}</form>`;
  document.body.append(d); d.showModal();
  d.onclose = async () => { const ok = d.returnValue === 'ok'; d.remove(); if (!ok) return;
    for (const i of items) await save('shopping', { id: uid(), ingredientId: i.g.id, name: i.g.name, quantity: i.q, unit: i.unit, storeId: i.g.preferredStoreId || null, category: i.g.category, note: '', checked: false, source: 'meal plan', addedAt: Date.now() });
    toast(`${items.length} items added to your shopping list`); };
}
