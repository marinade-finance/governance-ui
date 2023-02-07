import Input from '@components/inputs/Input'
import { createColumnHelper } from '@tanstack/react-table'
import type { ProposalOption } from '@solana/spl-governance'

const columnHelper = createColumnHelper<ProposalOption>()

export const getColumns = (
  voteWeights: Record<string, number>,
  updateWeight: (optionId: string, updateValue: string) => void,
  getRelativeVoteWeight: (optionId: string) => number
) => [
  columnHelper.accessor('label', { header: 'Option' }),
  columnHelper.accessor('label', {
    id: 'currentWeight',
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
    id: 'currentWeight',
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
  // columnHelper.accessor('relativeVoteResult', {
  //   header: () => <div className="text-right">Global share</div>,
  //   cell: (info) => {
  //     const relativeWeight = info.getValue()
  //     return (
  //       <div className="text-right">
  //         {relativeWeight !== 0 ? `${relativeWeight.toFixed(2)}%` : '-'}
  //       </div>
  //     )
  //   },
  // }),
]
