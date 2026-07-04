/**
 * Ingredient Model
 * Represents an ingredient in a recipe with scaling options
 */

export type ScaleType = 'full' | 'half' | 'none';

export interface Ingredient {
  id?: string;
  recipeId?: string; // Reference to the post/recipe
  name: string;
  amount: number;
  unit: string;
  
  /**
   * Whether this ingredient scales with servings
   * @default true
   */
  scalable?: boolean;
  
  /**
   * How the ingredient scales:
   * - 'full': 1:1 scaling (double servings = double amount)
   * - 'half': 0.5x scaling (double servings = 1.5x amount) - Good for seasonings
   * - 'none': No scaling (amount stays fixed) - Good for salt, water for boiling, etc.
   * @default 'full'
   */
  scaleType?: ScaleType;
  
  /**
   * Optional notes about this ingredient
   * e.g., "room temperature", "softened", "divided"
   */
  notes?: string;
  
  /**
   * Order/position in the ingredient list
   */
  order?: number;
  
  /**
   * Optional category grouping
   * e.g., "For the dough", "For the filling", "For garnish"
   */
  category?: string;
  
  /**
   * Whether this ingredient is optional
   */
  optional?: boolean;
  
  /**
   * Substitution suggestions
   */
  substitutions?: string[];
}

/**
 * Helper function to calculate adjusted ingredient amount based on servings
 */
export function calculateIngredientAmount(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number
): number {
  const ratio = targetServings / baseServings;
  
  if (ingredient.scaleType === 'none' || ingredient.scalable === false) {
    return ingredient.amount;
  }
  
  if (ingredient.scaleType === 'half') {
    // Half scaling: scales at 50% of the serving ratio
    const halfRatio = 1 + (ratio - 1) * 0.5;
    return ingredient.amount * halfRatio;
  }
  
  // Default: full scaling
  return ingredient.amount * ratio;
}

/**
 * Helper function to format ingredient amounts nicely with fractions
 */
export function formatIngredientAmount(amount: number): string {
  const whole = Math.floor(amount);
  const fraction = amount - whole;
  
  const fractionMap: { [key: string]: string } = {
    '0.125': '⅛',
    '0.25': '¼',
    '0.333': '⅓',
    '0.375': '⅜',
    '0.5': '½',
    '0.625': '⅝',
    '0.666': '⅔',
    '0.75': '¾',
    '0.875': '⅞',
  };

  // Round to nearest common fraction (1/8ths)
  const roundedFraction = Math.round(fraction * 8) / 8;
  const fractionStr = fractionMap[roundedFraction.toFixed(3)];

  if (whole === 0 && fractionStr) {
    return fractionStr;
  } else if (whole > 0 && fractionStr) {
    return `${whole} ${fractionStr}`;
  } else if (whole > 0 && fraction === 0) {
    return whole.toString();
  } else {
    // Fallback to decimal with max 2 decimal places
    return amount.toFixed(amount % 1 === 0 ? 0 : 2);
  }
}

/**
 * Format a complete ingredient for display
 */
export function formatIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number
): string {
  const amount = calculateIngredientAmount(ingredient, baseServings, targetServings);
  const formattedAmount = formatIngredientAmount(amount);
  const notes = ingredient.notes ? `, ${ingredient.notes}` : '';
  const optional = ingredient.optional ? ' (optional)' : '';
  
  return `${formattedAmount} ${ingredient.unit} ${ingredient.name}${notes}${optional}`;
}
