import { Proposal } from '@solana/spl-governance'
import useProposalVotes from '@hooks/useProposalVotes'
import { useMemo, useState } from 'react'
import { BN } from 'bn.js'
import { LinkButton } from './Button'
import { ChevronDownIcon } from '@heroicons/react/solid'

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
          relativeVoteResult:
            option.voteWeight.mul(new BN(100000)).div(totalVotes).toNumber() /
            100000,
        }
      })
      .sort((a, b) => (a.relativeVoteResult > b.relativeVoteResult ? -1 : 1))
  }, [multiWeightVotes])

  const reducedOptions = useMemo(() => {
    const SHOW_NUM = 4
    if (options.length < SHOW_NUM + 1) return options

    const reduced = options.slice(0, SHOW_NUM - 1)
    const otherOptions = options.slice(SHOW_NUM - 1)

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
    option.voteWeight.gt(new BN(0))
  )

  return (
    <div className="w-full flex items-center space-x-4">
      {proposal ? (
        <div className="rounded-md w-full">
          {isListView ? (
            <>
              {!votesExist ? <p>No votes casted yet</p> : undefined}
              {reducedOptions.map((option, index) => (
                <div
                  className={`flex justify-between items-center ${
                    index !== reducedOptions.length - 1 ? 'mb-1.5' : ''
                  }`}
                  key={option.label}
                >
                  <span className="flex-grow truncate font-bold text-base">
                    {option.label}
                  </span>
                  <div className="flex gap-2 items-center">
                    <p className="text-sm font-medium">{`${(
                      option.relativeVoteResult * 100
                    ).toFixed(1)}%`}</p>
                    <div className="w-full flex">
                      <div className="h-1 bg-sky-400 w-[1px]" />
                      <div
                        className="h-1 bg-sky-400"
                        style={{
                          width: `${Math.round(
                            option.relativeVoteResult * 100
                          )}px`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
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
                  <div className="w-full flex">
                    <div className="mt-0.5 h-1 bg-sky-400 w-[1px]" />
                    <div
                      className="mt-0.5 h-1 bg-sky-400"
                      style={{
                        width: `${option.relativeVoteResult * 100}%`,
                      }}
                    />
                  </div>
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
