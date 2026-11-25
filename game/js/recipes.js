// recipes.js — the menu of Dapur Kilat: every ingredient and every dish.
// One clear job: data only. No drawing, no sound, no game state lives here.
//
// Dishes are original inventions of this kitchen (street-food style names
// for everyday Indonesian food, no copied characters, brands or levels).

// One ingredient you can pick up from the counter.
//   id: short key used by the game logic and the save-free session state
//   name: the label painted on its bin
//   key: keyboard shortcut (1-6)
//   color: the bin's accent colour, also used for its ticket dot
//   prepSeconds: how long it sizzles/chops on the prep board before it is ready
//   blurb: one line the ticket and the help panel show
export const INGREDIENTS = [
  { id: 'nasi',   name: 'Nasi',   key: '1', color: '#f5efe0', prepSeconds: 0.8, blurb: 'Nasi putih pulen, masih mengepul.' },
  { id: 'mie',    name: 'Mie',    key: '2', color: '#f2c14e', prepSeconds: 1.0, blurb: 'Mie kuning kenyal, siap digoreng.' },
  { id: 'ayam',   name: 'Ayam',   key: '3', color: '#c98a4b', prepSeconds: 2.2, blurb: 'Ayam goreng renyah, harus dibakar dulu.' },
  { id: 'telur',  name: 'Telur',  key: '4', color: '#f6d860', prepSeconds: 1.2, blurb: 'Telur mata sapi, kuningnya utuh.' },
  { id: 'sayur',  name: 'Sayur',  key: '5', color: '#58b368', prepSeconds: 0.9, blurb: 'Sayur segar, dipotong tipis-tipis.' },
  { id: 'sambal', name: 'Sambal', key: '6', color: '#d64541', prepSeconds: 0.6, blurb: 'Sambal pedas manis, hati-hati!' },
];

// One dish a customer can order.
//   needs: ingredient ids, in any order — the plate must hold exactly this set
//   price: base coins the dish pays
//   minLevel: the shift level from which customers start asking for it
export const RECIPES = [
  { id: 'sayur-telur', name: 'Sayur Telur Sehat', needs: ['sayur', 'telur'], price: 40, minLevel: 1 },
  { id: 'nasi-goreng', name: 'Nasi Goreng Kilat', needs: ['nasi', 'telur', 'sambal'], price: 60, minLevel: 1 },
  { id: 'mie-goreng',  name: 'Mie Goreng Telur',  needs: ['mie', 'telur', 'sayur'], price: 60, minLevel: 1 },
  { id: 'mie-ayam',    name: 'Mie Ayam Spesial',  needs: ['mie', 'ayam', 'sayur'], price: 80, minLevel: 2 },
  { id: 'ayam-geprek', name: 'Nasi Ayam Geprek',  needs: ['nasi', 'ayam', 'sambal'], price: 80, minLevel: 2 },
  { id: 'sate-ayam',   name: 'Sate Ayam Bakar',   needs: ['ayam', 'sambal', 'sayur'], price: 90, minLevel: 3 },
];

// Look an ingredient up by id; falls back to the first one so a bad id never crashes a render.
export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id) ?? INGREDIENTS[0];
}

// Look a recipe up by id.
export function recipeById(id) {
  return RECIPES.find((dish) => dish.id === id) ?? RECIPES[0];
}

// The dishes customers may order at a given shift level.
export function recipesForLevel(level) {
  return RECIPES.filter((dish) => dish.minLevel <= level);
}

// Do the ingredient ids on a plate match a recipe exactly (order does not matter)?
export function plateMatchesRecipe(plateIds, recipe) {
  if (plateIds.length !== recipe.needs.length) return false;
  const sortedPlate = [...plateIds].sort();
  const sortedNeeds = [...recipe.needs].sort();
  return sortedPlate.every((id, index) => id === sortedNeeds[index]);
}

// The display names of a recipe's ingredients, for tickets and help text.
export function recipeNeedsNames(recipe) {
  return recipe.needs.map((id) => ingredientById(id).name);
}
