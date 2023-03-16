import { createColumnHelper } from '@tanstack/react-table'
import type { ProposalOption } from '@solana/spl-governance'
import { CaretDown } from '@carbon/icons-react'
import { VoteResult } from './components/VoteResult'
import { VoteWeightInput } from './components/VoteWeightInput'

const headerStyle = 'text-xs text-neutral-500 font-normal'

const columnHelper = createColumnHelper<ProposalOption>()

export const getColumns = (
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
    cell: (info) => (
      <VoteResult label={info.getValue()} currentVotes={currentVotes} />
    ),
  }),
  columnHelper.accessor('label', {
    id: 'yourCurrentWeight',
    header: () => (
      <>
        <span className="text-xs text-white font-normal">Your votes </span>
        <span className={headerStyle}>%</span>
      </>
    ),
    cell: (info) => <VoteWeightInput optionId={info.getValue()} />,
  }),
]
