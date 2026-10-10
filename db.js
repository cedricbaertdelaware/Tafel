// Tiny promise wrapper around IndexedDB. One object store per entity, keyPath "id" (plan uses "key" = date|slot).
// DB name kept as 'mealplan' so existing data is not orphaned by the rename.
const NAME = 'mealplan', VER = 1;
export const STORES = { stores:'id', ingredients:'id', recipes:'id', plan:'key', shopping:'id', pantry:'id', meta:'id' };
let dbp;
export function open() {
  return dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => { for (const [n, k] of Object.entries(STORES)) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: k }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
const tx = async (s, mode, fn) => { const db = await open(); return new Promise((res, rej) => {
  const t = db.transaction(s, mode), out = fn(t.objectStore(s)); t.oncomplete = () => res(out.result); t.onerror = t.onabort = () => rej(t.error); }); };
export const getAll = s => tx(s, 'readonly', o => o.getAll());
export const get = (s, id) => tx(s, 'readonly', o => o.get(id));
export const put = (s, v) => tx(s, 'readwrite', o => o.put(v));
export const del = (s, id) => tx(s, 'readwrite', o => o.delete(id));
export const clear = s => tx(s, 'readwrite', o => o.clear());
export async function exportAll() {
  const data = {}; for (const s of Object.keys(STORES)) data[s] = await getAll(s);
  return { app: 'tafel', version: 1, exportedAt: new Date().toISOString(), data };
}
// Validates shape before touching existing data; throws a readable Error on bad files.
export async function importAll(json) {
  if (!json || !['tafel', 'mealplan'].includes(json.app) || typeof json.data !== 'object') throw new Error('This is not a Tafel backup file.');
  for (const [s, k] of Object.entries(STORES)) {
    const rows = json.data[s] ?? [];
    if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || r[k] == null)) throw new Error(`Backup is corrupt (section "${s}").`);
  }
  for (const s of Object.keys(STORES)) { await clear(s); for (const r of json.data[s] ?? []) await put(s, r); }
}
export async function resetAll() { for (const s of Object.keys(STORES)) await clear(s); }
