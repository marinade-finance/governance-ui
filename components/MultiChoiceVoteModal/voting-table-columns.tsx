import Input from '@components/inputs/Input'
import { createColumnHelper } from '@tanstack/react-table'
import type { ProposalOption } from '@solana/spl-governance'
import { BN } from 'bn.js'
import { CaretDown } from '@carbon/icons-react'

const headerStyle = 'text-xs text-neutral-500 font-normal'

const columnHelper = createColumnHelper<ProposalOption>()

export const getColumns = (
  voteWeights: Record<string, number>,
  updateWeight: (optionId: string, updateValue: string) => void,
  getRelativeVoteWeight: (optionId: string) => number,
  descendingWeights: boolean,
  toggleDescendingWeights: () => void,
  currentVotes?: ProposalOption[]
) => [
  columnHelper.accessor('label', {
    header: () => <span className={headerStyle}>Gauge name</span>,
    cell: (info) => (
      <span className="text-white text-base font-bold">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('label', {
    id: 'currentVotes',
    header: () => (
      <div
        className={`flex items-end gap-2 cursor-pointer hover:text-neutral-400 ${headerStyle}`}
        onClick={toggleDescendingWeights}
      >
        <span>Current votes %</span>
        <CaretDown className={descendingWeights ? '' : 'rotate-180'} />
      </div>
    ),
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
        <div className="flex text-white text-sm items-center">
          <span className="w-16">{`${(relativeWeight * 100).toFixed(
            2
          )}%`}</span>
          <div
            className="h-1 bg-sky-400"
            style={{ width: `${1 + Math.round(relativeWeight * 100)}px` }}
          />
        </div>
      )
    },
  }),
  columnHelper.accessor('label', {
    id: 'yourCurrentWeight',
    header: () => (
      <>
        <span className="text-xs text-white font-normal">Your votes </span>
        <span className={headerStyle}>%</span>
      </>
    ),
    cell: (info) => {
      const optionId = info.getValue()
      const relativeWeight = getRelativeVoteWeight(optionId)
      return (
        <div className="flex gap-2 items-center w-[150px]" key={optionId}>
          <Input
            type="text"
            value={voteWeights[optionId]}
            className="border-neutral-700 placeholder-neutral-500 w-[130px]"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateWeight(optionId, e.target.value)
            }
          />
          <span className="text-sm text-neutral-500">
            {relativeWeight ? `${(relativeWeight * 100).toFixed(2)}%` : ''}
          </span>
        </div>
      )
    },
  }),
]
