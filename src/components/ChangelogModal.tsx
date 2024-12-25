interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal = ({ isOpen, onClose }: ChangelogModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-100">Changelog</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-b border-gray-700 pb-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                December 25, 2024
              </h3>
              <div className="space-y-3 text-gray-300">
                <p className="font-medium text-green-400">Initial Release</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Launched UFC Rax V2 with completely redesigned UI/UX</li>
                  <li>
                    Added fighter rankings based on daily-adjusted Rax values
                  </li>
                  <li>
                    Implemented multiplier system (1.2x - 6.0x) for value
                    calculations
                  </li>
                  <li>
                    Added fighter comparison tool to analyze two fighters side
                    by side
                  </li>
                  <li>
                    Introduced &quot;Who to Buy&quot; recommendations feature
                  </li>
                  <li>Added detailed fighter statistics modal view</li>
                  <li>Integrated active fighter indicators</li>
                  <li>
                    Added owned passes tracking with color-coded indicators
                  </li>
                  <li>Implemented responsive design for mobile and desktop</li>
                  <li>Added search functionality for quick fighter lookup</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
