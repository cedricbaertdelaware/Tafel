// App shell: tab navigation, theme, backup reminder, service worker registration.
import { load, state, getMeta, setMeta } from './state.js';
import { toast, $ } from './utils.js';
import * as settings from './settings.js';
import { seedSample } from './seed.js';

// Views are lazy-loaded modules exporting render(root). Later parts add planner, recipes, shopping, ingredients.
const TABS = [['planner','Plan','📅'],['recipes','Recipes','🍲'],['shopping','Shopping','🛒'],['ingredients','Items','🥕'],['pantry','Pantry','🥫'],['settings','Settings','⚙️']];

async function show(tab) {
  location.hash = tab;
  $('#nav').querySelectorAll('button').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  const root = $('#view');
  try { (tab === 'settings' ? settings : await import(`./${tab}.js`)).render(root); }
  catch (e) { root.innerHTML = '<h1>Coming in the next part</h1><p class="muted">This section is delivered in a later part of the build.</p>'; }
  root.dataset.ok = '1'; window.scrollTo(0, 0); root.focus({ preventScroll: true });
}

async function init() {
  $('#nav').innerHTML = TABS.map(([k, l, i]) => `<button data-tab="${k}"><span class="ico" aria-hidden="true">${i}</span>${l}</button>`).join('');
  $('#nav').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.tab); };
  await load(); settings.applyTheme();
  if (!getMeta('sampleDone', false)) { await seedSample(); await setMeta('sampleDone', true); }
  const start = location.hash.slice(1); show(TABS.some(t => t[0] === start) ? start : 'settings');
  if (Date.now() - getMeta('lastBackup', 0) > 14 * 864e5 && (state.recipes.length || state.shopping.length) && Date.now() - getMeta('remindedAt', 0) > 864e5) {
    setMeta('remindedAt', Date.now()); toast('Time to back up your data (Settings → Export).');
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init().catch(e => { $('#view').textContent = 'Could not start: ' + e.message; });
