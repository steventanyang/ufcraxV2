import { Fighter } from "@/types/fighters";
import { useState, useMemo } from "react";

type FighterCalendarProps = {
  fighter: Fighter;
  multiplier: number;
};

type HoveredDateType = {
  date: string;
  value: number;
  monthDay: string;
  x: number;
  y: number;
} | null;

const multiplierColors = {
  1.2: {
    base: "bg-blue-400",
    light: "bg-blue-400",
    medium: "bg-blue-500",
    dark: "bg-blue-600",
    darker: "bg-blue-700/50",
  },
  1.4: {
    base: "bg-green-400",
    light: "bg-green-400",
    medium: "bg-green-500",
    dark: "bg-green-600",
    darker: "bg-green-700/50",
  },
  1.6: {
    base: "bg-orange-400",
    light: "bg-orange-400",
    medium: "bg-orange-500",
    dark: "bg-orange-600",
    darker: "bg-orange-700/50",
  },
  2.0: {
    base: "bg-red-400",
    light: "bg-red-400",
    medium: "bg-red-500",
    dark: "bg-red-600",
    darker: "bg-red-700/50",
  },
  2.5: {
    base: "bg-purple-400",
    light: "bg-purple-400",
    medium: "bg-purple-500",
    dark: "bg-purple-600",
    darker: "bg-purple-700/50",
  },
  4.0: {
    base: "bg-yellow-400",
    light: "bg-yellow-400",
    medium: "bg-yellow-500",
    dark: "bg-yellow-600",
    darker: "bg-yellow-700/50",
  },
  6.0: {
    base: "bg-pink-400",
    light: "bg-pink-400",
    medium: "bg-pink-500",
    dark: "bg-pink-600",
    darker: "bg-pink-700/50",
  },
};

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

function getIntensityColor(
  value: number,
  maxValue: number,
  colors: (typeof multiplierColors)[keyof typeof multiplierColors]
): string {
  if (value === 0) return "bg-[#1f2937]";
  const intensity = value / maxValue;
  if (intensity < 0.15) return colors.darker;
  if (intensity < 0.4) return colors.dark;
  if (intensity < 0.7) return colors.medium;
  return colors.light;
}

export default function FighterCalendar({
  fighter,
  multiplier,
}: FighterCalendarProps) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [hoveredDate, setHoveredDate] = useState<HoveredDateType>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const colors = useMemo(() => {
    return multiplierColors[multiplier as keyof typeof multiplierColors];
  }, [multiplier]);

  // Process scores into a map of month-day -> value, keeping only the highest value per day
  const scoresByMonthDay = new Map<string, number>();
  fighter.scores.forEach((score) => {
    const monthDay = getMonthDay(score.date);
    const value = score.value * multiplier;
    const currentValue = scoresByMonthDay.get(monthDay);

    // Only update if there's no value for this day yet or if this value is higher
    if (!currentValue || value > currentValue) {
      scoresByMonthDay.set(monthDay, value);
    }
  });

  // Get the maximum value for color scaling
  const maxValue = Math.max(...Array.from(scoresByMonthDay.values()));

  // Generate calendar data
  const today = new Date();
  const calendarDays: { date: string; monthDay: string; value: number }[] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 365); // Go back 365 days to account for leap year

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().split("T")[0]; // Full date for display
    const monthDay = getMonthDay(date);
    calendarDays.push({
      date,
      monthDay,
      value: scoresByMonthDay.get(monthDay) || 0,
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
                  maxValue,
                  colors
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
          <div className="w-[14px] h-[14px] rounded-sm bg-[#1f2937]" />
          <div className={`w-[14px] h-[14px] rounded-sm ${colors.darker}`} />
          <div className={`w-[14px] h-[14px] rounded-sm ${colors.dark}`} />
          <div className={`w-[14px] h-[14px] rounded-sm ${colors.medium}`} />
          <div className={`w-[14px] h-[14px] rounded-sm ${colors.light}`} />
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
            top: hoveredDate.y - 40, // Position above the square
            transform: "translateX(-50%)",
          }}
        >
          {formatDate(hoveredDate.date)}: {Math.round(hoveredDate.value)} RAX
        </div>
      )}
    </div>
  );
}
