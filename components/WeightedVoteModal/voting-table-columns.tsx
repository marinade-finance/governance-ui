import Input from '@components/inputs/Input'
import { Column } from 'react-table'
import { useVoteWeights } from './useVoteWeights'

export const columns: Column<{
  label: string
  relativeVoteResult: number
}>[] = [
  { Header: 'Option', accessor: 'label' },
  {
    Header: () => <div className="text-right">Your current share</div>,
    id: 'currentWeight',
    accessor: 'label',
    Cell: (info) => {
      const { getRelativeVoteWeight } = useVoteWeights()
      const relativeWeight = getRelativeVoteWeight(info.value)
      return (
        <div className="text-right">
          {relativeWeight !== 0 ? `${(relativeWeight * 100).toFixed(2)}%` : '-'}
        </div>
      )
    },
  },
  {
    Header: () => <div className="text-center">Vote weight</div>,
    id: 'voteWeight',
    accessor: 'label',
    Cell: (info) => {
      const { voteWeights, updateWeight } = useVoteWeights()
      return (
        <Input
          type="text"
          key={info.value}
          value={voteWeights[info.value]}
          className="max-w-[120px] self-center"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateWeight(info.value, e.target.value)
          }
        />
      )
    },
  },
  {
    Header: () => <div className="text-right">Global share</div>,
    accessor: 'relativeVoteResult',
    Cell: (info) => {
      return (
        <div className="text-right">
          {info?.value && info.value !== 0 ? `${info.value.toFixed(2)}%` : '-'}
        </div>
      )
    },
  },
]
