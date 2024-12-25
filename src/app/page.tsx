"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import fighterData from "../../public/data/processed_fighters.json";
import { ViewType } from "@/types/app";
import FighterComparison from "@/components/FighterComparison";
import Recommendations from "@/components/Recommendations";
import { Fighter } from "@/types/fighters";
import FighterModal from "@/components/FighterModal";

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
  const [viewType, setViewType] = useState<ViewType>("rankings");
  const [selectedFighter1, setSelectedFighter1] = useState<Fighter | null>(
    null
  );
  const [selectedFighter2, setSelectedFighter2] = useState<Fighter | null>(
    null
  );
  const [selectedFighterModal, setSelectedFighterModal] =
    useState<Fighter | null>(null);

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

          <div className="flex justify-center mb-8">
            <nav className="flex relative rounded-lg bg-[#2a2a2a] p-1 w-[400px]">
              <div
                className="absolute transition-all duration-200 ease-in-out bg-[#404040] rounded-md"
                style={{
                  width: "33.333333%",
                  height: "85%",
                  top: "7.5%",
                  left:
                    viewType === "rankings"
                      ? "1%"
                      : viewType === "compare"
                      ? "33.333333%"
                      : "65.666666%",
                }}
              />
              <button
                onClick={() => setViewType("rankings")}
                className={`relative py-2 text-sm font-medium rounded-md flex-1 transition-colors duration-200 text-center ${
                  viewType === "rankings"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="px-3">rankings</span>
              </button>
              <button
                onClick={() => setViewType("compare")}
                className={`relative py-2 text-sm font-medium rounded-md flex-1 transition-colors duration-200 text-center ${
                  viewType === "compare"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="px-3">compare</span>
              </button>
              <button
                onClick={() => setViewType("recommendations")}
                className={`relative py-2 text-sm font-medium rounded-md flex-1 transition-colors duration-200 text-center ${
                  viewType === "recommendations"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="px-3">who to buy</span>
              </button>
            </nav>
          </div>

          {viewType === "rankings" && (
            <div className="mb-8">
              <SearchBar onSearch={setSearchQuery} />
            </div>
          )}
        </div>

        {viewType === "rankings" ? (
          <div className="bg-[#1a1a1a] rounded-lg shadow">
            <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
              <table className="min-w-full lg:w-3/4 table-fixed">
                <thead className="bg-[#111111] sticky top-0">
                  <tr>
                    <th className="w-20 px-6 py-4 text-left text-sm font-bold text-gray-500 tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-500 tracking-wider">
                      Fighter
                    </th>
                    <th className="w-72 px-6 py-4 text-left text-sm font-bold text-gray-500 tracking-wider">
                      Rax / Year
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
                        <td className="w-20 px-6 py-5 whitespace-nowrap">
                          <span className="text-xl font-bold text-gray-400">
                            {rankMap.get(fighter.name)}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-xl text-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{fighter.name}</span>
                            {fighter.active && (
                              <span className="px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="w-72 px-6 py-5 whitespace-nowrap">
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
                            <button
                              onClick={() => setSelectedFighterModal(fighter)}
                              className="text-gray-500 hover:text-gray-300 text-base font-medium"
                            >
                              Detail View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewType === "compare" ? (
          <div className="bg-[#1a1a1a] rounded-lg shadow p-6">
            <FighterComparison
              fighters={sortedFighters}
              selectedFighter1={selectedFighter1}
              selectedFighter2={selectedFighter2}
              onSelectFighter1={setSelectedFighter1}
              onSelectFighter2={setSelectedFighter2}
              multiplierMap={multiplierMap}
              onMultiplierChange={handleMultiplierChange}
            />
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg shadow p-6">
            <Recommendations
              fighters={sortedFighters}
              multiplierMap={multiplierMap}
              onMultiplierChange={handleMultiplierChange}
            />
          </div>
        )}
      </div>
      {selectedFighterModal && (
        <FighterModal
          fighter={selectedFighterModal}
          multiplier={multiplierMap[selectedFighterModal.name] || 1.2}
          onClose={() => setSelectedFighterModal(null)}
          onMultiplierChange={handleMultiplierChange}
        />
      )}
    </main>
  );
}
