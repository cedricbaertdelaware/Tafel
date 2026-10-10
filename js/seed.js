// Belgian-friendly sample data. Everything seeded carries sample:true so one click removes it.
import { state, save, remove } from './state.js';
import { uid } from './utils.js';
const R = [
 ['Stoofvlees met friet', 4, 30, 180, ['klassiek', 'winter'], [['rundsvlees (stoofvlees)', 800, 'g', 'meat/fish'], ['ui', 3, 'pcs', 'produce'], ['donker bier', 500, 'ml', 'drinks'], ['bruin brood', 2, 'pcs', 'bakery'], ['mosterd', 2, 'tbsp', 'pantry'], ['bruine suiker', 1, 'tbsp', 'pantry'], ['boter', 50, 'g', 'dairy'], ['aardappelen', 1, 'kg', 'produce']],
  'Bruin het vlees in boter. Fruit de uien, voeg bier, mosterd, suiker en met mosterd besmeerd brood toe. Laat 2,5 tot 3 uur sudderen. Serveer met frietjes.'],
 ['Witloof met ham en kaas', 4, 20, 35, ['klassiek', 'oven'], [['witloof', 8, 'pcs', 'produce'], ['gekookte hesp', 8, 'pcs', 'meat/fish'], ['geraspte kaas', 200, 'g', 'dairy'], ['melk', 500, 'ml', 'dairy'], ['boter', 50, 'g', 'dairy'], ['bloem', 50, 'g', 'pantry'], ['aardappelen', 1, 'kg', 'produce']],
  'Kook het witloof 10 min en rol er hesp rond. Maak een bechamelsaus met boter, bloem en melk en roer de helft van de kaas erdoor. Giet over het witloof, strooi de rest van de kaas erover en bak 25 min op 200°C. Serveer met puree.'],
 ['Spaghetti bolognese', 4, 15, 40, ['snel', 'pasta'], [['spaghetti', 400, 'g', 'pantry'], ['gehakt', 500, 'g', 'meat/fish'], ['ui', 1, 'pcs', 'produce'], ['tomatenblokjes', 800, 'g', 'pantry'], ['wortel', 2, 'pcs', 'produce'], ['look (tenen)', 2, 'pcs', 'produce']],
  'Fruit ui, wortel en look, bruin het gehakt, voeg de tomaten toe en laat 30 min sudderen. Kook de spaghetti en serveer.'],
];
export async function seedSample() {
  for (const [name, servings, prep, cook, tags, rows, instructions] of R) {
    const ings = [];
    for (const [n, quantity, unit, category] of rows) {
      let g = state.ingredients.find(x => x.name.toLowerCase() === n.toLowerCase());
      if (!g) g = await save('ingredients', { id: uid(), name: n, category, preferredStoreId: null, alternativeStoreIds: [], price: null, priceUnit: null, notes: '', sample: true });
      ings.push({ ingredientId: g.id, quantity, unit, note: '' });
    }
    await save('recipes', { id: uid(), name, servings, prep, cook, tags, link: '', photo: '', favorite: false, notes: '', instructions, ingredients: ings, sample: true });
  }
}
export async function removeSample() {
  const gone = new Set(state.recipes.filter(r => r.sample).map(r => r.id));
  for (const id of gone) await remove('recipes', id);
  for (const e of state.plan.filter(e => gone.has(e.recipeId))) await remove('plan', e.key);
  const used = new Set([...state.recipes.flatMap(r => r.ingredients.map(i => i.ingredientId)), ...state.shopping.map(s => s.ingredientId), ...state.pantry.map(p => p.id)]);
  for (const g of state.ingredients.filter(g => g.sample && !used.has(g.id))) await remove('ingredients', g.id);
}
