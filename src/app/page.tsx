"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import fighterData from "../../public/data/processed_fighters.json";

const multipliers = [
  { value: 1.2, color: "text-blue-400" },
  { value: 1.4, color: "text-green-400" },
  { value: 1.6, color: "text-yellow-400" },
  { value: 2.0, color: "text-orange-400" },
  { value: 2.5, color: "text-red-400" },
  { value: 4.0, color: "text-purple-400" },
  { value: 6.0, color: "text-pink-400" },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [multiplierMap, setMultiplierMap] = useState<Record<string, number>>(
    {}
  );

  // First sort fighters by value to establish consistent ranks
  const sortedFighters = [...fighterData.fighters].sort(
    (a, b) => b.value - a.value
  );

  // Create a map of fighter name to rank
  const rankMap = new Map(
    sortedFighters.map((fighter, index) => [fighter.name, index + 1])
  );

  const filteredFighters = sortedFighters.filter((fighter) =>
    fighter.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMultiplierChange = (fighterName: string, multiplier: number) => {
    setMultiplierMap((prev) => ({
      ...prev,
      [fighterName]: multiplier,
    }));
  };

  return (
    <main className="min-h-screen bg-[#111111] text-gray-100">
      <div className="container mx-auto px-4">
        <div className="pt-16 pb-8">
          <h1 className="text-4xl font-bold text-center mb-2">
            UFC Fighter Rankings
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Historical rankings based on fight performance
          </p>
          <SearchBar onSearch={setSearchQuery} />
        </div>
        <div className="bg-[#1a1a1a] rounded-lg shadow">
          <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
            <table className="min-w-full table-fixed">
              <thead className="bg-[#111111] sticky top-0">
                <tr>
                  <th className="w-24 px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    RANK
                  </th>
                  <th className="w-1/2 px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    FIGHTER
                  </th>
                  <th className="w-1/3 px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    VALUE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredFighters.map((fighter) => {
                  const multiplier = multiplierMap[fighter.name] || 1.2;
                  const multiplierColor =
                    multipliers.find((m) => m.value === multiplier)?.color ||
                    "text-blue-400";

                  return (
                    <tr key={fighter.name} className="hover:bg-[#222222]">
                      <td className="w-24 px-6 py-5 whitespace-nowrap text-xl text-gray-400">
                        {rankMap.get(fighter.name)}
                      </td>
                      <td className="w-1/2 px-6 py-5 whitespace-nowrap text-xl text-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{fighter.name}</span>
                          {fighter.active && (
                            <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="w-1/3 px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <span
                            className={`text-xl font-bold ${multiplierColor}`}
                          >
                            {Math.round(fighter.value * multiplier)}
                          </span>
                          <select
                            value={multiplier}
                            onChange={(e) =>
                              handleMultiplierChange(
                                fighter.name,
                                Number(e.target.value)
                              )
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
