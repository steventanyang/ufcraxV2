import { Fighter } from "@/types/fighters";
import { useState } from "react";

const multipliers = [
  { value: 1.2, color: "text-blue-400" },
  { value: 1.4, color: "text-green-400" },
  { value: 1.6, color: "text-yellow-400" },
  { value: 2.0, color: "text-orange-400" },
  { value: 2.5, color: "text-red-400" },
  { value: 4.0, color: "text-purple-400" },
  { value: 6.0, color: "text-pink-400" },
];

type FighterComparisonProps = {
  fighters: Fighter[];
  selectedFighter1: Fighter | null;
  selectedFighter2: Fighter | null;
  onSelectFighter1: (fighter: Fighter) => void;
  onSelectFighter2: (fighter: Fighter) => void;
  multiplierMap: Record<string, number>;
  onMultiplierChange: (fighterName: string, multiplier: number) => void;
};

function getMonthDay(date: string): string {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function getAdjustedMonthlyScores(fighter: Fighter, multiplier: number) {
  // Group scores by month and day, keeping only the highest value per day
  const scoresByMonthAndDay = new Map<string, Map<string, number>>();

  fighter.scores.forEach((score) => {
    const month = new Date(score.date).toLocaleDateString("en-US", {
      month: "long",
    });
    const monthDay = getMonthDay(score.date);
    const value = score.value * multiplier;

    if (!scoresByMonthAndDay.has(month)) {
      scoresByMonthAndDay.set(month, new Map());
    }

    const monthScores = scoresByMonthAndDay.get(month)!;
    if (!monthScores.has(monthDay) || value > monthScores.get(monthDay)!) {
      monthScores.set(monthDay, value);
    }
  });

  // Sum up the highest scores for each month
  const monthlyScores = Array.from(scoresByMonthAndDay.entries()).map(
    ([month, scores]) => ({
      month,
      value: Array.from(scores.values()).reduce((sum, value) => sum + value, 0),
    })
  );

  return monthlyScores.sort((a, b) => {
    const months = [
      "December",
      "November",
      "October",
      "September",
      "August",
      "July",
      "June",
      "May",
      "April",
      "March",
      "February",
      "January",
    ];
    return months.indexOf(a.month) - months.indexOf(b.month);
  });
}

export default function FighterComparison({
  fighters,
  selectedFighter1,
  selectedFighter2,
  onSelectFighter1,
  onSelectFighter2,
  multiplierMap,
  onMultiplierChange,
}: FighterComparisonProps) {
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");

  const renderFighterStats = (
    fighter: Fighter | null,
    side: "left" | "right",
    searchValue: string,
    setSearchValue: (value: string) => void
  ) => {
    const filteredFighters = fighters.filter((f) =>
      f.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    return (
      <div className="p-8">
        <div className="relative mb-8">
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
            placeholder="Search fighters..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full bg-[#2a2a2a] text-gray-100 pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none"
          />
          {searchValue && (
            <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-700 rounded-lg max-h-48 overflow-auto">
              {filteredFighters.map((f) => (
                <button
                  key={f.name}
                  className="w-full px-4 py-2 text-left hover:bg-[#333333] text-gray-100"
                  onClick={() => {
                    if (side === "left") {
                      onSelectFighter1(f);
                    } else {
                      onSelectFighter2(f);
                    }
                    setSearchValue("");
                  }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {fighter && (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold">{fighter.name}</h3>
                {fighter.active && (
                  <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-3xl font-bold ${
                    multipliers.find(
                      (m) => m.value === (multiplierMap[fighter.name] || 1.2)
                    )?.color || "text-blue-400"
                  }`}
                >
                  {Math.round(
                    fighter.value * (multiplierMap[fighter.name] || 1.2)
                  )}
                </span>
                <select
                  value={multiplierMap[fighter.name] || 1.2}
                  onChange={(e) =>
                    onMultiplierChange(fighter.name, Number(e.target.value))
                  }
                  className="bg-[#2a2a2a] text-gray-300 rounded px-2 py-1 text-sm border border-gray-700"
                >
                  {multipliers.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.value}x
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {getAdjustedMonthlyScores(
                fighter,
                multiplierMap[fighter.name] || 1.2
              )
                .slice(0, 12)
                .map((mv) => {
                  const multiplierColor =
                    multipliers.find(
                      (m) => m.value === (multiplierMap[fighter.name] || 1.2)
                    )?.color || "text-blue-400";

                  return (
                    <div
                      key={mv.month}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-400 font-medium">
                        {mv.month}
                      </span>
                      <span className={`font-bold ${multiplierColor}`}>
                        {Math.round(mv.value)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        {renderFighterStats(selectedFighter1, "left", search1, setSearch1)}
      </div>
      <div>
        {renderFighterStats(selectedFighter2, "right", search2, setSearch2)}
      </div>
    </div>
  );
}
