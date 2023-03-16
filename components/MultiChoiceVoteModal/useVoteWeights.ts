import { createContext, useEffect, useState } from 'react'
import {
  ProposalOption,
  Vote,
  VoteChoice,
  VoteKind,
} from '@solana/spl-governance'

interface VoteWeightsContextType {
  voteWeights: Record<string, number>
  presetWeights: (
    votes: Vote | undefined,
    options: ProposalOption[] | undefined
  ) => void
  updateWeight: (optionId: string, updateValue: string) => void
  getRelativeVoteWeight: (optionId: string) => number
  getVotes: (options?: ProposalOption[]) => Vote
}

export const VoteWeightsContext = createContext<VoteWeightsContextType>({
  voteWeights: {},
  updateWeight: () => {
    throw new Error('not implemented')
  },
  presetWeights: () => {
    throw new Error('not implemented')
  },
  getRelativeVoteWeight: () => {
    throw new Error('not implemented')
  },
  getVotes: () => {
    throw new Error('not implemented')
  },
})

export const useVoteWeights = (): VoteWeightsContextType => {
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

  const presetWeights = (
    votes: Vote | undefined,
    options: ProposalOption[] | undefined
  ) => {
    const weights: Record<string, number> = {}

    if (
      votes?.approveChoices &&
      options?.length === votes.approveChoices.length
    ) {
      votes.approveChoices.forEach((vote, index) => {
        weights[options[index].label] = vote.weightPercentage
      })
    }

    setVoteWeights(weights)
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

  return {
    voteWeights,
    updateWeight,
    presetWeights,
    getRelativeVoteWeight,
    getVotes,
  }
}
