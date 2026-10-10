// Settings view: theme, defaults, backup/export/import, reset.
import * as db from './db.js';
import { state, load, setMeta, getMeta } from './state.js';
import { esc, toast } from './utils.js';
import { seedSample, removeSample } from './seed.js';

export function applyTheme() { const t = getMeta('theme', 'auto'); t === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.dataset.theme = t; }

export function render(root) {
  const last = getMeta('lastBackup', null);
  root.innerHTML = `<h1>Opties</h1>
  <div class="card"><label class="f" for="theme">Thema</label>
   <select id="theme">${['auto','light','dark'].map(v => `<option value="${v}" ${getMeta('theme','auto')===v?'selected':''}>${{auto:'Automatisch',light:'Licht',dark:'Donker'}[v]}</option>`).join('')}</select>
   <label class="f" for="serv">Standaard porties</label><input id="serv" type="number" min="1" inputmode="numeric" value="${esc(getMeta('servings', 2))}">
   <label class="f" for="wk">Week begint op</label>
   <select id="wk"><option value="1" ${getMeta('weekStart',1)==1?'selected':''}>Maandag</option><option value="0" ${getMeta('weekStart',1)==0?'selected':''}>Zondag</option></select></div>
  <div class="card"><h2 style="margin-top:0">Back-up</h2>
   <p class="muted">iOS kan websitegegevens wissen na weken zonder gebruik. Exporteer regelmatig.<br>Laatste back-up: ${last ? esc(new Date(last).toLocaleString('nl-BE')) : 'nooit'}</p>
   <div class="row"><button class="btn primary" id="exp">Exporteren (JSON)</button>
   <label class="btn" tabindex="0">Importeren (JSON)<input id="imp" type="file" accept="application/json,.json" hidden></label></div></div>
  <div class="card"><div class="row"><button class="btn" id="rmSample">Voorbeelddata verwijderen</button><button class="btn" id="addSample">Voorbeelddata toevoegen</button></div></div>
  <div class="card"><button class="btn danger" id="reset">Alle gegevens wissen</button></div>`;
  root.querySelector('#theme').onchange = async e => { await setMeta('theme', e.target.value); applyTheme(); };
  root.querySelector('#serv').onchange = e => setMeta('servings', Math.max(1, +e.target.value || 2));
  root.querySelector('#wk').onchange = e => setMeta('weekStart', +e.target.value);
  root.querySelector('#exp').onclick = async () => {
    const blob = new Blob([JSON.stringify(await db.exportAll(), null, 2)], { type: 'application/json' });
    const file = new File([blob], `tafel-${new Date().toISOString().slice(0,10)}.json`, { type: 'application/json' });
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }); else throw 0; }
    catch (e) { if (e?.name === 'AbortError') return; const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5e3); }
    await setMeta('lastBackup', Date.now()); render(root); toast('Back-up geëxporteerd');
  };
  root.querySelector('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const json = JSON.parse(await f.text()); if (!confirm('ALLE huidige gegevens vervangen door deze back-up?')) return;
      await db.importAll(json); await load(); toast('Back-up geïmporteerd'); render(root);
    } catch (err) { toast(err instanceof SyntaxError ? 'Bestand is geen geldige JSON.' : err.message, { error: true }); }
  };
  root.querySelector('#rmSample').onclick = async () => { await removeSample(); toast('Voorbeelddata verwijderd'); };
  root.querySelector('#addSample').onclick = async () => { await seedSample(); toast('Voorbeeldrecepten toegevoegd'); };
  root.querySelector('#reset').onclick = async () => { if (!confirm('Alles verwijderen? Exporteer eerst als je twijfelt.')) return; await db.resetAll(); state.meta = {}; await load(); toast('Alle gegevens gewist'); render(root); };
}
