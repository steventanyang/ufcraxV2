import { Fighter } from "@/types/fighters";
import { getMonthDay } from "@/components/Recommendations";

// RAX caps per rarity (Team/Fighter column)
export function getRaxCap(multiplier: number): number | null {
  if (multiplier <= 1.2) return 1500;      // Common
  if (multiplier <= 1.4) return 2500;      // Uncommon
  if (multiplier <= 1.6) return 4000;      // Rare
  if (multiplier <= 2.0) return 6000;      // Epic
  if (multiplier <= 6.6) return 12000;     // Legendary (5.0-6.6)
  if (multiplier <= 11.8) return 24000;    // Mystic (10.0-11.8)
  return null;                              // Iconic - unlimited
}

export function calculateDailyAdjustedValue(
    fighter: Fighter,
    multiplier: number = 1.2
  ) {
    // Group scores by month-day to only take highest value per day
    const scoresByDay = new Map<string, number>();
  
    fighter.scores.forEach((score) => {
      const monthDay = getMonthDay(score.date);
      const scoreValue = score.value * multiplier;
  
      // Only keep the highest value for each day
      if (!scoresByDay.has(monthDay) || scoreValue > scoresByDay.get(monthDay)!) {
        scoresByDay.set(monthDay, scoreValue);
      }
    });
  
    // Sum up the highest score from each day
    const total = Array.from(scoresByDay.values()).reduce(
      (sum, value) => sum + value,
      0
    );

    // Apply RAX cap based on rarity
    const cap = getRaxCap(multiplier);
    if (cap !== null && total > cap) {
      return cap;
    }
    return total;
  }
  