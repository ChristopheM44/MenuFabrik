import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { MealType, RecipeCategory } from '../models/Recipe';
import type { Recipe } from '../models/Recipe';
import type { Participant } from '../models/Participant';
import type { Allergen } from '../models/Allergen';
import type { SideDish } from '../models/SideDish';

const clearCollection = async (collectionName: string) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const deleteBatch = writeBatch(db);
    querySnapshot.forEach((document) => {
        deleteBatch.delete(document.ref);
    });
    if (!querySnapshot.empty) {
        await deleteBatch.commit();
    }
};

export const seedDatabase = async () => {
    try {
        console.log("Démarrage du DataSeeder Web (Mode Relationnel)...");

        console.log("Nettoyage des anciennes données...");
        await clearCollection('recipes');
        await clearCollection('participants');
        await clearCollection('sideDishes');
        await clearCollection('allergens');

        const batch = writeBatch(db);

        // --- 1. ALLERGÈNES ---
        const allergenNames = [
            "Amandes", "Arachides", "Céleri", "Crustacés", "Gluten", "Lactose",
            "Lupin", "Mollusques", "Moutarde", "Noisettes", "Noix", "Noix de cajou",
            "Noix de macadamia", "Noix de pécan", "Oeuf", "Pistaches", "Poisson",
            "Sésame", "Soja", "Sulfites"
        ];

        // Map pour garder les IDs générés (nom -> id)
        const allergensMap = new Map<string, string>();

        allergenNames.forEach(name => {
            const ref = doc(collection(db, 'allergens'));
            allergensMap.set(name, ref.id);
            const allergen: Allergen = { name }; // L'ID n'est pas forcément stocké dans le body, Firestore l'a en clé primaire, mais on peut le mettre
            batch.set(ref, allergen);
        });

        // Helper
        const mapAllergens = (names: string[]): string[] => {
            return names.map(n => allergensMap.get(n)!).filter(Boolean);
        };

        // --- 2. ACCOMPAGNEMENTS (SideDishes) ---
        const sideDishNames = [
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

        const sideDishesMap = new Map<string, string>();

        sideDishNames.forEach(name => {
            const ref = doc(collection(db, 'sideDishes'));
            sideDishesMap.set(name, ref.id);
            const side: SideDish = { name };
            batch.set(ref, side);
        });

        // Helper
        const mapSides = (names: string[]): string[] => {
            return names.map(n => sideDishesMap.get(n)!).filter(Boolean);
        };

        // --- 3. PARTICIPANTS ---
        const participantsData: Omit<Participant, 'id' | 'allergies'>[] = [
            { name: "Christophe", isActive: true, allergyIds: mapAllergens(["Arachides"]) },
            { name: "Edith", isActive: true, allergyIds: mapAllergens(["Gluten"]) },
            { name: "Jonathan", isActive: true, allergyIds: [] },
            { name: "Kylian", isActive: true, allergyIds: [] }
        ];

        participantsData.forEach(p => {
            const pRef = doc(collection(db, 'participants'));
            batch.set(pRef, p);
        });

        // --- 4. RECETTES ---
        const recipesData: Omit<Recipe, 'id' | 'allergens' | 'suggestedSides'>[] = [
            { name: "Apero", prepTime: 10, mealType: MealType.BOTH, category: RecipeCategory.OTHER, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Arancini", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: true, suggestedSideIds: mapSides([]) },
            { name: "Ballotine de poulet", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Purée de légumes", "Haricots verts", "Riz"]), sourceURL: "https://cookidoo.fr/recipes/recipe/fr-FR/r57840" },
            { name: "Barbecue", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Salade verte", "Pommes rissolées", "Chips"]) },
            { name: "Bœuf aux oignons", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Nouilles sautées aux légumes"]) },
            { name: "Boulettes de boeuf sauce tomate", prepTime: 30, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pâtes", "Riz", "Semoule"]) },
            { name: "Boulettes de poulet tsukune", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Poêlée de légumes"]) },
            { name: "Brunch fromage", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Brunch sucré - salé", prepTime: 30, mealType: MealType.LUNCH, category: RecipeCategory.OTHER, allergenIds: mapAllergens(["Lactose", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Burgers maison", prepTime: 30, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Butter chicken", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Pain"]) },
            { name: "Cake quinoa jambon", prepTime: 50, mealType: MealType.LUNCH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Calamar à la romaine", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Gluten", "Mollusques", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Frites", "Salade verte"]) },
            { name: "Cordon bleu", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pâtes", "Haricots verts", "Purée de légumes"]) },
            { name: "Courge farcie", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Salade verte", "Riz"]) },
            { name: "Courge spaghettis carbo", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Courgettes farcies", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Semoule"]) },
            { name: "Crevettes curry coco", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Crustacés"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz"]) },
            { name: "Croque monsieur", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Donuts / Tenders / Nuggets", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Frites", "Pommes rissolées"]) },
            { name: "Fajitas", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Filet mignon", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pommes noisettes", "Haricots verts", "Champignons"]) },
            { name: "Fish & chips", prepTime: 30, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Poisson"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Galettes blé noir", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Galettes chou fleur", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Oeuf", "Lactose", "Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Galettes legumes", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Oeuf", "Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte", "Riz"]) },
            { name: "Gigot de 7H", prepTime: 420, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Pommes rissolées", "Haricots verts"]) },
            { name: "Gratin chou fleur", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Gyozas", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Carottes râpées"]) },
            { name: "Hachis parmentier", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Jambon", prepTime: 5, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Purée de légumes", "Pâtes", "Frites"]) },
            { name: "Lasagnes", prepTime: 75, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "McDo", prepTime: 0, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Marmite espagnole", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Nems", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz cantonais", "Salade verte"]) },
            { name: "Omelette jambon fromage", prepTime: 15, mealType: MealType.LUNCH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Oeuf", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte", "Pain"]) },
            { name: "One pot poulet olive", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Pad thai", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Soja", "Arachides"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Pâtes bolognaises", prepTime: 25, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Pâtes chinoises", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten", "Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Pâtes poireaux bacon moutarde", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Pizzas", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Plancha", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Poêlée de légumes", "Salade verte", "Pommes de terre"]) },
            { name: "Poireaux jambon pdt béchamel", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose", "Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Poisson pané", prepTime: 15, mealType: MealType.LUNCH, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Poisson", "Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Épinards", "Purée de légumes"]) },
            { name: "Polenta gratiné poireaux", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Poulet gratiné au four", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Pâtes", "Pommes de terre"]) },
            { name: "Poulet pané", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Frites", "Salade verte"]) },
            { name: "Poulet roti", prepTime: 90, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Pommes de terre", "Haricots verts"]) },
            { name: "Quiche lorraine", prepTime: 50, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Raclette", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSideIds: mapSides([]) },
            { name: "Risotto chorizo", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Risotto courgettes", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Rougail saucisse", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz"]) },
            { name: "Roulé courgette st moret", prepTime: 30, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Rouleaux printemps", prepTime: 45, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Arachides", "Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Saint jacques", prepTime: 15, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Mollusques", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Fondue de poireaux", "Riz"]) },
            { name: "Salade césar", prepTime: 20, mealType: MealType.BOTH, category: RecipeCategory.SALAD, allergenIds: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Salade composée", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.SALAD, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Salade de pâtes", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.SALAD, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Salade poulet avocat mangue quinoa", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.SALAD, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Samossas", prepTime: 45, mealType: MealType.DINNER, category: RecipeCategory.OTHER, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte", "Riz cantonais"]) },
            { name: "Sandwich", prepTime: 10, mealType: MealType.LUNCH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Soupe champi", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.SOUP, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pain"]) },
            { name: "Soupe légumes", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.SOUP, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Fromage"]) },
            { name: "Steak haché", prepTime: 10, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Frites", "Pâtes", "Haricots verts"]) },
            { name: "Tacos big mac", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Tarte au thon", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Gluten", "Lactose", "Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Tarte poireaux lardon reblochon", prepTime: 55, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Gluten", "Lactose", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Tartiflette", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSideIds: mapSides(["Salade verte", "Charcuterie"]) },
            { name: "Tomates farcies", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Riz"]) },
            { name: "Viande rouge", prepTime: 10, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Frites", "Haricots verts"]) },
            { name: "Wraps", prepTime: 15, mealType: MealType.BOTH, category: RecipeCategory.FAST_FOOD, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Poulet basquaise", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: true, suggestedSideIds: mapSides(["Riz", "Pommes de terre"]) },
            { name: "Blanquette de veau", prepTime: 90, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSideIds: mapSides(["Riz", "Carottes Vichy"]) },
            { name: "Chili con carne", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Pain"]) },
            { name: "Curry de pois chiches", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Boulgour"]) },
            { name: "Dahl de lentilles", prepTime: 35, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Pain"]) },
            { name: "Moussaka", prepTime: 75, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: true, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Saumon en papillote", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Poisson"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Julienne de légumes", "Brocolis vapeur"]) },
            { name: "Gratin de coquillettes au jambon", prepTime: 35, mealType: MealType.BOTH, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Endives au jambon", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Porc au caramel", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz cantonais", "Nouilles sautées aux légumes"]) },
            { name: "Wok de boeuf aux brocolis", prepTime: 25, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Riz", "Nouilles sautées aux légumes"]) },
            { name: "Tarte à la moutarde et tomates", prepTime: 45, mealType: MealType.LUNCH, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Gluten", "Lactose", "Moutarde"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Saucisse purée", prepTime: 25, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Purée de pommes de terre", "Haricots verts"]) },
            { name: "Escalope de dinde à la crème", prepTime: 20, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pâtes", "Champignons", "Riz"]) },
            { name: "Shakshuka", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pain", "Semoule"]) },
            { name: "Mac and Cheese", prepTime: 40, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Cannelloni ricotta épinards", prepTime: 60, mealType: MealType.DINNER, category: RecipeCategory.VEGETARIAN, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: true, suggestedSideIds: mapSides(["Salade verte"]) },
            { name: "Salade niçoise", prepTime: 20, mealType: MealType.LUNCH, category: RecipeCategory.SALAD, allergenIds: mapAllergens(["Oeuf", "Poisson"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Steak de thon grillé", prepTime: 15, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Poisson"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Ratatouille", "Riz", "Tomates à la provençale"]) },
            { name: "Moules frites", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Mollusques"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Frites"]) },
            { name: "Poke bowl saumon", prepTime: 25, mealType: MealType.LUNCH, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Poisson", "Soja"]), requiresFreeTime: false, suggestedSideIds: mapSides([]) },
            { name: "Keftas d'agneau", prepTime: 30, mealType: MealType.DINNER, category: RecipeCategory.MEAT, allergenIds: mapAllergens([]), requiresFreeTime: false, suggestedSideIds: mapSides(["Semoule", "Sauce yaourt et ciboulette", "Courgettes sautées"]) },
            { name: "Gnocchis au gorgonzola", prepTime: 15, mealType: MealType.DINNER, category: RecipeCategory.PASTA, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Salade verte", "Noix"]) },
            { name: "Soupe à l'oignon", prepTime: 50, mealType: MealType.DINNER, category: RecipeCategory.SOUP, allergenIds: mapAllergens(["Gluten", "Lactose"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Pain", "Fromage"]) },
            { name: "Couscous poulet merguez", prepTime: 60, mealType: MealType.BOTH, category: RecipeCategory.MEAT, allergenIds: mapAllergens(["Gluten"]), requiresFreeTime: true, suggestedSideIds: mapSides(["Semoule", "Poêlée de légumes"]) },
            { name: "Croquettes de poisson", prepTime: 35, mealType: MealType.DINNER, category: RecipeCategory.FISH, allergenIds: mapAllergens(["Poisson", "Gluten", "Oeuf"]), requiresFreeTime: false, suggestedSideIds: mapSides(["Purée de pommes de terre", "Salade verte"]) }
        ];

        recipesData.forEach(r => {
            const rRef = doc(collection(db, 'recipes'));
            batch.set(rRef, r);
        });

        // Commit du batch : Envoie tout en une seule requête optimisée !
        console.log("Envoi du lot vers Firestore...");
        await batch.commit();
        console.log("Les données RELATIONNELLES ont été injectées avec succès ! ✅");

    } catch (error) {
        console.error("Erreur lors de l'injection :", error);
    }
};
