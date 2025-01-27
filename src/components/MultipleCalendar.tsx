import { Fighter } from "@/types/fighters";
import { useState, useMemo } from "react";

type MultipleCalendarProps = {
  fighters: Fighter[];
  multiplierMap: Record<string, number>;
};

type HoveredDateType = {
  date: string;
  value: number;
  monthDay: string;
  x: number;
  y: number;
  fighters: {
    name: string;
    value: number;
  }[];
} | null;

function getMonthDay(date: string): string {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function getMonthLabels(): string[] {
  const months = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d.toLocaleString("default", { month: "short" }));
  }
  return months;
}

function getIntensityColor(value: number, maxValue: number): string {
  if (value === 0) return "bg-[#161b22]";
  const intensity = value / maxValue;
  if (intensity < 0.15) return "bg-[#0e4429]";
  if (intensity < 0.4) return "bg-[#006d32]";
  if (intensity < 0.7) return "bg-[#26a641]";
  return "bg-[#39d353]";
}

export default function MultipleCalendar({
  fighters,
  multiplierMap,
}: MultipleCalendarProps) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hoveredDate, setHoveredDate] = useState<HoveredDateType>(null);

  // Process scores into a map of month-day -> value and fighters, keeping only the highest value per fighter per day
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const scoresByMonthDay = useMemo(() => {
    const scoreMap = new Map<
      string,
      { total: number; fighters: { name: string; value: number }[] }
    >();

    fighters.forEach((fighter) => {
      const multiplier = multiplierMap[fighter.name] || 1.2;
      fighter.scores.forEach((score) => {
        const monthDay = getMonthDay(score.date);
        const value = score.value * multiplier;

        if (!scoreMap.has(monthDay)) {
          scoreMap.set(monthDay, { total: 0, fighters: [] });
        }

        const dayData = scoreMap.get(monthDay)!;
        const existingFighterIndex = dayData.fighters.findIndex(
          (f) => f.name === fighter.name
        );

        if (existingFighterIndex === -1) {
          dayData.fighters.push({ name: fighter.name, value });
          dayData.total += value;
        } else if (value > dayData.fighters[existingFighterIndex].value) {
          dayData.total -= dayData.fighters[existingFighterIndex].value;
          dayData.total += value;
          dayData.fighters[existingFighterIndex].value = value;
        }
      });
    });

    return scoreMap;
  }, [fighters, multiplierMap]);

  // Get the maximum value for color scaling
  const maxValue = Math.max(
    ...Array.from(scoresByMonthDay.values()).map((data) => data.total)
  );

  // Generate calendar data
  const today = new Date();
  const calendarDays: {
    date: string;
    monthDay: string;
    value: number;
    fighters: { name: string; value: number }[];
  }[] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 365); // Go back 365 days

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().split("T")[0];
    const monthDay = getMonthDay(date);
    const dayData = scoresByMonthDay.get(monthDay);
    calendarDays.push({
      date,
      monthDay,
      value: dayData?.total || 0,
      fighters: dayData?.fighters || [],
    });
  }

  // Split calendar into two rows of 6 months each
  const firstHalf = calendarDays.slice(0, Math.floor(calendarDays.length / 2));
  const secondHalf = calendarDays.slice(Math.floor(calendarDays.length / 2));

  // Group each half into weeks
  const firstHalfWeeks: (typeof calendarDays)[] = [];
  const secondHalfWeeks: (typeof calendarDays)[] = [];

  for (let i = 0; i < firstHalf.length; i += 7) {
    firstHalfWeeks.push(firstHalf.slice(i, i + 7));
  }
  for (let i = 0; i < secondHalf.length; i += 7) {
    secondHalfWeeks.push(secondHalf.slice(i, i + 7));
  }

  const handleMouseEnter = (
    day: (typeof calendarDays)[0],
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredDate({
      ...day,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
    });
  };

  const renderCalendarRow = (
    weeks: typeof firstHalfWeeks,
    months: string[]
  ) => (
    <div>
      {/* Month labels */}
      <div className="flex mb-2">
        <div className="flex-1 grid grid-cols-6 gap-1">
          {months.map((month) => (
            <div key={month} className="text-center text-xs text-gray-400">
              {month}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-[repeat(26,_minmax(0,_1fr))] gap-[3px]">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-rows-7 gap-[2px] md:gap-[3px]"
          >
            {week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`h-[10px] w-[10px] md:h-[14px] md:w-[14px] rounded-sm ${getIntensityColor(
                  day.value,
                  maxValue
                )} cursor-pointer transition-colors duration-200`}
                onMouseEnter={(e) => handleMouseEnter(day, e)}
                onMouseLeave={() => setHoveredDate(null)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const months = getMonthLabels();
  const firstHalfMonths = months.slice(0, 6);
  const secondHalfMonths = months.slice(6);

  return (
    <div className="relative">
      {/* Legend */}
      <div className="mb-4 flex items-center justify-end gap-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-[14px] h-[14px] rounded-sm bg-[#161b22]" />
          <div className="w-[14px] h-[14px] rounded-sm bg-[#0e4429]" />
          <div className="w-[14px] h-[14px] rounded-sm bg-[#006d32]" />
          <div className="w-[14px] h-[14px] rounded-sm bg-[#26a641]" />
          <div className="w-[14px] h-[14px] rounded-sm bg-[#39d353]" />
        </div>
        <span>More</span>
      </div>

      {renderCalendarRow(firstHalfWeeks, firstHalfMonths)}
      {renderCalendarRow(secondHalfWeeks, secondHalfMonths)}

      {/* Tooltip */}
      {hoveredDate && (
        <div
          className="fixed bg-gray-800 text-white text-sm rounded px-3 py-2 z-10 pointer-events-none"
          style={{
            left: hoveredDate.x,
            top: hoveredDate.y - 40,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold mb-1">
            {formatDate(hoveredDate.date)}: {Math.round(hoveredDate.value)} RAX
          </div>
          {hoveredDate.fighters.length > 0 && (
            <div className="space-y-1 text-xs">
              {hoveredDate.fighters
                .sort((a, b) => b.value - a.value)
                .map((fighter) => (
                  <div
                    key={fighter.name}
                    className="flex justify-between gap-4"
                  >
                    <span className="text-gray-300">{fighter.name}</span>
                    <span>{Math.round(fighter.value)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
