export interface ShoppingItem {
    id?: string;
    name: string;
    details?: string;
    checked: boolean;
    source: 'recipe' | 'manual' | 'pantry';
    addedAt: string; // ISO String 
}
