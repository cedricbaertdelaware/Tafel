// App shell: tab navigation, theme, backup reminder, service worker registration.
import { load, state, getMeta, setMeta } from './state.js';
import { toast, $ } from './utils.js';
import * as settings from './settings.js';
import { seedSample } from './seed.js';

// Views are lazy-loaded modules exporting render(root). Later parts add planner, recipes, shopping, ingredients.
const TABS = [['planner','Planning','<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>'],['recipes','Recepten','<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>'],['shopping','Lijst','<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8H18a1 1 0 0 0 1-.8L20.5 8H6"/>'],['ingredients','Producten','<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>'],['pantry','Voorraad','<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>'],['settings','Opties','<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>']];

async function show(tab) {
  location.hash = tab;
  $('#nav').querySelectorAll('button').forEach(b => b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  const root = $('#view');
  try { (tab === 'settings' ? settings : await import(`./${tab}.js`)).render(root); }
  catch (e) { root.innerHTML = '<h1>Binnenkort beschikbaar</h1><p class="muted">Dit onderdeel volgt later.</p>'; }
  root.dataset.ok = '1'; window.scrollTo(0, 0); root.focus({ preventScroll: true });
}

async function init() {
  $('#nav').innerHTML = '<div class="brand"><span class="logo"></span>Tafel</div>' + TABS.map(([k, l, i]) => `<button data-tab="${k}"><span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${i}</svg></span>${l}</button>`).join('');
  $('#nav').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.tab); };
  await load(); settings.applyTheme();
  if (!getMeta('sampleDone', false)) { await seedSample(); await setMeta('sampleDone', true); }
  const start = location.hash.slice(1); show(TABS.some(t => t[0] === start) ? start : 'settings');
  if (Date.now() - getMeta('lastBackup', 0) > 14 * 864e5 && (state.recipes.length || state.shopping.length) && Date.now() - getMeta('remindedAt', 0) > 864e5) {
    setMeta('remindedAt', Date.now()); toast('Tijd voor een back-up (Opties → Exporteren).');
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
init().catch(e => { $('#view').textContent = 'Kon niet starten: ' + e.message; });
