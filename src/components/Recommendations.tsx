import { Fighter } from "@/types/fighters";
import { useState, useEffect } from "react";
import MultipleCalendar from "./MultipleCalendar";

type RecommendationsProps = {
  fighters: Fighter[];
  multiplierMap: Record<string, number>;
};

const multipliers = [
  // Single tier rarities
  { value: 1.2, label: "Common", color: "text-blue-400" },
  { value: 1.4, label: "Uncommon", color: "text-green-400" },
  { value: 1.6, label: "Rare", color: "text-orange-400" },
  { value: 2.0, label: "Epic", color: "text-red-400" },
  // Legendary: 5 tiers, base 5.0x, +0.4x per tier
  { value: 5.0, label: "Leg 1", color: "text-purple-400" },
  { value: 5.4, label: "Leg 2", color: "text-purple-400" },
  { value: 5.8, label: "Leg 3", color: "text-purple-400" },
  { value: 6.2, label: "Leg 4", color: "text-purple-400" },
  { value: 6.6, label: "Leg 5", color: "text-purple-400" },
  // Mystic: 10 tiers, base 10.0x, +0.2x per tier
  { value: 10.0, label: "Mystic 1", color: "text-yellow-400" },
  { value: 10.2, label: "Mystic 2", color: "text-yellow-400" },
  { value: 10.4, label: "Mystic 3", color: "text-yellow-400" },
  { value: 10.6, label: "Mystic 4", color: "text-yellow-400" },
  { value: 10.8, label: "Mystic 5", color: "text-yellow-400" },
  { value: 11.0, label: "Mystic 6", color: "text-yellow-400" },
  { value: 11.2, label: "Mystic 7", color: "text-yellow-400" },
  { value: 11.4, label: "Mystic 8", color: "text-yellow-400" },
  { value: 11.6, label: "Mystic 9", color: "text-yellow-400" },
  { value: 11.8, label: "Mystic 10", color: "text-yellow-400" },
  // Iconic: 20 tiers, base 20.0x, +0.3x per tier
  { value: 20.0, label: "Iconic 1", color: "text-pink-400" },
  { value: 20.3, label: "Iconic 2", color: "text-pink-400" },
  { value: 20.6, label: "Iconic 3", color: "text-pink-400" },
  { value: 20.9, label: "Iconic 4", color: "text-pink-400" },
  { value: 21.2, label: "Iconic 5", color: "text-pink-400" },
  { value: 21.5, label: "Iconic 6", color: "text-pink-400" },
  { value: 21.8, label: "Iconic 7", color: "text-pink-400" },
  { value: 22.1, label: "Iconic 8", color: "text-pink-400" },
  { value: 22.4, label: "Iconic 9", color: "text-pink-400" },
  { value: 22.7, label: "Iconic 10", color: "text-pink-400" },
  { value: 23.0, label: "Iconic 11", color: "text-pink-400" },
  { value: 23.3, label: "Iconic 12", color: "text-pink-400" },
  { value: 23.6, label: "Iconic 13", color: "text-pink-400" },
  { value: 23.9, label: "Iconic 14", color: "text-pink-400" },
  { value: 24.2, label: "Iconic 15", color: "text-pink-400" },
  { value: 24.5, label: "Iconic 16", color: "text-pink-400" },
  { value: 24.8, label: "Iconic 17", color: "text-pink-400" },
  { value: 25.1, label: "Iconic 18", color: "text-pink-400" },
  { value: 25.4, label: "Iconic 19", color: "text-pink-400" },
  { value: 25.7, label: "Iconic 20", color: "text-pink-400" },
];

type ClaimConflict = {
  date: string; // MM-DD format
  fighters: {
    name: string;
    value: number;
  }[];
  lostValue: number;
};

// Color mapping for multiplier badges
function getMultiplierBgColor(color: string): string {
  if (color.includes("blue")) return "bg-blue-500";
  if (color.includes("green")) return "bg-green-500";
  if (color.includes("orange")) return "bg-orange-500";
  if (color.includes("red")) return "bg-red-500";
  if (color.includes("purple")) return "bg-purple-500";
  if (color.includes("yellow")) return "bg-yellow-500";
  if (color.includes("pink")) return "bg-pink-500";
  return "bg-gray-500";
}

// Subtle card background based on rarity
function getCardBgColor(color: string): string {
  if (color.includes("blue")) return "bg-blue-900/40";
  if (color.includes("green")) return "bg-green-900/40";
  if (color.includes("orange")) return "bg-orange-900/50";
  if (color.includes("red")) return "bg-red-900/40";
  if (color.includes("purple")) return "bg-purple-900/40";
  if (color.includes("yellow")) return "bg-yellow-900/40";
  if (color.includes("pink")) return "bg-pink-900/40";
  return "bg-[#2a2a2a]";
}

type MultiplierSelectorProps = {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number;
  onSelect: (value: number) => void;
  fighterName: string;
};

function MultiplierSelector({ isOpen, onClose, currentValue, onSelect, fighterName }: MultiplierSelectorProps) {
  if (!isOpen) return null;

  const groups = [
    { label: "Basic", items: multipliers.filter(m => m.value <= 2.0) },
    { label: "Legendary", items: multipliers.filter(m => m.value >= 5.0 && m.value <= 6.6) },
    { label: "Mystic", items: multipliers.filter(m => m.value >= 10.0 && m.value <= 11.8) },
    { label: "Iconic", items: multipliers.filter(m => m.value >= 20.0) },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-[#1a1a1a] rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Select Rarity</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
          <p className="text-sm text-gray-400 mt-1">{fighterName}</p>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="text-xs text-gray-500 uppercase px-2 mb-2">{group.label}</div>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((m) => {
                  const bgColor = getMultiplierBgColor(m.color);
                  const isSelected = m.value === currentValue;
                  return (
                    <button
                      key={m.value}
                      onClick={() => {
                        onSelect(m.value);
                        onClose();
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                        isSelected 
                          ? "bg-[#333333] ring-2 ring-blue-500" 
                          : "bg-[#2a2a2a] hover:bg-[#333333]"
                      }`}
                    >
                      <span className={`min-w-[40px] h-8 px-1.5 ${bgColor} rounded flex items-center justify-center text-white text-xs font-bold`}>
                        {m.value}x
                      </span>
                      <span className={`text-sm ${m.color}`}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // Find dates with more than 3 claims and calculate lost value
  const conflicts: ClaimConflict[] = [];

  claimsByDate.forEach((claims, date) => {
    if (claims.length > 3) {
      const sortedClaims = claims.sort((a, b) => b.value - a.value);
      const lostClaims = sortedClaims.slice(3);

      conflicts.push({
        date,
        fighters: sortedClaims,
        lostValue: lostClaims.reduce((sum, claim) => sum + claim.value, 0),
      });
    }
  });

  return conflicts;
}

// RAX caps per rarity (Team/Fighter column)
function getRaxCap(multiplier: number): number | null {
  if (multiplier <= 1.2) return 1500;      // Common
  if (multiplier <= 1.4) return 2500;      // Uncommon
  if (multiplier <= 1.6) return 4000;      // Rare
  if (multiplier <= 2.0) return 6000;      // Epic
  if (multiplier <= 6.6) return 12000;     // Legendary (5.0-6.6)
  if (multiplier <= 11.8) return 24000;    // Mystic (10.0-11.8)
  return null;                              // Iconic - unlimited
}

function calculateAdjustedValue(
  fighter: Fighter,
  multiplier: number,
  conflicts: ClaimConflict[]
): {
  adjustedValue: number;
  lostValue: number;
  cappedValue: number;
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
      if (fighterInConflict >= 3) {
        lostValue += scoreValue;
      } else {
        totalValue += scoreValue;
      }
    } else {
      totalValue += scoreValue;
    }
  });

  // Apply RAX cap based on rarity
  const cap = getRaxCap(multiplier);
  const cappedValue = cap !== null && totalValue > cap ? cap : totalValue;

  return { adjustedValue: cappedValue, lostValue, cappedValue };
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
                    const isSignificantLoss = i >= 3 && f.value >= 10;

                    return (
                      <div
                        key={f.name}
                        className={`${
                          isSignificantLoss
                            ? "text-red-400"
                            : i >= 3
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
          conflict.fighters.findIndex((f) => f.name === fighter.name) >= 3
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
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto relative">
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

        <div className="mb-6 p-4 bg-[#2a2a2a] rounded-lg">
          <h3 className="text-lg font-bold mb-4">Calendar View</h3>
          <MultipleCalendar
            fighters={selectedFighters}
            multiplierMap={multiplierMap}
          />
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

function OwnedPassesIndicator({ passes }: { passes: number }) {
  const getOwnedPassesColor = (passes: number) => {
    if (passes >= 1500) return "bg-red-700"; // Extreme ownership
    if (passes >= 1000) return "bg-red-600"; // Very extreme ownership
    if (passes >= 700) return "bg-red-500"; // Very high ownership
    if (passes >= 500) return "bg-red-400"; // High ownership
    if (passes >= 300) return "bg-yellow-400"; // Moderate-high ownership
    if (passes >= 100) return "bg-yellow-300"; // Moderate ownership
    if (passes >= 50) return "bg-lime-400"; // Low ownership
    if (passes >= 10) return "bg-green-400"; // Very low ownership
    return "bg-green-500"; // Minimal ownership
  };

  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${getOwnedPassesColor(passes)}`}
    ></div>
  );
}

const STORAGE_KEY_FIGHTERS = "selectedFightersV1";

export default function Recommendations({
  fighters,
  multiplierMap,
  onMultiplierChange,
}: RecommendationsProps & {
  onMultiplierChange: (fighterName: string, multiplier: number) => void;
}) {
  // Initialize state from localStorage
  const [selectedFighters, setSelectedFighters] = useState<Fighter[]>(() => {
    if (typeof window === "undefined") return []; // Handle SSR
    const saved = localStorage.getItem(STORAGE_KEY_FIGHTERS);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      // Find the fighters in the current fighters list (in case data has updated)
      return parsed
        .map((name: string) => fighters.find((f) => f.name === name))
        .filter(Boolean);
    } catch (e) {
      return [e];
    }
  });

  // Save to localStorage whenever selectedFighters changes
  useEffect(() => {
    if (selectedFighters.length > 0) {
      localStorage.setItem(
        STORAGE_KEY_FIGHTERS,
        JSON.stringify(selectedFighters.map((f) => f.name))
      );
    } else {
      localStorage.removeItem(STORAGE_KEY_FIGHTERS);
    }
  }, [selectedFighters]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showConflicts, setShowConflicts] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [excludedFighters, setExcludedFighters] = useState<string[]>([]);
  const [showTotalBreakdown, setShowTotalBreakdown] = useState(false);
  const [multiplierSelectorFighter, setMultiplierSelectorFighter] = useState<string | null>(null);

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
    if (selectedFighters.length < 15) {
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
    <div>
      {/* Mobile sticky Total RAX header */}
      <div className="md:hidden sticky top-0 z-10 bg-[#2a2a2a] rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{totalRax}</span>
            <span className="text-gray-400 text-xs">RAX / Year</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTotalBreakdown(true)}
              className="text-xs text-blue-400 hover:text-blue-300 bg-[#333333] px-3 py-1.5 rounded"
            >
              Details
            </button>
            {selectedFighters.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all selected fighters?")) {
                    setSelectedFighters([]);
                    localStorage.removeItem(STORAGE_KEY_FIGHTERS);
                  }
                }}
                className="text-xs text-gray-400 hover:text-gray-300 bg-[#333333] px-3 py-1.5 rounded"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      {/* Left side - Search and Selected Fighters */}
      <div className="order-1 md:order-1">
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
            placeholder="Add fighter (max 15)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a] text-gray-100 pl-10 pr-4 py-3 rounded-lg focus:outline-none"
          />
          {searchQuery && (
            <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg max-h-48 overflow-auto">
              {filteredFighters.map((fighter) => (
                <button
                  key={fighter.name}
                  onClick={() => handleAddFighter(fighter)}
                  className="w-full px-4 py-2 text-left hover:bg-[#333333] text-gray-100"
                  disabled={selectedFighters.length >= 15}
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

            const cap = getRaxCap(multiplier);
            const isAtCap = cap !== null && adjustedValue >= cap;

            const cardBg = getCardBgColor(multiplierColor);
            
            return (
              <div
                key={fighter.name}
                className={`p-3 rounded-lg flex items-center gap-3 ${cardBg}`}
              >
                {/* Left: Name & Dropdown */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <OwnedPassesIndicator passes={fighter.ownedPasses} />
                    <span className="font-medium truncate">{fighter.name}</span>
                    {fighter.active && (
                      <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-400 rounded-full shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setMultiplierSelectorFighter(fighter.name)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs bg-black/40 ml-5 ${multiplierColor}`}
                  >
                    {multipliers.find((m) => m.value === multiplier)?.label}
                    <svg className={`w-3 h-3 ${multiplierColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {/* Middle: RAX value */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    {lostValue > 0 && (
                      <span className="text-xs text-red-400">-{Math.round(lostValue)}</span>
                    )}
                    <span className={`text-2xl font-bold ${multiplierColor}`}>
                      {Math.round(adjustedValue)}
                    </span>
                  </div>
                  {isAtCap && (
                    <span className="text-[10px] text-yellow-500">Hit RAX Cap</span>
                  )}
                </div>
                {/* Right: X button */}
                <button
                  onClick={() => handleRemoveFighter(fighter.name)}
                  className="text-gray-500 hover:text-gray-300 text-xl px-1"
                >
                  ×
                </button>
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
      <div className="order-2 md:order-2">
        <div className="p-4 md:p-6 bg-[#2a2a2a] rounded-lg">
          {/* Desktop Total RAX - hidden on mobile */}
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">{totalRax}</span>
              <span className="text-gray-400 text-sm">RAX / Year</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTotalBreakdown(true)}
                className="text-sm text-blue-400 hover:text-blue-300 bg-[#333333] px-3 py-1.5 rounded"
              >
                Details
              </button>
              {selectedFighters.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to clear all selected fighters?")) {
                      setSelectedFighters([]);
                      localStorage.removeItem(STORAGE_KEY_FIGHTERS);
                    }
                  }}
                  className="text-sm text-gray-400 hover:text-gray-300 bg-[#333333] px-3 py-1.5 rounded"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

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
                  <OwnedPassesIndicator passes={fighter.ownedPasses} />
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
                      disabled={selectedFighters.length >= 15}
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

      {multiplierSelectorFighter && (
        <MultiplierSelector
          isOpen={true}
          onClose={() => setMultiplierSelectorFighter(null)}
          currentValue={multiplierMap[multiplierSelectorFighter] || 1.2}
          onSelect={(value) => onMultiplierChange(multiplierSelectorFighter, value)}
          fighterName={multiplierSelectorFighter}
        />
      )}
    </div>
  );
}
