import type { Ingredient } from '../models/Recipe';

// Parse "1. Step one\n2. Step two" into ["Step one", "Step two"]
export function parseSteps(instructions: string): string[] {
  return instructions
    .split(/\n+/)
    .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(line => line.length > 0);
}

// Normalize string: lowercase + remove accents
function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Match ingredients mentioned in a step (regex-based, handles plural)
export function matchIngredientsToStep(step: string, ingredients: Ingredient[]): Ingredient[] {
  const normalizedStep = normalize(step);
  return ingredients.filter(ingredient => {
    const normalizedName = normalize(ingredient.name);
    // Try exact match, then without trailing 's' (plural)
    const singular = normalizedName.replace(/s$/, '');
    return normalizedStep.includes(normalizedName) || (singular.length > 3 && normalizedStep.includes(singular));
  });
}

export interface TimerInfo {
  id: string;
  label: string;
  seconds: number;
}

// Extract time references from step text: "15 min", "1h30", "2 heures", "30 secondes"
export function extractTimers(stepText: string): TimerInfo[] {
  const timers: TimerInfo[] = [];

  // Match compound patterns like "1h30" or "1 heure 30 minutes"
  const compoundRegex = /(\d+)\s*h(?:eures?)?\s*(\d+)\s*min(?:utes?)?/gi;
  let match;
  while ((match = compoundRegex.exec(stepText)) !== null) {
    const hours = parseInt(match[1] ?? '0');
    const mins = parseInt(match[2] ?? '0');
    const seconds = hours * 3600 + mins * 60;
    const label = `${hours}h${mins.toString().padStart(2, '0')}`;
    timers.push({ id: `timer_${timers.length}`, label, seconds });
  }

  // Match simple patterns: X min, X minutes, X heures, X h, X secondes
  const simpleRegex = /(\d+)\s*(h(?:eures?)?|min(?:utes?)?|secondes?)/gi;
  // Remove already-matched compound regions to avoid double-matching
  const cleanedText = stepText.replace(compoundRegex, '');
  while ((match = simpleRegex.exec(cleanedText)) !== null) {
    const value = parseInt(match[1] ?? '0');
    const unit = (match[2] ?? '').toLowerCase();
    let seconds = 0;
    let label = '';
    if (unit.startsWith('h')) {
      seconds = value * 3600;
      label = `${value}h`;
    } else if (unit.startsWith('min')) {
      seconds = value * 60;
      label = `${value} min`;
    } else if (unit.startsWith('sec')) {
      seconds = value;
      label = `${value} sec`;
    }
    if (seconds > 0) {
      timers.push({ id: `timer_${timers.length}`, label, seconds });
    }
  }

  return timers;
}
