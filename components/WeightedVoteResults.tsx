import { Proposal } from '@solana/spl-governance'
import MultipleChoiceVoteResultsBar from './MultipleChoiceVoteResultsBar'

const COLORS = ['bg-orange-700', 'bg-blue-500', 'bg-purple-800', 'bg-white']

type VoteResultsProps = {
  isListView?: boolean
  proposal: Proposal
}

const WeightedVoteResults = ({ isListView, proposal }: VoteResultsProps) => {
  //const { optionVotes, totalVoteCount } = useProposalVotes(proposal)

  // mock data
  const optionVotes = [
    {
      label: 'Validator 1',
      relativeVoteResult: 0,
    },
    {
      label: 'Validator 2',
      relativeVoteResult: 0.211,
    },
    {
      label: 'Validator 3',
      relativeVoteResult: 0.3,
    },
    {
      label: 'Validator 4',
      relativeVoteResult: 0.4,
    },
    {
      label: 'Validator 5',
      relativeVoteResult: 0.03,
    },
    {
      label: 'Validator 6',
      relativeVoteResult: 0.059,
    },
  ]
  const sortedOptions = optionVotes.sort((a, b) =>
    a.relativeVoteResult < b.relativeVoteResult ? 1 : -1
  )
  let bundledOptions = sortedOptions
  if (sortedOptions.length > 4) {
    const displayedOptions = sortedOptions.slice(0, 3)
    const remainingOptions = sortedOptions.slice(3)
    bundledOptions = [
      ...displayedOptions,
      {
        label: `${remainingOptions.length} other options`,
        relativeVoteResult: remainingOptions.reduce(
          (acc, opt) => acc + opt.relativeVoteResult,
          0
        ),
      },
    ]
  }
  const optionsToDisplay = bundledOptions.filter(
    (opt) => opt.relativeVoteResult > 0.01
  )

  return (
    <div className="flex items-center space-x-4">
      {proposal ? (
        <div
          className={`${!isListView ? 'bg-bkg-1 p-3' : ''} rounded-md w-full`}
        >
          {isListView ? (
            <>
              <div className="flex flex-row justify-between mb-4">
                {optionsToDisplay.map((opt, index) => (
                  <div>
                    <div className="flex flex-row items-center">
                      <div
                        className={`${COLORS[index]} w-3 h-3 rounded-lg mr-2`}
                      />
                      <p>{opt.label}</p>
                    </div>
                    <p className="ml-5 font-bold text-fgd-1">
                      <span className="text-xs font-bold text-white">
                        {(opt.relativeVoteResult * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                ))}
              </div>
              <MultipleChoiceVoteResultsBar
                options={optionsToDisplay}
                colors={COLORS}
                votesExist={true}
              />
            </>
          ) : (
            <div className="flex flex-col gap-5">
              {optionsToDisplay.map((option, index) => (
                <div>
                  <div>
                    <div className="flex flex-row items-center">
                      <div
                        className={`${COLORS[index]} w-3 h-3 rounded-lg mr-2`}
                      />
                      <p>{option.label}</p>
                    </div>
                    <p className="ml-5 font-bold text-fgd-1">
                      <span className="text-xs font-bold text-white">
                        {(option.relativeVoteResult * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                  <MultipleChoiceVoteResultsBar
                    options={[option]}
                    colors={[COLORS[index]]}
                    votesExist={true}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="w-full h-12 rounded animate-pulse bg-bkg-3" />
        </>
      )}
    </div>
  )
}

export default WeightedVoteResults
