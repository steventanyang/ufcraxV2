import { Fighter } from "@/types/fighters";
import { useState } from "react";

type RecommendationsProps = {
  fighters: Fighter[];
  multiplierMap: Record<string, number>;
};

const multipliers = [
  { value: 1.2, color: "text-blue-400" },
  { value: 1.4, color: "text-green-400" },
  { value: 1.6, color: "text-yellow-400" },
  { value: 2.0, color: "text-orange-400" },
  { value: 2.5, color: "text-red-400" },
  { value: 4.0, color: "text-purple-400" },
  { value: 6.0, color: "text-pink-400" },
];

type ClaimConflict = {
  date: string; // MM-DD format
  fighters: {
    name: string;
    value: number;
  }[];
  lostValue: number;
};

function getMonthDay(date: string): string {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function calculateClaimConflicts(
  fighters: Fighter[],
  multiplierMap: Record<string, number>
): ClaimConflict[] {
  // Group all claims by MM-DD
  const claimsByDate = new Map<string, { name: string; value: number }[]>();

  fighters.forEach((fighter) => {
    fighter.scores.forEach((score) => {
      const monthDay = getMonthDay(score.date);
      const adjustedValue = score.value * (multiplierMap[fighter.name] || 1.2);

      if (!claimsByDate.has(monthDay)) {
        claimsByDate.set(monthDay, []);
      }

      // Check if fighter already has a claim on this date
      const existingClaimIndex = claimsByDate
        .get(monthDay)
        ?.findIndex((claim) => claim.name === fighter.name);

      if (existingClaimIndex !== undefined && existingClaimIndex >= 0) {
        // If current claim is higher, replace the existing one
        const claims = claimsByDate.get(monthDay)!;
        if (adjustedValue > claims[existingClaimIndex].value) {
          claims[existingClaimIndex].value = adjustedValue;
        }
      } else {
        // Add new claim if fighter doesn't have one for this date
        claimsByDate.get(monthDay)?.push({
          name: fighter.name,
          value: adjustedValue,
        });
      }
    });
  });

  // Find dates with more than 2 claims and calculate lost value
  const conflicts: ClaimConflict[] = [];

  claimsByDate.forEach((claims, date) => {
    if (claims.length > 2) {
      const sortedClaims = claims.sort((a, b) => b.value - a.value);
      const topTwoClaims = sortedClaims.slice(0, 2);
      const lostClaims = sortedClaims.slice(2);

      conflicts.push({
        date,
        fighters: sortedClaims,
        lostValue: lostClaims.reduce((sum, claim) => sum + claim.value, 0),
      });
    }
  });

  return conflicts;
}

function calculateAdjustedValue(
  fighter: Fighter,
  multiplier: number,
  conflicts: ClaimConflict[]
): {
  adjustedValue: number;
  lostValue: number;
} {
  let totalValue = 0;
  let lostValue = 0;

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

  // Process each day's highest score
  scoresByDay.forEach((scoreValue, monthDay) => {
    const conflict = conflicts.find((c) => c.date === monthDay);
    if (conflict) {
      const fighterInConflict = conflict.fighters.findIndex(
        (f) => f.name === fighter.name
      );
      if (fighterInConflict >= 2) {
        lostValue += scoreValue;
      } else {
        totalValue += scoreValue;
      }
    } else {
      totalValue += scoreValue;
    }
  });

  return { adjustedValue: totalValue, lostValue };
}

export default function Recommendations({
  fighters,
  multiplierMap,
  onMultiplierChange,
}: RecommendationsProps & {
  onMultiplierChange: (fighterName: string, multiplier: number) => void;
}) {
  const [selectedFighters, setSelectedFighters] = useState<Fighter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const conflicts = calculateClaimConflicts(selectedFighters, multiplierMap);

  const filteredFighters = fighters.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedFighters.some((sf) => sf.name === f.name)
  );

  const totalRax = selectedFighters.reduce((sum, fighter) => {
    const { adjustedValue } = calculateAdjustedValue(
      fighter,
      multiplierMap[fighter.name] || 1.2,
      conflicts
    );
    return sum + Math.round(adjustedValue);
  }, 0);

  const handleAddFighter = (fighter: Fighter) => {
    if (selectedFighters.length < 10) {
      setSelectedFighters([...selectedFighters, fighter]);
      setSearchQuery("");
    }
  };

  const handleRemoveFighter = (fighterName: string) => {
    setSelectedFighters(selectedFighters.filter((f) => f.name !== fighterName));
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left side - Search and Selected Fighters */}
      <div>
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Add fighter (max 10)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#2a2a2a] text-gray-100 pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none"
          />
          {searchQuery && (
            <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg max-h-48 overflow-auto">
              {filteredFighters.map((fighter) => (
                <button
                  key={fighter.name}
                  onClick={() => handleAddFighter(fighter)}
                  className="w-full px-4 py-2 text-left hover:bg-[#333333] text-gray-100"
                  disabled={selectedFighters.length >= 10}
                >
                  {fighter.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {selectedFighters.map((fighter) => {
            const multiplier = multiplierMap[fighter.name] || 1.2;
            const multiplierColor =
              multipliers.find((m) => m.value === multiplier)?.color ||
              "text-blue-400";

            const { adjustedValue, lostValue } = calculateAdjustedValue(
              fighter,
              multiplier,
              conflicts
            );

            return (
              <div
                key={fighter.name}
                className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fighter.name}</span>
                  {fighter.active && (
                    <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {lostValue > 0 && (
                      <span className="text-sm text-red-400">
                        -{Math.round(lostValue)}
                      </span>
                    )}
                    <span className={`font-bold ${multiplierColor}`}>
                      {Math.round(adjustedValue)}
                    </span>
                  </div>
                  <select
                    value={multiplier}
                    onChange={(e) =>
                      onMultiplierChange(fighter.name, Number(e.target.value))
                    }
                    className="bg-[#333333] text-gray-300 rounded px-2 py-1 text-sm border border-gray-700"
                  >
                    {multipliers.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.value}x
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemoveFighter(fighter.name)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side - Total and Recommendations */}
      <div>
        <div className="mb-8 p-6 bg-[#2a2a2a] rounded-lg">
          <div className="text-center">
            <div className="text-gray-400 mb-2">Total RAX / Year</div>
            <div className="text-4xl font-bold text-white">{totalRax}</div>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Claim Conflicts</h3>
          {conflicts.length > 0 ? (
            <div className="space-y-4">
              {conflicts.map((conflict, index) => (
                <div key={index} className="text-sm">
                  <div className="text-gray-400 mb-1">
                    Date: {conflict.date}
                  </div>
                  <div className="pl-4 space-y-1">
                    {conflict.fighters.map((f, i) => (
                      <div
                        key={f.name}
                        className={`${
                          i >= 2 ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {f.name}: {Math.round(f.value)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400">No claim conflicts found</div>
          )}
        </div>
      </div>
    </div>
  );
}
