import { Fighter } from "@/types/fighters";

interface PassDistributionModalProps {
  fighter: Fighter;
  onClose: () => void;
}

const LEVEL_COLORS = {
  7: "bg-pink-400",
  6: "bg-yellow-400",
  5: "bg-purple-400",
  4: "bg-red-400",
  3: "bg-orange-400",
};

const LEVEL_LABELS = {
  7: "Iconic",
  6: "Mythical",
  5: "Legendary",
  4: "Epic",
  3: "Rare",
};

export default function PassDistributionModal({
  fighter,
  onClose,
}: PassDistributionModalProps) {
  // Find the maximum value for scaling
  const maxPasses = Math.max(...Object.values(fighter.passDistribution));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-100">{fighter.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {[7, 6, 5, 4, 3].map((level) => (
            <div key={level} className="flex items-center gap-3">
              <div className="w-24 text-sm text-gray-400">
                {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}
              </div>
              <div className="flex-1 h-8 bg-[#2a2a2a] rounded-lg overflow-hidden">
                <div
                  className={`h-full ${
                    LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]
                  } transition-all duration-500`}
                  style={{
                    width: `${
                      (fighter.passDistribution[
                        level as keyof typeof fighter.passDistribution
                      ] /
                        maxPasses) *
                      100
                    }%`,
                  }}
                />
              </div>
              <div className="w-12 text-right text-sm font-medium text-gray-300">
                {
                  fighter.passDistribution[
                    level as keyof typeof fighter.passDistribution
                  ]
                }
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Total Passes:{" "}
          {Object.values(fighter.passDistribution).reduce((a, b) => a + b, 0)}
        </div>
      </div>
    </div>
  );
}
