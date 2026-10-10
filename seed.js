// Belgian-friendly sample data. Everything seeded carries sample:true so one click removes it.
import { state, save, remove } from './state.js';
import { uid } from './utils.js';
const R = [
 ['Stoofvlees met friet', 4, 30, 180, ['classic', 'winter'], [['beef stewing meat', 800, 'g', 'meat/fish'], ['onion', 3, 'pcs', 'produce'], ['dark Belgian beer', 500, 'ml', 'drinks'], ['brown bread', 2, 'pcs', 'bakery'], ['mustard', 2, 'tbsp', 'pantry'], ['brown sugar', 1, 'tbsp', 'pantry'], ['butter', 50, 'g', 'dairy'], ['potatoes', 1, 'kg', 'produce']],
  'Brown the beef in butter. Fry the onions, add beer, mustard, sugar and bread spread with mustard. Simmer 2.5-3 hours. Serve with fries.'],
 ['Witloof met ham en kaas', 4, 20, 35, ['classic', 'oven'], [['chicory', 8, 'pcs', 'produce'], ['cooked ham slices', 8, 'pcs', 'meat/fish'], ['grated cheese', 200, 'g', 'dairy'], ['milk', 500, 'ml', 'dairy'], ['butter', 50, 'g', 'dairy'], ['flour', 50, 'g', 'pantry'], ['potatoes', 1, 'kg', 'produce']],
  'Boil the chicory 10 min, wrap in ham. Make a béchamel with butter, flour and milk, add half the cheese. Pour over, top with cheese, bake 25 min at 200°C. Serve with mash.'],
 ['Spaghetti bolognese', 4, 15, 40, ['quick', 'pasta'], [['spaghetti', 400, 'g', 'pantry'], ['minced meat', 500, 'g', 'meat/fish'], ['onion', 1, 'pcs', 'produce'], ['canned tomatoes', 800, 'g', 'pantry'], ['carrot', 2, 'pcs', 'produce'], ['garlic cloves', 2, 'pcs', 'produce']],
  'Fry onion, carrot and garlic, brown the meat, add tomatoes and simmer 30 min. Cook the spaghetti and serve.'],
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
