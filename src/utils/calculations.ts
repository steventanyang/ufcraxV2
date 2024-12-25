import { Fighter } from "@/types/fighters";
import { getMonthDay } from "@/components/Recommendations";

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
    return Array.from(scoresByDay.values()).reduce(
      (sum, value) => sum + value,
      0
    );
  }
  