// Shared helpers: escaping, ids, toasts, quick-entry parsing, unit conversion.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid = () => (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2));
export const $ = (s, r = document) => r.querySelector(s);
export const debounce = (f, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
export const eur = n => new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n || 0);
export const isoDate = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };

export function toast(msg, { undo, error } = {}) {
  const box = $('#toasts'), t = document.createElement('div');
  t.className = 'toast' + (error ? ' err' : ''); t.setAttribute('role', error ? 'alert' : 'status');
  const span = document.createElement('span'); span.textContent = msg; t.append(span);
  const kill = () => t.remove();
  if (undo) { const b = document.createElement('button'); b.textContent = 'Undo'; b.onclick = () => { undo(); kill(); }; t.append(b); }
  box.append(t); setTimeout(kill, undo ? 6000 : 3500);
}

// Units: base unit per dimension so compatible quantities can be merged (g/kg, ml/l/tsp/tbsp).
export const UNITS = { g:['mass',1], kg:['mass',1000], ml:['vol',1], l:['vol',1000], tsp:['vol',5], tbsp:['vol',15], pcs:['count',1] };
export function toBase(q, u) { const d = UNITS[u]; return d ? { q: q * d[1], dim: d[0] } : { q, dim: u || 'count' }; }
export function fromBase(q, dim) {
  if (dim === 'mass') return q >= 1000 ? { q: +(q / 1000).toFixed(2), unit: 'kg' } : { q: Math.round(q), unit: 'g' };
  if (dim === 'vol') return q >= 1000 ? { q: +(q / 1000).toFixed(2), unit: 'l' } : { q: Math.round(q), unit: 'ml' };
  return { q: +q.toFixed(2), unit: dim === 'count' ? 'pcs' : dim };
}
// "2 kg potatoes" | "500g rijst" | "milk" -> {quantity, unit, name}
export function parseQuick(text) {
  const m = text.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
  if (!m) return { quantity: 1, unit: 'pcs', name: text.trim() };
  const q = parseFloat(m[1].replace(',', '.')), u = (m[2] || '').toLowerCase();
  if (UNITS[u]) return { quantity: q, unit: u, name: m[3].trim() };
  return { quantity: q, unit: 'pcs', name: ((m[2] ? m[2] + ' ' : '') + m[3]).trim() };
}

export const CATS = ['produce','dairy','meat/fish','bakery','pantry','frozen','drinks','household','other'];
// Modal form helper: fields [{name,label,type?,options?}] -> Promise of {name:value} or null when cancelled.
export function form(title, fields, vals = {}) {
  return new Promise(res => {
    const d = document.createElement('dialog');
    const input = f => f.type === 'select'
      ? `<select name="${f.name}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(vals[f.name] ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : `<input name="${f.name}" type="${f.type || 'text'}" step="any" ${f.type === 'number' ? 'inputmode="decimal"' : ''} value="${esc(vals[f.name] ?? '')}">`;
    d.innerHTML = `<form method="dialog"><h2 style="margin-top:0">${esc(title)}</h2>${fields.map(f => `<label class="f">${esc(f.label)}${input(f)}</label>`).join('')}
      <div class="row" style="margin-top:16px"><button class="btn grow" value="x">Cancel</button><button class="btn primary grow" value="ok">Save</button></div></form>`;
    document.body.append(d); d.showModal();
    d.onclose = () => { const ok = d.returnValue === 'ok'; const out = ok ? Object.fromEntries(new FormData(d.querySelector('form'))) : null; d.remove(); res(out); };
  });
}
