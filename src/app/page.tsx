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
  { value: 1.6, color: "text-orange-400" },
  { value: 2.0, color: "text-red-400" },
  { value: 2.5, color: "text-purple-400" },
  { value: 4.0, color: "text-yellow-400" },
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

  const getOwnedPassesColor = (passes: number) => {
    if (passes >= 800) return "text-pink-400";
    if (passes >= 600) return "text-yellow-400";
    if (passes >= 400) return "text-purple-400";
    if (passes >= 300) return "text-red-400";
    if (passes >= 200) return "text-orange-400";
    if (passes >= 100) return "text-green-400";
    return "text-blue-400";
  };

  return (
    <main className="min-h-screen bg-[#111111] text-gray-100">
      <a
        href="https://github.com/steventanyang/ufcraxV2"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 right-4 flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#333333] text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="inline-block"
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        Star on GitHub
      </a>
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="pt-12 md:pt-16 pb-6 md:pb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-3">
            UFC Rax V2
          </h1>
          <div className="text-gray-500 text-center text-xs md:text-base mb-6">
            <p>
              join &quot;ufc rax group&quot; on real to give feedback - made by
              @yangsl
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <nav className="flex relative rounded-lg bg-[#2a2a2a] p-1 w-full max-w-[400px]">
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
                <span className="px-3">Rankings</span>
              </button>
              <button
                onClick={() => setViewType("compare")}
                className={`relative py-2 text-sm font-medium rounded-md flex-1 transition-colors duration-200 text-center ${
                  viewType === "compare"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="px-3">Compare</span>
              </button>
              <button
                onClick={() => setViewType("recommendations")}
                className={`relative py-2 text-sm font-medium rounded-md flex-1 transition-colors duration-200 text-center ${
                  viewType === "recommendations"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="px-3">Who to Buy</span>
              </button>
            </nav>
          </div>

          {viewType === "rankings" && (
            <div className="mb-6">
              <SearchBar onSearch={setSearchQuery} />
            </div>
          )}
        </div>

        {viewType === "rankings" ? (
          <div className="bg-[#1a1a1a] rounded-lg shadow overflow-x-auto">
            <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
              <table className="w-full">
                <thead className="bg-[#111111] sticky top-0">
                  <tr>
                    <th className="w-12 md:w-20 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider">
                      Rank
                    </th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider">
                      Fighter
                    </th>
                    <th className="w-24 md:w-72 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider">
                      Rax / Year
                    </th>
                    <th className="w-24 md:w-32 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider">
                      Owned Passes
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
                        <td className="w-12 md:w-20 px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                          <span className="text-sm md:text-xl font-bold text-gray-400">
                            {rankMap.get(fighter.name)}
                          </span>
                        </td>
                        <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-sm md:text-xl text-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{fighter.name}</span>
                            {fighter.active && (
                              <span className="px-1.5 py-0.5 text-[10px] md:text-xs bg-green-900/30 text-green-400 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="w-24 md:w-72 px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 md:gap-4">
                            <span
                              className={`text-sm md:text-xl font-bold ${multiplierColor}`}
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
                              className="bg-[#2a2a2a] text-gray-300 rounded px-1.5 py-0.5 text-[10px] md:text-sm border border-gray-700"
                            >
                              {multipliers.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.value}x
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setSelectedFighterModal(fighter)}
                              className="text-gray-500 hover:text-gray-300 text-[10px] md:text-sm font-medium hidden md:block"
                            >
                              Detail View
                            </button>
                          </div>
                        </td>
                        <td className="w-24 md:w-32 px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 md:gap-4">
                            <span
                              className={`text-sm md:text-xl font-bold ${getOwnedPassesColor(
                                fighter.ownedPasses
                              )}`}
                            >
                              {fighter.ownedPasses}
                            </span>
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
          <div className="bg-transparent rounded-lg shadow">
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
          <div className="bg-[#1a1a1a] rounded-lg shadow p-4 md:p-6">
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
