import { useEffect, useState } from 'react'

export const useVoteWeights = () => {
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
