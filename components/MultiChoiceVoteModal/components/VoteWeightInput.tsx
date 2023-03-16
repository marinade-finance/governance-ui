import Input from '@components/inputs/Input'
import { useContext } from 'react'
import { VoteWeightsContext } from '../useVoteWeights'

interface VoteWeightInputProps {
  optionId: string
}

export const VoteWeightInput = ({ optionId }: VoteWeightInputProps) => {
  const { voteWeights, updateWeight, getRelativeVoteWeight } = useContext(
    VoteWeightsContext
  )

  const relativeWeight = getRelativeVoteWeight(optionId)
  return (
    <div className="w-[130px]">
      <Input
        key={optionId}
        id={optionId}
        type="text"
        value={voteWeights[optionId]}
        className="border-neutral-700 placeholder-neutral-500"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          updateWeight(optionId, e.target.value)
        }
        suffix={relativeWeight ? `${(relativeWeight * 100).toFixed(0)}%` : ''}
      />
    </div>
  )
}
