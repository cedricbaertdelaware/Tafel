// In-memory cache of all entities + change notification. Views read from `state`, write via save()/remove().
import * as db from './db.js';
import { uid } from './utils.js';
export const state = { stores: [], ingredients: [], recipes: [], plan: [], shopping: [], pantry: [], meta: {} };
const subs = new Set();
export const subscribe = f => (subs.add(f), () => subs.delete(f));
const emit = () => subs.forEach(f => f());
const DEFAULT_STORES = [['Aldi','#00a0e1'],['Colruyt','#e30613'],['Delhaize','#f58220'],['Albert Heijn','#00a0e2'],['Lidl','#ffcc00'],['Carrefour','#1e5aa8']];
export async function load() {
  for (const s of ['stores','ingredients','recipes','plan','shopping','pantry']) state[s] = await db.getAll(s);
  state.meta = Object.fromEntries((await db.getAll('meta')).map(m => [m.id, m.value]));
  if (!state.meta.seeded) {
    for (const [i, [name, color]] of DEFAULT_STORES.entries()) await db.put('stores', { id: uid(), name, color, order: i });
    await setMeta('seeded', true); state.stores = await db.getAll('stores');
  }
  state.stores.sort((a, b) => a.order - b.order); emit();
}
export async function save(s, v) { await db.put(s, v); const i = state[s].findIndex(x => (x.id ?? x.key) === (v.id ?? v.key)); i < 0 ? state[s].push(v) : state[s][i] = v; emit(); return v; }
export async function remove(s, id) { await db.del(s, id); state[s] = state[s].filter(x => (x.id ?? x.key) !== id); emit(); }
export async function setMeta(k, value) { state.meta[k] = value; await db.put('meta', { id: k, value }); }
export const getMeta = (k, d) => state.meta[k] ?? d;
