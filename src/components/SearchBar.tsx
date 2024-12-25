import React, { useCallback } from "react";
import { debounce } from "lodash";

export default function SearchBar({
  onSearch,
}: {
  onSearch: (query: string) => void;
}) {
  const debouncedSearch = useCallback(
    (value: string) => {
      debounce((searchValue: string) => {
        onSearch(searchValue);
      }, 300)(value);
    },
    [onSearch]
  );

  return (
    <div className="relative">
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
        id="main-search"
        name="main-search"
        placeholder="Search fighters..."
        onChange={(e) => debouncedSearch(e.target.value)}
        className="w-full bg-[#2a2a2a] text-gray-100 pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:outline-none"
      />
    </div>
  );
}
