import Input from '@components/inputs/Input'
import { createColumnHelper } from '@tanstack/react-table'
import type { ProposalOption } from '@solana/spl-governance'
import { BN } from 'bn.js'

const columnHelper = createColumnHelper<ProposalOption>()

export const getColumns = (
  voteWeights: Record<string, number>,
  updateWeight: (optionId: string, updateValue: string) => void,
  getRelativeVoteWeight: (optionId: string) => number,
  currentVotes?: ProposalOption[]
) => [
  columnHelper.accessor('label', { header: 'Gauge name' }),
  columnHelper.accessor('label', {
    id: 'currentVotes',
    header: 'Current votes %',
    cell: (info) => {
      const currentVote = currentVotes?.find((v) => v.label === info.getValue())
      const totalWeight = currentVotes?.reduce(
        (sum, current) => sum.add(current.voteWeight),
        new BN(0)
      )

      const relativeWeight =
        totalWeight?.gt(new BN(0)) && currentVote
          ? currentVote.voteWeight
              .mul(new BN(10000))
              .div(totalWeight)
              .toNumber() / 10000
          : 0
      return (
        <div className="text-right">
          {relativeWeight !== 0 ? `${(relativeWeight * 100).toFixed(2)}%` : '-'}
        </div>
      )
    },
  }),
  columnHelper.accessor('label', {
    id: 'yourCurrentWeight',
    header: () => <div className="text-right">Your current share</div>,
    cell: (info) => {
      const relativeWeight = getRelativeVoteWeight(info.getValue())
      return (
        <div className="text-right">
          {relativeWeight !== 0 ? `${(relativeWeight * 100).toFixed(2)}%` : '-'}
        </div>
      )
    },
  }),
  columnHelper.accessor('label', {
    id: 'voteWeight',
    header: () => <div className="text-center">Vote weight</div>,
    cell: (info) => {
      const optionId = info.getValue()
      return (
        <Input
          type="text"
          key={optionId}
          value={voteWeights[optionId]}
          className="max-w-[120px] self-center"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateWeight(optionId, e.target.value)
          }
        />
      )
    },
  }),
]
