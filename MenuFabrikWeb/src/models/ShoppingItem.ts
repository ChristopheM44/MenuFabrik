export interface ShoppingItem {
    id?: string;
    name: string;
    details?: string;
    recipeNames?: string[];
    customQuantity?: number;
    checked: boolean;
    source: 'recipe' | 'manual' | 'pantry';
    addedAt: string; // ISO String 
}
