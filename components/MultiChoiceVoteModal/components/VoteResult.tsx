import { ProposalOption } from '@solana/spl-governance'
import { BN } from 'bn.js'

interface VoteResultProps {
  label: string
  currentVotes?: ProposalOption[]
}

export const VoteResult = ({ label, currentVotes }: VoteResultProps) => {
  const currentVote = currentVotes?.find((v) => v.label === label)
  const totalWeight = currentVotes?.reduce(
    (sum, current) => sum.add(current.voteWeight),
    new BN(0)
  )

  const relativeWeight =
    totalWeight?.gt(new BN(0)) && currentVote
      ? currentVote.voteWeight.mul(new BN(10000)).div(totalWeight).toNumber() /
        10000
      : 0
  return (
    <div className="flex text-white text-sm items-center gap-2">
      <span className="w-[59px] text-right">{`${(relativeWeight * 100).toFixed(
        2
      )}%`}</span>
      <div
        className="h-1 bg-sky-400"
        style={{ width: `${1 + Math.round(relativeWeight * 100)}px` }}
      />
    </div>
  )
}
