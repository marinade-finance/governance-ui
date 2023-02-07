import { useEffect, useState } from 'react'
import {
  ProposalOption,
  Vote,
  VoteChoice,
  VoteKind,
} from '@solana/spl-governance'

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

    return (
      Math.round(
        (voteWeights[optionId] / totalVoteWeight + Number.EPSILON) * 100
      ) / 100
    )
  }

  const getVotes = (options?: ProposalOption[]) => {
    const approveChoices = options?.map(
      (option) =>
        new VoteChoice({
          rank: 0,
          weightPercentage: Math.round(
            getRelativeVoteWeight(option.label) * 100
          ),
        })
    )

    return new Vote({
      voteType: VoteKind.Approve,
      approveChoices,
      deny: undefined,
      veto: undefined,
    })
  }

  return { voteWeights, updateWeight, getRelativeVoteWeight, getVotes }
}
