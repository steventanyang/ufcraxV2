import { Fighter } from "@/types/fighters";
import { useState } from "react";

type RecommendationsProps = {
  fighters: Fighter[];
  multiplierMap: Record<string, number>;
};

const multipliers = [
  { value: 1.2, color: "text-blue-400" },
  { value: 1.4, color: "text-green-400" },
  { value: 1.6, color: "text-orange-400" },
  { value: 2.0, color: "text-red-400" },
  { value: 2.5, color: "text-purple-400" },
  { value: 4.0, color: "text-yellow-400" },
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

export function getMonthDay(date: string): string {
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
      //   const topTwoClaims = sortedClaims.slice(0, 2);
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

type ClaimConflictsModalProps = {
  conflicts: ClaimConflict[];
  onClose: () => void;
};

function ClaimConflictsModal({ conflicts, onClose }: ClaimConflictsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Claim Conflicts</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl absolute top-4 right-4"
          >
            ×
          </button>
        </div>
        {conflicts.length > 0 ? (
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className="text-sm">
                <div className="text-gray-400 mb-1">Date: {conflict.date}</div>
                <div className="pl-4 space-y-1">
                  {conflict.fighters.map((f, i) => {
                    const isSignificantLoss = i >= 2 && f.value >= 10;

                    return (
                      <div
                        key={f.name}
                        className={`${
                          isSignificantLoss
                            ? "text-red-400"
                            : i >= 2
                            ? "text-gray-400"
                            : "text-green-400"
                        }`}
                      >
                        {f.name}: {Math.round(f.value)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No claim conflicts found</div>
        )}
      </div>
    </div>
  );
}

type InfoModalProps = {
  onClose: () => void;
};

function InfoModal({ onClose }: InfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">How Recommendations Work</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl absolute top-4 right-4"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 text-sm text-gray-300">
          <p>
            Recommendations are calculated using a value score that considers
            multiple factors:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Base RAX value (higher is better)</li>
            <li>Number of owners (fewer owners = higher score)</li>
            <li>Active status (20% bonus for active fighters)</li>
            <li>
              Ownership penalty is squared to heavily favor less-owned fighters
            </li>
          </ul>
          <div className="bg-[#2a2a2a] rounded-lg p-4 font-mono text-sm">
            <pre className="whitespace-pre-wrap">
              <code>
                {`valueScore = (RAX / log₁₀(owners)²) × {
  active ? 1.2 : 1
}`}
              </code>
            </pre>
          </div>
          <p>
            This scoring system helps identify undervalued fighters with high
            RAX potential and low ownership, giving preference to active
            fighters.
          </p>
        </div>
      </div>
    </div>
  );
}

const calculateValueScore = (fighter: Fighter, multiplier: number = 1.2) => {
  const raxScore = fighter.value * multiplier;
  const ownershipPenalty = Math.log10(fighter.ownedPasses + 1);

  // More aggressive ownership penalty + active bonus
  const valueScore =
    (raxScore / Math.pow(ownershipPenalty, 2)) * (fighter.active ? 1.2 : 1);

  return {
    fighter,
    valueScore: Math.round(valueScore),
    raxPerYear: raxScore,
    ownedPasses: fighter.ownedPasses,
    multiplier,
  };
};

// const getTopRecommendations = (
//   fighters: Fighter[],
//   multiplierMap: Record<string, number>
// ) => {
//   const scoredFighters = fighters.map((fighter) =>
//     calculateValueScore(fighter, multiplierMap[fighter.name] || 1.2)
//   );

//   // Sort by value score descending
//   return scoredFighters
//     .sort((a, b) => b.valueScore - a.valueScore)
//     .slice(0, 20); // Top 20 recommendations
// };

const RefreshIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

type MonthlyBreakdown = {
  [key: string]: {
    total: number;
    fighters: {
      name: string;
      value: number;
    }[];
  };
};

type MonthSummary = {
  month: string; // MM format
  total: number;
  fighters: {
    name: string;
    totalValue: number;
  }[];
};

type TotalBreakdownModalProps = {
  selectedFighters: Fighter[];
  multiplierMap: Record<string, number>;
  conflicts: ClaimConflict[];
  onClose: () => void;
};

function TotalBreakdownModal({
  selectedFighters,
  multiplierMap,
  conflicts,
  onClose,
}: TotalBreakdownModalProps) {
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Calculate monthly summary
  const monthlyBreakdown = selectedFighters.reduce<MonthlyBreakdown>(
    (acc, fighter) => {
      fighter.scores.forEach((score) => {
        const monthDay = getMonthDay(score.date);
        const multiplier = multiplierMap[fighter.name] || 1.2;
        const dailyValue = score.value * multiplier;

        // Check if this day has a conflict
        const conflict = conflicts.find((c) => c.date === monthDay);
        if (
          conflict &&
          conflict.fighters.findIndex((f) => f.name === fighter.name) >= 2
        ) {
          return; // Skip conflicted claims
        }

        if (!acc[monthDay]) {
          acc[monthDay] = { total: 0, fighters: [] };
        }

        if (!acc[monthDay].fighters.some((f) => f.name === fighter.name)) {
          acc[monthDay].fighters.push({
            name: fighter.name,
            value: dailyValue,
          });
          acc[monthDay].total += dailyValue;
        }
      });
      return acc;
    },
    {}
  );

  // Calculate month summaries
  const monthSummaries = Object.entries(monthlyBreakdown)
    .reduce<MonthSummary[]>((acc, [date, data]) => {
      const month = date.split("-")[0];
      const monthIndex = acc.findIndex((summary) => summary.month === month);

      if (monthIndex === -1) {
        // Create new month summary
        acc.push({
          month,
          total: data.total,
          fighters: data.fighters.map((f) => ({
            name: f.name,
            totalValue: f.value,
          })),
        });
      } else {
        // Update existing month summary
        acc[monthIndex].total += data.total;
        data.fighters.forEach((fighter) => {
          const existingFighter = acc[monthIndex].fighters.find(
            (f) => f.name === fighter.name
          );
          if (existingFighter) {
            existingFighter.totalValue += fighter.value;
          } else {
            acc[monthIndex].fighters.push({
              name: fighter.name,
              totalValue: fighter.value,
            });
          }
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate grand total
  const grandTotal = selectedFighters.reduce((sum, fighter) => {
    const { adjustedValue } = calculateAdjustedValue(
      fighter,
      multiplierMap[fighter.name] || 1.2,
      conflicts
    );
    return sum + Math.round(adjustedValue);
  }, 0);

  const getMonthName = (month: string) => {
    const date = new Date(2024, parseInt(month) - 1, 1);
    return date.toLocaleString("default", { month: "long" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Monthly Breakdown</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-2xl absolute top-4 right-4"
          >
            ×
          </button>
        </div>

        <div className="mb-6 p-4 bg-[#2a2a2a] rounded-lg text-center">
          <div className="text-gray-400 mb-1">Total RAX / Year</div>
          <div className="text-3xl font-bold text-white">
            {Math.round(grandTotal)}
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowDetailedView(!showDetailedView)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {showDetailedView ? "View Monthly Summary" : "View Daily Breakdown"}
          </button>
        </div>

        <div className="space-y-4">
          {showDetailedView
            ? // Detailed daily view
              Object.entries(monthlyBreakdown)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, data]) => (
                  <div key={date} className="bg-[#2a2a2a] rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400">{date}</span>
                      <span className="font-bold text-white">
                        {Math.round(data.total)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {data.fighters.map((fighter) => (
                        <div
                          key={fighter.name}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-400">{fighter.name}</span>
                          <span className="text-white">
                            {Math.round(fighter.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            : // Monthly summary view
              monthSummaries.map((month) => (
                <div key={month.month} className="bg-[#2a2a2a] rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">
                      {getMonthName(month.month)}
                    </span>
                    <span className="font-bold text-white">
                      {Math.round(month.total)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {month.fighters
                      .sort((a, b) => b.totalValue - a.totalValue)
                      .map((fighter) => (
                        <div
                          key={fighter.name}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-400">{fighter.name}</span>
                          <span className="text-white">
                            {Math.round(fighter.totalValue)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
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
  const [showConflicts, setShowConflicts] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [excludedFighters, setExcludedFighters] = useState<string[]>([]);
  const [showTotalBreakdown, setShowTotalBreakdown] = useState(false);

  const conflicts = calculateClaimConflicts(selectedFighters, multiplierMap);

  // Calculate recommended fighters with exclusions
  const recommendedFighters = fighters
    .filter(
      (f) =>
        !selectedFighters.some((sf) => sf.name === f.name) &&
        !excludedFighters.includes(f.name)
    )
    .map((fighter) => ({
      ...fighter,
      adjustedValue: calculateAdjustedValue(fighter, 1.2, conflicts)
        .adjustedValue,
    }))
    .sort((a, b) => b.adjustedValue - a.adjustedValue)
    .slice(0, 5);

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

  const handleRefreshRecommendation = (fighterName: string) => {
    setExcludedFighters([...excludedFighters, fighterName]);
  };

  const handleRefreshAll = () => {
    const currentRecommended = recommendedFighters.map((f) => f.name);
    setExcludedFighters([...excludedFighters, ...currentRecommended]);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      {/* Left side - Search and Selected Fighters */}
      <div className="order-2 md:order-1">
        <div className="relative mb-4 md:mb-6">
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

        <div className="space-y-2 mb-4">
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
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#2a2a2a] rounded-lg space-y-2 sm:space-y-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fighter.name}</span>
                  {fighter.active && (
                    <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
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

        {conflicts.length > 0 && (
          <button
            onClick={() => setShowConflicts(true)}
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            See claim conflicts ({conflicts.length})
          </button>
        )}
      </div>

      {/* Right side - Total and Recommendations */}
      <div className="order-1 md:order-2">
        <div className="mb-4 md:mb-8 p-4 md:p-6 bg-[#2a2a2a] rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
              <span>Total RAX / Year</span>
              <button
                onClick={() => setShowTotalBreakdown(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Detail View
              </button>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white">
              {totalRax}
            </div>
          </div>
        </div>

        <div className="bg-[#2a2a2a] rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg md:text-xl font-bold">
                Recommended Fighters
              </h3>
              <button
                onClick={() => setShowInfo(true)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleRefreshAll}
              className="text-gray-400 hover:text-gray-300 flex items-center gap-1 text-sm"
            >
              <RefreshIcon />
              <span className="hidden sm:inline">Refresh All</span>
            </button>
          </div>
          <div className="space-y-3">
            {recommendedFighters.map((fighter) => (
              <div
                key={fighter.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#222222] rounded-lg space-y-2 sm:space-y-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fighter.name}</span>
                  {fighter.active && (
                    <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="font-bold text-white">
                      {Math.round(fighter.adjustedValue)}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      Score: {calculateValueScore(fighter).valueScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefreshRecommendation(fighter.name)}
                      className="text-gray-400 hover:text-gray-300 p-1"
                      title="Refresh recommendation"
                    >
                      <RefreshIcon />
                    </button>
                    <button
                      onClick={() => handleAddFighter(fighter)}
                      className="text-gray-100 hover:text-gray-300 text-sm"
                      disabled={selectedFighters.length >= 10}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showConflicts && (
        <ClaimConflictsModal
          conflicts={conflicts}
          onClose={() => setShowConflicts(false)}
        />
      )}

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {showTotalBreakdown && (
        <TotalBreakdownModal
          selectedFighters={selectedFighters}
          multiplierMap={multiplierMap}
          conflicts={conflicts}
          onClose={() => setShowTotalBreakdown(false)}
        />
      )}
    </div>
  );
}
