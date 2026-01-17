import { Fighter } from "@/types/fighters";
import { calculateDailyAdjustedValue } from "@/utils/calculations";
import { useState } from "react";
import FighterCalendar from "./FighterCalendar";

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

type FighterModalProps = {
  fighter: Fighter;
  multiplier: number;
  onClose: () => void;
  onMultiplierChange: (fighterName: string, multiplier: number) => void;
};

type ViewType = "monthly" | "daily" | "calendar";

function getMonthDay(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function getAdjustedMonthlyScores(fighter: Fighter, multiplier: number) {
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

  return Array.from(scoresByMonthAndDay.entries()).map(([month, scores]) => ({
    month,
    value: Array.from(scores.values()).reduce((sum, value) => sum + value, 0),
  }));
}

function getDailyScores(fighter: Fighter, multiplier: number) {
  const scoresByDay = new Map<string, number>();

  fighter.scores.forEach((score) => {
    const monthDay = getMonthDay(score.date);
    const value = score.value * multiplier;

    if (!scoresByDay.has(monthDay) || value > scoresByDay.get(monthDay)!) {
      scoresByDay.set(monthDay, value);
    }
  });

  return Array.from(scoresByDay.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => {
      // Convert back to Date objects for proper sorting
      const dateA = new Date(a.date + ", 2024"); // Add year for proper parsing
      const dateB = new Date(b.date + ", 2024");
      return dateB.getTime() - dateA.getTime();
    });
}

export default function FighterModal({
  fighter,
  multiplier,
  onClose,
  onMultiplierChange,
}: FighterModalProps) {
  const [viewType, setViewType] = useState<ViewType>("monthly");
  const multiplierColor =
    multipliers.find((m) => m.value === multiplier)?.color || "text-blue-400";

  const monthlyScores = getAdjustedMonthlyScores(fighter, multiplier);
  const dailyScores = getDailyScores(fighter, multiplier);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-[600px] max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{fighter.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className={`text-2xl font-bold ${multiplierColor}`}>
                  {Math.round(calculateDailyAdjustedValue(fighter, multiplier))}{" "}
                  RAX
                </span>
                <select
                  value={multiplier}
                  onChange={(e) =>
                    onMultiplierChange(fighter.name, Number(e.target.value))
                  }
                  className="bg-[#2a2a2a] text-gray-300 rounded px-2 py-1 text-sm border border-gray-700 focus:outline-none focus:border-blue-500"
                >
                  {multipliers.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex justify-end gap-4">
            <button
              onClick={() => setViewType("monthly")}
              className={`text-sm ${
                viewType === "monthly"
                  ? "text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setViewType("daily")}
              className={`text-sm ${
                viewType === "daily"
                  ? "text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewType("calendar")}
              className={`text-sm ${
                viewType === "calendar"
                  ? "text-blue-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {viewType === "monthly" && (
            <div className="space-y-2">
              {monthlyScores
                .sort((a, b) => {
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
                })
                .slice(0, 12)
                .map((mv) => (
                  <div
                    key={mv.month}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-400">{mv.month}</span>
                    <span className={`font-bold ${multiplierColor}`}>
                      {Math.round(mv.value)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {viewType === "daily" && (
            <div className="space-y-2">
              {dailyScores.map((score) => (
                <div
                  key={score.date}
                  className="flex justify-between items-center text-xs"
                >
                  <span className="text-gray-400">{score.date}</span>
                  <span className={`font-bold ${multiplierColor}`}>
                    {Math.round(score.value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {viewType === "calendar" && (
            <div className="pt-4">
              <FighterCalendar fighter={fighter} multiplier={multiplier} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
