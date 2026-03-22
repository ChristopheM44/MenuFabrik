import { MealType, RecipeCategory } from '../models/Recipe';
import type { Recipe } from '../models/Recipe';

export const predefinedAllergens = [
    "Amandes", "Arachides", "Céleri", "Crustacés", "Gluten", "Lactose",
    "Lupin", "Mollusques", "Moutarde", "Noisettes", "Noix", "Noix de cajou",
    "Noix de macadamia", "Noix de pécan", "Oeuf", "Pistaches", "Poisson",
    "Sésame", "Soja", "Sulfites"
];

export const predefinedSideDishes = [
    "Ail et fines herbes", "Asperges", "Bacon", "Béchamel", "Boulgour", "Brocolis vapeur", "Burrata", "Carottes", "Carottes et courgettes",
    "Carottes râpées", "Carottes Vichy", "Caviar d'aubergine", "Champignons", "Charcuterie", "Chèvre", "Chèvre chaud", "Chips", "Chorizo", "Concombre",
    "Coquillettes", "Courgettes sautées", "Crème aux champignons", "Crudités", "Émincés de jambon", "Épinards", "Fondue de poireaux", "Frites",
    "Frites de patate douce", "Fromage", "Fromage fouetté", "Gnocchis", "Gratin dauphinois", "Gratin de chou-fleur", "Haricots verts", "Jambon",
    "Julienne de légumes", "Lardons", "Lentilles", "Mozzarella", "Nouilles sautées aux légumes", "Œuf au plat", "Olives", "Pain",
    "Parmesan râpé", "Patates douces rôties", "Pâtes", "Petits pois", "Poêlée de légumes", "Poireaux", "Polenta", "Pommes de terre",
    "Pommes noisettes", "Pommes rissolées", "Purée de légumes", "Purée de pommes de terre", "Quinoa", "Ratatouille", "Riz",
    "Riz cantonais", "Röstis de pommes de terre", "Salade verte", "Saumon fumé", "Sauce au poivre", "Sauce tomate", "Sauce yaourt et ciboulette",
    "Semoule", "Tian d'aubergines", "Tomates à la provençale"
];

// Helper to resolve lists to the format expected by the DB logic later
const mapAllergensFactory = () => (names: string[]): string[] => names; // Will be mapped to IDs by the Seeder
const mapSidesFactory = () => (names: string[]): string[] => names; // Will be mapped to IDs by the Seeder

const ma = mapAllergensFactory();
const ms = mapSidesFactory();

// Temporary definition - the seeder replaces the string arrays with ID arrays runtime
export interface RawRecipeData extends Omit<Recipe, 'id' | 'allergens' | 'suggestedSides' | 'allergenIds' | 'suggestedSideIds'> {
    allergenIds: string[];
    suggestedSideIds: string[];
}

export const predefinedRecipes: RawRecipeData[] = [
    { name: "Apero", prepTime: 10, mealType: MealType.BOTH, category: RecipeCategory.OTHER, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Arancini", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: true, suggestedSideIds: ms([]) },
    { name: "Ballotine de poulet", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Purée de légumes", "Haricots verts", "Riz"]), sourceURL: "https://cookidoo.fr/recipes/recipe/fr-FR/r57840" },
    { name: "Barbecue", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Salade verte", "Pommes rissolées", "Chips"]) },
    { name: "Bœuf aux oignons", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Soja"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Nouilles sautées aux légumes"]) },
    { name: "Boulettes de boeuf sauce tomate", prepTime: 30, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Pâtes", "Riz", "Semoule"]) },
    { name: "Boulettes de poulet tsukune", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Soja"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Poêlée de légumes"]) },
    { name: "Brunch fromage", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Brunch sucré - salé", prepTime: 30, mealType: MealType.LUNCH, category: RecipeCategory.OTHER, allergenIds: ma(["Lactose", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Burgers maison", prepTime: 30, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Butter chicken", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Pain"]) },
    { name: "Cake quinoa jambon", prepTime: 50, mealType: MealType.LUNCH, category: RecipeCategory.MEAT, allergenIds: ma(["Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Calamar à la romaine", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Gluten", "Mollusques", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Frites", "Salade verte"]) },
    { name: "Cordon bleu", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Pâtes", "Haricots verts", "Purée de légumes"]) },
    { name: "Courge farcie", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Salade verte", "Riz"]) },
    { name: "Courge spaghettis carbo", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Courgettes farcies", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Semoule"]) },
    { name: "Crevettes curry coco", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.FISH, allergenIds: ma(["Crustacés"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz"]) },
    { name: "Croque monsieur", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Donuts / Tenders / Nuggets", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Frites", "Pommes rissolées"]) },
    { name: "Fajitas", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Filet mignon", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Pommes noisettes", "Haricots verts", "Champignons"]) },
    { name: "Fish & chips", prepTime: 30, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Poisson"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Galettes blé noir", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: ma(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Galettes chou fleur", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Oeuf", "Lactose", "Gluten"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Galettes legumes", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Oeuf", "Gluten"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte", "Riz"]) },
    { name: "Gigot de 7H", prepTime: 420, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Pommes rissolées", "Haricots verts"]) },
    { name: "Gratin chou fleur", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Gyozas", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: ma(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Carottes râpées"]) },
    { name: "Hachis parmentier", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Jambon", prepTime: 5, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Purée de légumes", "Pâtes", "Frites"]) },
    { name: "Lasagnes", prepTime: 75, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSideIds: ms(["Salade verte"]) },
    { name: "McDo", prepTime: 0, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Marmite espagnole", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Nems", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: ma(["Soja"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz cantonais", "Salade verte"]) },
    { name: "Omelette jambon fromage", prepTime: 15, mealType: MealType.LUNCH, category: RecipeCategory.MEAT, allergenIds: ma(["Oeuf", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte", "Pain"]) },
    { name: "One pot poulet olive", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Pad thai", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: ma(["Soja", "Arachides"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Pâtes bolognaises", prepTime: 25, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Pâtes chinoises", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Pâtes poireaux bacon moutarde", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Pizzas", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Plancha", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Poêlée de légumes", "Salade verte", "Pommes de terre"]) },
    { name: "Poireaux jambon pdt béchamel", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Poisson pané", prepTime: 15, mealType: MealType.LUNCH, category: RecipeCategory.FISH, allergenIds: ma(["Poisson", "Gluten"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Épinards", "Purée de légumes"]) },
    { name: "Polenta gratiné poireaux", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Poulet gratiné au four", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Pâtes", "Pommes de terre"]) },
    { name: "Poulet pané", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Frites", "Salade verte"]) },
    { name: "Poulet roti", prepTime: 90, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Pommes de terre", "Haricots verts"]) },
    { name: "Quiche lorraine", prepTime: 50, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Raclette", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: true, suggestedSideIds: ms([]) },
    { name: "Risotto chorizo", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Risotto courgettes", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Rougail saucisse", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Riz"]) },
    { name: "Roulé courgette st moret", prepTime: 30, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Rouleaux printemps", prepTime: 45, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Arachides", "Soja"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Saint jacques", prepTime: 15, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Mollusques", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Fondue de poireaux", "Riz"]) },
    { name: "Salade césar", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.SALAD, allergenIds: ma(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Salade composée", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.SALAD, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Salade de pâtes", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.SALAD, allergenIds: ma(["Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Salade poulet avocat mangue quinoa", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.SALAD, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Samossas", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: ma(["Gluten"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte", "Riz cantonais"]) },
    { name: "Sandwich", prepTime: 10, mealType: MealType.LUNCH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Soupe champi", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.SOUP, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Pain"]) },
    { name: "Soupe légumes", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.SOUP, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Fromage"]) },
    { name: "Steak haché", prepTime: 10, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Frites", "Pâtes", "Haricots verts"]) },
    { name: "Tacos big mac", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Tarte au thon", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Gluten", "Lactose", "Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Tarte poireaux lardon reblochon", prepTime: 55, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Tartiflette", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: true, suggestedSideIds: ms(["Salade verte", "Charcuterie"]) },
    { name: "Tomates farcies", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Riz"]) },
    { name: "Viande rouge", prepTime: 10, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Frites", "Haricots verts"]) },
    { name: "Wraps", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: ma(["Gluten"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Poulet basquaise", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: true, suggestedSideIds: ms(["Riz", "Pommes de terre"]) },
    { name: "Blanquette de veau", prepTime: 90, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: true, suggestedSideIds: ms(["Riz", "Carottes Vichy"]) },
    { name: "Chili con carne", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Pain"]) },
    { name: "Curry de pois chiches", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Boulgour"]) },
    { name: "Dahl de lentilles", prepTime: 35, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Pain"]) },
    { name: "Moussaka", prepTime: 75, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: true, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Saumon en papillote", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Poisson"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Julienne de légumes", "Brocolis vapeur"]) },
    { name: "Gratin de coquillettes au jambon", prepTime: 35, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Endives au jambon", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Porc au caramel", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Soja"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz cantonais", "Nouilles sautées aux légumes"]) },
    { name: "Wok de boeuf aux brocolis", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Soja"]), requiresFreeTime: false, suggestedSideIds: ms(["Riz", "Nouilles sautées aux légumes"]) },
    { name: "Tarte à la moutarde et tomates", prepTime: 45, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Gluten", "Lactose", "Moutarde"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Saucisse purée", prepTime: 25, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Purée de pommes de terre", "Haricots verts"]) },
    { name: "Escalope de dinde à la crème", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma(["Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Pâtes", "Champignons", "Riz"]) },
    { name: "Shakshuka", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Pain", "Semoule"]) },
    { name: "Mac and Cheese", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Cannelloni ricotta épinards", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSideIds: ms(["Salade verte"]) },
    { name: "Salade niçoise", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.SALAD, allergenIds: ma(["Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Steak de thon grillé", prepTime: 15, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Poisson"]), requiresFreeTime: false, suggestedSideIds: ms(["Ratatouille", "Riz", "Tomates à la provençale"]) },
    { name: "Moules frites", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Mollusques"]), requiresFreeTime: false, suggestedSideIds: ms(["Frites"]) },
    { name: "Poke bowl saumon", prepTime: 25, mealType: MealType.LUNCH, category: RecipeCategory.FISH, allergenIds: ma(["Poisson", "Soja"]), requiresFreeTime: false, suggestedSideIds: ms([]) },
    { name: "Keftas d'agneau", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: ma([]), requiresFreeTime: false, suggestedSideIds: ms(["Semoule", "Sauce yaourt et ciboulette", "Courgettes sautées"]) },
    { name: "Gnocchis au gorgonzola", prepTime: 15, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Salade verte", "Noix"]) },
    { name: "Soupe à l'oignon", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.SOUP, allergenIds: ma(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: ms(["Pain", "Fromage"]) },
    { name: "Couscous poulet merguez", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: ma(["Gluten"]), requiresFreeTime: true, suggestedSideIds: ms(["Semoule", "Poêlée de légumes"]) },
    { name: "Croquettes de poisson", prepTime: 35, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: ma(["Poisson", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: ms(["Purée de pommes de terre", "Salade verte"]) }
];
