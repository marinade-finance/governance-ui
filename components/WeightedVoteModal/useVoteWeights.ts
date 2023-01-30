import { useEffect, useState } from 'react'
import { createContainer } from 'unstated-next'

const useVoteWeightsInner = () => {
  const [voteWeights, setVoteWeights] = useState<Record<string, number>>({})
  const [totalVoteWeight, setTotalVoteWeight] = useState(0)

  useEffect(() => {
    setTotalVoteWeight(
      Object.values(voteWeights).reduce((acc, weight) => acc + weight, 0)
    )
  }, [voteWeights])

  const updateWeight = (optionId: string, updateValue: string) => {
    const value = parseFloat(updateValue)
    if (isNaN(value)) {
      const newWeights = { ...voteWeights }
      delete newWeights[optionId]
      setVoteWeights(newWeights)
    } else {
      setVoteWeights({ ...voteWeights, [optionId]: value })
    }
  }

  const getRelativeVoteWeight = (optionId: string) => {
    if (!(voteWeights?.[optionId] && totalVoteWeight > 0)) {
      return 0
    }

    return voteWeights[optionId] / totalVoteWeight
  }

  return { voteWeights, updateWeight, getRelativeVoteWeight }
}

export const {
  useContainer: useVoteWeights,
  Provider: VoteWeightsProvider,
} = createContainer(useVoteWeightsInner)
