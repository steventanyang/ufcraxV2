import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { Fighter, FighterData } from "../types/fighters";

interface ValueCSV {
  name: string;
  Value: string;
}

interface FightHistoryCSV {
  fighter_name: string;
  date: string;
  total_points: string;
}

interface ActiveOverride {
  name: string;
  active: boolean;
}

const activeOverrides: ActiveOverride[] = [
  { name: "Mauricio Rua", active: false },
  { name: "Amanda Nunes", active: false },
  { name: "Robbie Lawler", active: false },
  { name: "Ovince Saint Preux", active: false },
  { name: "Matt Brown", active: false },
  { name: "Stipe Miocic", active: false },
];

export function processFighterData(
  valueFilePath: string,
  historyFilePath: string
): FighterData {
  const valueContent = readFileSync(valueFilePath, "utf-8");
  const historyContent = readFileSync(historyFilePath, "utf-8");

  // Read the owned passes data
  const ownedPassesContent = readFileSync(
    "./public/data/fighters_values.json",
    "utf-8"
  );
  const ownedPassesData = JSON.parse(ownedPassesContent);

  const valueData = parse(valueContent, {
    columns: true,
    skip_empty_lines: true,
  }) as ValueCSV[];

  const historyData = parse(historyContent, {
    columns: true,
    skip_empty_lines: true,
  }) as FightHistoryCSV[];

  // Create fighters map
  const fightersMap = new Map<string, Fighter>();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Process value data first
  valueData.forEach((row) => {
    fightersMap.set(row.name, {
      name: row.name,
      value: parseInt(row.Value),
      scores: [],
      active: false,
      ownedPasses: parseInt(ownedPassesData[row.name] || "0"),
    });
  });

  // Add fight history and check active status
  historyData.forEach((row) => {
    const fighter = fightersMap.get(row.fighter_name);
    if (fighter) {
      const fightDate = new Date(row.date);
      fighter.scores.push({
        date: row.date,
        value: parseInt(row.total_points),
      });

      // Update active status if fight is within last 2 years
      if (fightDate > twoYearsAgo) {
        fighter.active = true;
      }
    }
  });

  // Sort scores by date for each fighter
  fightersMap.forEach((fighter) => {
    fighter.scores.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });

  activeOverrides.forEach((override) => {
    const fighter = fightersMap.get(override.name);
    if (fighter) {
      fighter.active = override.active;
    }
  });

  return {
    fighters: Array.from(fightersMap.values()),
  };
}
