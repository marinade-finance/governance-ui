import { Proposal } from '@solana/spl-governance'
import useProposalVotes from '@hooks/useProposalVotes'
import MultiChoiceVoteResultsBar from './MultiChoiceVoteResultBar'
import { useMemo } from 'react'
import { BN } from 'bn.js'

const COLORS = ['bg-orange-700', 'bg-blue-500', 'bg-purple-800', 'bg-white']

type VoteResultsProps = {
  isListView?: boolean
  proposal: Proposal
}

const MultiChoiceVoteResults = ({ isListView, proposal }: VoteResultsProps) => {
  const { multiWeightVotes } = useProposalVotes(proposal)

  const options = useMemo(() => {
    if (!multiWeightVotes) return []

    const totalVotes = multiWeightVotes.reduce(
      (sum, current) => sum.add(current.voteWeight),
      new BN(0)
    )

    if (totalVotes.eq(new BN(0))) return []

    return multiWeightVotes
      .map((option, index) => {
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
            <div className="flex flex-row mb-4 gap-10">
              {!votesExist ? <p>No votes casted yet</p> : undefined}
              {reducedOptions.map((opt, index) => (
                <div>
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
          ) : undefined}
          <MultiChoiceVoteResultsBar
            options={reducedOptions}
            votesExist={votesExist}
            colors={COLORS}
          />
        </div>
      ) : (
        <div className="w-full h-12 rounded animate-pulse bg-bkg-3" />
      )}
    </div>
  )
}

export default MultiChoiceVoteResults
