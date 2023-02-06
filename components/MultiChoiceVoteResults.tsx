import { Proposal } from '@solana/spl-governance'
import useProposalVotes from '@hooks/useProposalVotes'
import MultiChoiceVoteResultsBar from './MultiChoiceVoteResultBar'
import { useMemo, useState } from 'react'
import { BN } from 'bn.js'
import { LinkButton } from './Button'
import { ChevronDownIcon } from '@heroicons/react/solid'

const COLORS = ['bg-orange-700', 'bg-blue-500', 'bg-purple-800', 'bg-white']

type VoteResultsProps = {
  isListView?: boolean
  proposal: Proposal
}

const MultiChoiceVoteResults = ({ isListView, proposal }: VoteResultsProps) => {
  const { multiWeightVotes } = useProposalVotes(proposal)

  const [extended, setExtended] = useState(false)

  const options = useMemo(() => {
    if (!multiWeightVotes) return []

    const totalVotes = multiWeightVotes.reduce(
      (sum, current) => sum.add(current.voteWeight),
      new BN(0)
    )

    if (totalVotes.eq(new BN(0))) return []

    return multiWeightVotes
      .map((option) => {
        return {
          label: option.label,
          relativeVoteResult: option.voteWeight.div(totalVotes).toNumber(),
        }
      })
      .sort((a, b) => (a.relativeVoteResult > b.relativeVoteResult ? -1 : 1))
  }, [multiWeightVotes])

  const reducedOptions = useMemo(() => {
    if (options.length < 5) return options

    const reduced = options.slice(0, 3)
    const otherOptions = options.slice(3)

    const rest = otherOptions.reduce(
      (obj, current) => {
        return {
          ...obj,
          relativeVoteResult:
            obj.relativeVoteResult + current.relativeVoteResult,
        }
      },
      { label: `${otherOptions.length} others`, relativeVoteResult: 0 }
    )

    return [...reduced, rest]
  }, [options])

  const votesExist = !!multiWeightVotes?.some((option) =>
    option.voteWeight.lt(new BN(0))
  )

  return (
    <div className="w-full flex items-center space-x-4">
      {proposal ? (
        <div className="rounded-md w-full">
          {isListView ? (
            <>
              <div className="flex flex-row mb-4 gap-10">
                {!votesExist ? <p>No votes casted yet</p> : undefined}
                {reducedOptions.map((opt, index) => (
                  <div key={opt.label}>
                    <div className="flex flex-row items-center">
                      <div
                        className={`${COLORS[index]} w-3 h-3 rounded-lg mr-2`}
                      />
                      <p className="truncate w-36">{opt.label}</p>
                    </div>
                    <p className="ml-5 font-bold text-fgd-1">
                      <span className="text-xs font-bold text-white">
                        {(opt.relativeVoteResult * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                ))}
              </div>
              <MultiChoiceVoteResultsBar
                options={reducedOptions}
                votesExist={votesExist}
                colors={COLORS}
              />
            </>
          ) : (
            <div className={votesExist ? 'mt-7' : undefined}>
              {options.slice(0, extended ? undefined : 4).map((option) => (
                <>
                  <div className="flex justify-between gap-5">
                    <span className="flex-grow truncate font-bold text-sm">
                      {option.label}
                    </span>
                    <p className="text-sm">{`${(
                      option.relativeVoteResult * 100
                    ).toFixed(1)}%`}</p>
                  </div>
                  <div
                    className={`mt-0.5 h-1 bg-sky-400 w-[${(
                      option.relativeVoteResult * 100
                    ).toLocaleString('en-US')}%]`}
                  />
                  <div className="my-3 h-[1px] w-full bg-neutral-700" />
                </>
              ))}
              {options.length > 4 ? (
                <LinkButton
                  className="w-full flex justify-center mt-5 font-bold"
                  onClick={() => setExtended((state) => !state)}
                >
                  {extended ? 'Show less' : 'Show more'}
                  <ChevronDownIcon
                    className={`default-transition h-5 w-5 ml-1 ${
                      extended ? 'transform rotate-180' : 'transform rotate-360'
                    }`}
                  />
                </LinkButton>
              ) : undefined}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-12 rounded animate-pulse bg-bkg-3" />
      )}
    </div>
  )
}

export default MultiChoiceVoteResults
