import { Fighter } from "@/types/fighters";
import { calculateDailyAdjustedValue } from "@/utils/calculations";

const multipliers = [
  { value: 1.2, color: "text-blue-400" },
  { value: 1.4, color: "text-green-400" },
  { value: 1.6, color: "text-orange-400" },
  { value: 2.0, color: "text-red-400" },
  { value: 2.5, color: "text-purple-400" },
  { value: 4.0, color: "text-yellow-400" },
  { value: 6.0, color: "text-pink-400" },
];

type FighterModalProps = {
  fighter: Fighter;
  multiplier: number;
  onClose: () => void;
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

export default function FighterModal({
  fighter,
  multiplier,
  onClose,
  onMultiplierChange,
}: FighterModalProps) {
  const multiplierColor =
    multipliers.find((m) => m.value === multiplier)?.color || "text-blue-400";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg w-[400px] max-h-[80vh] overflow-hidden">
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
                      {m.value}x
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
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {getAdjustedMonthlyScores(fighter, multiplier)
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
                  <span className="text-gray-400 font-medium">{mv.month}</span>
                  <span className={`font-bold ${multiplierColor}`}>
                    {Math.round(mv.value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
