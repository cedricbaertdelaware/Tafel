// Settings view: theme, defaults, backup/export/import, reset.
import * as db from './db.js';
import { state, load, setMeta, getMeta } from './state.js';
import { esc, toast } from './utils.js';

export function applyTheme() { const t = getMeta('theme', 'auto'); t === 'auto' ? document.documentElement.removeAttribute('data-theme') : document.documentElement.dataset.theme = t; }

export function render(root) {
  const last = getMeta('lastBackup', null);
  root.innerHTML = `<h1>Settings</h1>
  <div class="card"><label class="f" for="theme">Theme</label>
   <select id="theme">${['auto','light','dark'].map(v => `<option ${getMeta('theme','auto')===v?'selected':''}>${v}</option>`).join('')}</select>
   <label class="f" for="serv">Default servings</label><input id="serv" type="number" min="1" inputmode="numeric" value="${esc(getMeta('servings', 2))}">
   <label class="f" for="wk">Week starts on</label>
   <select id="wk"><option value="1" ${getMeta('weekStart',1)==1?'selected':''}>Monday</option><option value="0" ${getMeta('weekStart',1)==0?'selected':''}>Sunday</option></select></div>
  <div class="card"><h2 style="margin-top:0">Backup</h2>
   <p class="muted">iOS can erase website data after weeks of inactivity. Export regularly.<br>Last backup: ${last ? esc(new Date(last).toLocaleString('en-BE')) : 'never'}</p>
   <div class="row"><button class="btn primary" id="exp">Export JSON</button>
   <label class="btn" tabindex="0">Import JSON<input id="imp" type="file" accept="application/json,.json" hidden></label></div></div>
  <div class="card"><button class="btn danger" id="reset">Reset all data</button></div>`;
  root.querySelector('#theme').onchange = async e => { await setMeta('theme', e.target.value); applyTheme(); };
  root.querySelector('#serv').onchange = e => setMeta('servings', Math.max(1, +e.target.value || 2));
  root.querySelector('#wk').onchange = e => setMeta('weekStart', +e.target.value);
  root.querySelector('#exp').onclick = async () => {
    const blob = new Blob([JSON.stringify(await db.exportAll(), null, 2)], { type: 'application/json' });
    const file = new File([blob], `tafel-${new Date().toISOString().slice(0,10)}.json`, { type: 'application/json' });
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }); else throw 0; }
    catch (e) { if (e?.name === 'AbortError') return; const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5e3); }
    await setMeta('lastBackup', Date.now()); render(root); toast('Backup exported');
  };
  root.querySelector('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const json = JSON.parse(await f.text()); if (!confirm('Replace ALL current data with this backup?')) return;
      await db.importAll(json); await load(); toast('Backup imported'); render(root);
    } catch (err) { toast(err instanceof SyntaxError ? 'File is not valid JSON.' : err.message, { error: true }); }
  };
  root.querySelector('#reset').onclick = async () => { if (!confirm('Delete everything? Export first if unsure.')) return; await db.resetAll(); state.meta = {}; await load(); toast('All data reset'); render(root); };
}
