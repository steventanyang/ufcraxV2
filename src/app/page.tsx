"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import fighterData from "../../public/data/processed_fighters.json";
import { ViewType } from "@/types/app";
import FighterComparison from "@/components/FighterComparison";
import Recommendations from "@/components/Recommendations";
import { Fighter } from "@/types/fighters";
import FighterModal from "@/components/FighterModal";
import { calculateDailyAdjustedValue } from "@/utils/calculations";
import ChangelogModal from "@/components/ChangelogModal";
import Image from "next/image";
import PassDistributionModal from "@/components/PassDistributionModal";

type SortField = "name" | "rax" | "passes" | "age" | "fights";
type SortDirection = "asc" | "desc";

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

const STORAGE_KEY_MULTIPLIERS = "selectedMultipliersV1";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [multiplierMap, setMultiplierMap] = useState<Record<string, number>>(
    () => {
      if (typeof window === "undefined") return {}; // Handle SSR
      const saved = localStorage.getItem(STORAGE_KEY_MULTIPLIERS);
      if (!saved) return {};

      try {
        return JSON.parse(saved);
      } catch (e) {
        return { e };
      }
    }
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
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [visibleFighters, setVisibleFighters] = useState<Fighter[]>([]);
  const [page, setPage] = useState(1);
  const loadingRef = useRef(null);
  const FIGHTERS_PER_PAGE = 50;
  const [rankMap, setRankMap] = useState<Map<string, number>>(new Map());
  const [sortedFighters, setSortedFighters] = useState<Fighter[]>([]);
  const [selectedPassDistribution, setSelectedPassDistribution] =
    useState<Fighter | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("rax");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  // const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    if (Object.keys(multiplierMap).length > 0) {
      localStorage.setItem(
        STORAGE_KEY_MULTIPLIERS,
        JSON.stringify(multiplierMap)
      );
    } else {
      localStorage.removeItem(STORAGE_KEY_MULTIPLIERS);
    }
  }, [multiplierMap]);

  const loadMoreFighters = useCallback(() => {
    if (viewType !== "rankings") return;

    const filtered = sortedFighters.filter((fighter) =>
      fighter.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const nextFighters = filtered.slice(
      page * FIGHTERS_PER_PAGE,
      (page + 1) * FIGHTERS_PER_PAGE
    );

    if (nextFighters.length > 0) {
      setVisibleFighters((prev) => [...prev, ...nextFighters]);
      setPage((prev) => prev + 1);
    }
  }, [searchQuery, page, sortedFighters, FIGHTERS_PER_PAGE, viewType]);

  useEffect(() => {
    if (viewType !== "rankings") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreFighters();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreFighters, viewType]);

  useEffect(() => {
    const sorted = [...fighterData.fighters]
      .filter((fighter) => fighter.name?.trim())
      .sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "rax":
            comparison =
              calculateDailyAdjustedValue(b) - calculateDailyAdjustedValue(a);
            break;
          case "passes":
            comparison = b.ownedPasses - a.ownedPasses;
            break;
          case "age":
            comparison = (b.age || 0) - (a.age || 0);
            break;
          case "fights":
            comparison = b.scores.length - a.scores.length;
            break;
        }

        return sortDirection === "asc" ? -comparison : comparison;
      });

    setSortedFighters(sorted);

    const ranks = new Map(
      sorted.map((fighter, index) => [fighter.name, index + 1])
    );
    setRankMap(ranks);

    const filtered = sorted.filter((fighter) => {
      const matchesSearch = fighter.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return showActiveOnly ? matchesSearch && fighter.active : matchesSearch;
    });

    setVisibleFighters(filtered.slice(0, FIGHTERS_PER_PAGE));
    setPage(1);
  }, [searchQuery, showActiveOnly, sortField, sortDirection]);

  // useEffect(() => {
  //   fetch("https://api.countapi.xyz/hit/ufcrax-v2.vercel.app/visits")
  //     .then((response) => response.json())
  //     .then((data) => setVisitorCount(data.value + 2293))
  //     .catch((error) => console.error("Error fetching visitor count:", error));
  // }, []);

  const handleMultiplierChange = (fighterName: string, multiplier: number) => {
    setMultiplierMap((prev) => ({
      ...prev,
      [fighterName]: multiplier,
    }));
  };

  const getOwnedPassesColor = (passes: number) => {
    if (passes >= 1500) return "text-red-700"; // Extreme ownership
    if (passes >= 1000) return "text-red-600"; // Very extreme ownership
    if (passes >= 700) return "text-red-500"; // Very high ownership
    if (passes >= 500) return "text-red-400"; // High ownership
    if (passes >= 300) return "text-yellow-400"; // Moderate-high ownership
    if (passes >= 100) return "text-yellow-300"; // Moderate ownership
    if (passes >= 50) return "text-lime-400"; // Low ownership
    if (passes >= 10) return "text-green-400"; // Very low ownership
    return "text-green-500"; // Minimal ownership
  };

  const getAgeColor = (age: number | undefined) => {
    if (!age) return "text-gray-400";
    if (age >= 45) return "text-red-700"; // Extremely old
    if (age >= 42) return "text-red-600"; // Very old
    if (age >= 39) return "text-red-500"; // Old
    if (age >= 36) return "text-red-400"; // Aging
    if (age >= 34) return "text-yellow-400"; // Past prime
    if (age >= 32) return "text-lime-400"; // Slightly past prime
    if (age > 30) return "text-green-400"; // Just past prime
    return "text-green-500"; // Below prime
  };

  const getFightsColor = (fights: number) => {
    if (fights >= 40) return "text-red-700"; // Veteran
    if (fights >= 35) return "text-red-600"; // Very experienced
    if (fights >= 30) return "text-red-500"; // Highly experienced
    if (fights >= 25) return "text-red-400"; // Experienced
    if (fights >= 20) return "text-yellow-400"; // Seasoned
    if (fights >= 15) return "text-lime-400"; // Moderate experience
    if (fights >= 10) return "text-green-400"; // Some experience
    return "text-green-500"; // New fighter
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDirection === "desc" ? "▼" : "▲"}</span>;
  };

  return (
    <main className="min-h-screen bg-[#111111] text-gray-100">
      <div className="container mx-auto px-4 max-w-7xl h-screen flex flex-col">
        <div className="pt-4 md:pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image
                src="/rax_logo.svg"
                alt="UFC Rax Logo"
                width={36}
                height={36}
                className="w-6 h-6 md:w-8 md:h-8"
              />
              <h1 className="text-xl md:text-2xl font-bold">
                UFC Rax V2
              </h1>
            </div>
            <span className="text-gray-500 text-xs md:text-sm">by @yangsl</span>
          </div>

          <div className="flex justify-center mb-5">
            <nav className="flex relative rounded-lg bg-[#2a2a2a] p-1 w-full max-w-[500px]">
              <div
                className="absolute transition-all duration-200 ease-in-out bg-[#404040] rounded-md"
                style={{
                  width: "33.333333%",
                  height: "85%",
                  top: "7.5%",
                  left:
                    viewType === "compare"
                      ? "0.5%"
                      : viewType === "rankings"
                      ? "33.333333%"
                      : "65.8%",
                }}
              />
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
            <div className="mb-5">
              <SearchBar onSearch={handleSearch} />
            </div>
          )}
        </div>

        <div
          className={`flex-1 ${
            viewType === "rankings" ? "overflow-hidden" : "overflow-y-auto"
          } pb-4`}
        >
          {viewType === "rankings" ? (
            <div className="bg-[#1a1a1a] rounded-lg shadow h-full">
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-[#111111] sticky top-0 z-10">
                      <tr>
                        <th className="w-12 md:w-20 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider">
                          <div className="flex items-center">Rank</div>
                        </th>
                        <th
                          onClick={() => handleSort("name")}
                          className="px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider cursor-pointer hover:text-gray-300"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span>Fighter</span>
                              <SortIndicator field="name" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent sort trigger
                                setShowActiveOnly(!showActiveOnly);
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full transition-colors duration-200 ${
                                  showActiveOnly
                                    ? "bg-green-400"
                                    : "bg-gray-600"
                                }`}
                              />
                              <span
                                className={
                                  showActiveOnly
                                    ? "text-green-400"
                                    : "text-gray-400"
                                }
                              >
                                Show Active Only
                              </span>
                            </button>
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("rax")}
                          className="w-24 md:w-72 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider cursor-pointer hover:text-gray-300"
                        >
                          <div className="flex items-center">
                            Rax / Year
                            <SortIndicator field="rax" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("passes")}
                          className="w-24 md:w-32 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider cursor-pointer hover:text-gray-300"
                        >
                          <div className="flex items-center">
                            Owned Passes
                            <SortIndicator field="passes" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("age")}
                          className="w-20 md:w-24 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider cursor-pointer hover:text-gray-300"
                        >
                          <div className="flex items-center">
                            Age
                            <SortIndicator field="age" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("fights")}
                          className="w-20 md:w-24 px-2 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-500 tracking-wider cursor-pointer hover:text-gray-300"
                        >
                          <div className="flex items-center">
                            Fights
                            <SortIndicator field="fights" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {visibleFighters.map((fighter) => {
                        const multiplier = multiplierMap[fighter.name] || 1.2;
                        const multiplierColor =
                          multipliers.find((m) => m.value === multiplier)
                            ?.color || "text-blue-400";

                        const adjustedValue = calculateDailyAdjustedValue(
                          fighter,
                          multiplier
                        );

                        return (
                          <tr key={fighter.name} className="hover:bg-[#222222]">
                            <td className="w-12 md:w-20 px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                              <span className="text-sm md:text-xl font-bold text-gray-400">
                                {rankMap.get(fighter.name)}
                              </span>
                            </td>
                            <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-sm md:text-xl text-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">
                                  {fighter.name}
                                </span>
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
                                  {Math.round(adjustedValue)}
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
                                      {m.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() =>
                                    setSelectedFighterModal(fighter)
                                  }
                                  className="text-gray-400 hover:text-gray-300 font-medium flex items-center gap-1.5"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                  </svg>
                                  <span className="hidden md:inline text-sm">
                                    Detail View
                                  </span>
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
                                <button
                                  onClick={() =>
                                    setSelectedPassDistribution(fighter)
                                  }
                                  className="text-gray-400 hover:text-gray-300 font-medium flex items-center gap-1.5"
                                >
                                  <svg
                                    className="w-5 h-5 md:w-6 md:h-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 8v8m-4-5v5M8 8v8m-4-5v5m0 0v3a2 2 0 002 2h12a2 2 0 002-2v-3"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                            <td className="w-20 md:w-24 px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                              <span
                                className={`text-sm md:text-xl font-bold ${getAgeColor(
                                  fighter.age
                                )}`}
                              >
                                {fighter.age || "-"}
                              </span>
                            </td>
                            <td className="w-20 md:w-24 px-2 md:px-6 py-2 md:py-4 whitespace-nowrap">
                              <span
                                className={`text-sm md:text-xl font-bold ${getFightsColor(
                                  fighter.scores.length
                                )}`}
                              >
                                {fighter.scores.length}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visibleFighters.length > 0 && (
                    <div
                      ref={loadingRef}
                      className="h-10 flex items-center justify-center"
                    >
                      {visibleFighters.length <
                        sortedFighters.filter((fighter) =>
                          fighter.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        ).length && (
                        <div className="text-gray-500 text-sm">
                          Loading more...
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                onShowDetail={(fighter) => setSelectedFighterModal(fighter)}
              />
            </div>
          ) : (
            <Recommendations
              fighters={sortedFighters}
              multiplierMap={multiplierMap}
              onMultiplierChange={handleMultiplierChange}
            />
          )}
        </div>

        <div className="py-4 flex justify-center items-center gap-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChangelogOpen(true)}
              className="text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors duration-200"
            >
              Changelog
            </button>
            <span className="text-gray-700 text-sm font-medium">v1.0.6</span>
          </div>
          <span className="text-gray-700">•</span>
          <a
            href="https://github.com/steventanyang/ufcraxV2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="inline-block"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
          <span className="text-gray-700">•</span>
          <span className="text-gray-400 text-sm">
            Join &quot;UFC Rax group&quot; for feedback
          </span>
          {/* <span className="text-gray-700">•</span>
          <span className="text-gray-400 text-sm">
            {visitorCount ? (
              <>
                Used by <strong>{visitorCount.toLocaleString() + 2407}</strong>{" "}
                rax investors
              </>
            ) : (
              "Loading..."
            )}
          </span> */}
        </div>
      </div>
      {selectedFighterModal && (
        <FighterModal
          fighter={selectedFighterModal}
          multiplier={multiplierMap[selectedFighterModal.name] || 1.2}
          onClose={() => setSelectedFighterModal(null)}
          onMultiplierChange={handleMultiplierChange}
        />
      )}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
      {selectedPassDistribution && (
        <PassDistributionModal
          fighter={selectedPassDistribution}
          onClose={() => setSelectedPassDistribution(null)}
        />
      )}
    </main>
  );
}
