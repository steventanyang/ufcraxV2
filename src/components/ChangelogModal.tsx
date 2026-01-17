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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-100">Changelog</h2>
            </div>
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
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  January 17, 2026
                </h3>
                <span className="text-sm text-gray-400">v1.0.9</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    New Rax multiplier system with tiered rarities:
                    <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                      <li>Common (1.2x), Uncommon (1.4x), Rare (1.6x), Epic (2.0x)</li>
                      <li>Legendary: 5 tiers (5.0x - 6.6x)</li>
                      <li>Mystic: 10 tiers (10.0x - 11.8x)</li>
                      <li>Iconic: 20 tiers (20.0x - 25.7x)</li>
                    </ul>
                  </li>
                  <li>
                    Increased fighter slots from 10 to 15 in &quot;Who to Buy&quot; recommendations
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  August 3, 2025
                </h3>
                <span className="text-sm text-gray-400">v1.0.8</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    Data update with latest fights and statistics. mb I got busy with work.
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  January 28, 2025
                </h3>
                <span className="text-sm text-gray-400">v1.0.7</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    Added calendar visualization for multiple fighters:
                    <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                      <li>
                        The detail poppup in the &quot;Who to buy&quot; page now
                        shows calendar for selected fighters
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  January 26, 2025
                </h3>
                <span className="text-sm text-gray-400">v1.0.6</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    Added new calendar view to fighter details:
                    <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                      <li>
                        Visual heatmap showing daily Rax activity over the past
                        year
                      </li>
                      <li>
                        Color intensity indicates relative Rax value for each
                        day
                      </li>
                      <li>Detail View &gt; Calendar</li>
                    </ul>
                  </li>
                  <li>
                    Updated fighter value calculations to include +25 Rax for
                    losses
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  January 7, 2025
                </h3>
                <span className="text-sm text-gray-400">v1.0.5</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    selections in recommended tab now persist between browser
                    sessions
                  </li>
                  <li>
                    Added &quot;Clear All Fighters&quot; button to
                    recommendations page
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  January 6, 2025
                </h3>
                <span className="text-sm text-gray-400">v1.0.4</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    Changed date format in fighter details from MM-DD to month
                    name and day
                  </li>
                  <li>Small bug fixes</li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  January 2, 2025
                </h3>
                <span className="text-sm text-gray-400">v1.0.3</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>
                    Added advanced sorting system to rankings page:
                    <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                      <li>
                        Sort by fighter name, Rax/Year, owned passes, age, or
                        number of fights
                      </li>
                      <li>
                        Click column headers to toggle ascending/descending
                        order
                      </li>
                    </ul>
                  </li>
                  <li>
                    Added age and fight count columns with color-coded
                    indicators
                  </li>
                  <li>Added &quot;Show Active Only&quot; toggle</li>
                  <li>Small bug fixes</li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  December 28, 2024
                </h3>
                <span className="text-sm text-gray-400">v1.0.2</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Added owned passes distribution modal for fighters</li>
                  <li>Bug fixes </li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  December 26, 2024
                </h3>
                <span className="text-sm text-gray-400">v1.0.1</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Bug fixes</li>
                  <li>Daily breakdowns on rankings + compare pages</li>
                </ul>
              </div>
            </div>

            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-100">
                  December 25, 2024
                </h3>
                <span className="text-sm text-gray-400">v1.0.0</span>
              </div>
              <div className="space-y-3 text-gray-300">
                <p className="font-medium text-green-400">Initial Release</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Launched UFC Rax V2 with new UI/UX</li>
                  <li>
                    Adjusted fighter rankings based on new adjusted Rax values
                  </li>
                  <li>
                    Same multiplier system (1.2x - 6.0x) for value calculations
                    as before
                  </li>
                  <li>
                    Detailed view for monthly rax breakdowns, active tag, and
                    owned passes column updated daily
                  </li>
                  <li>
                    Updated fighter comparison tool to show monthly rax
                    breakdowns
                  </li>
                  <li>
                    &quot;Who to Buy&quot; recommendations feature with new
                    &quot;value score&quot; based on owners + active status
                  </li>
                  <li>
                    10 fighter detail view accounting for OTD rax claim overlaps
                    (thx to @paolo for suggesting this)
                  </li>
                  <li>
                    Added owned passes tracking with color-coded indicators on
                    recommendations
                  </li>
                  <li>Mobile performance improvements</li>
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
