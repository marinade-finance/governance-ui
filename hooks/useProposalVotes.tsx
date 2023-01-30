import { BN } from '@project-serum/anchor'
import { Proposal } from '@solana/spl-governance'
import useNftPluginStore from 'NftVotePlugin/store/nftPluginStore'
import { getProposalMaxVoteWeight } from '../models/voteWeights'
import { calculatePct, fmtTokenAmount } from '../utils/formatting'
import useRealm from './useRealm'

export default function useProposalVotes(proposal?: Proposal) {
  const { realm, mint, councilMint, governances } = useRealm()
  const maxVoteRecord = useNftPluginStore((s) => s.state.maxVoteRecord)
  const governance =
    proposal && governances[proposal.governance?.toBase58()]?.account

  const proposalMint =
    proposal?.governingTokenMint.toBase58() ===
    realm?.account.communityMint.toBase58()
      ? mint
      : councilMint
  // TODO: optimize using memo
  if (!realm || !proposal || !governance || !proposalMint)
    return {
      voteThresholdPct: 100,
      yesVotePct: 0,
      yesVoteProgress: 0,
      yesVoteCount: 0,
      noVoteCount: 0,
      minimumYesVotes: 0,
      yesVotesRequired: 0,
      optionVotes: [],
      totalVoteCount: 0,
    }

  const isCommunityVote =
    proposal?.governingTokenMint.toBase58() ===
    realm?.account.communityMint.toBase58()
  const isPluginCommunityVoting = maxVoteRecord && isCommunityVote
  const voteThresholdPct =
    (proposal.isVoteFinalized() && proposal.voteThreshold?.value) ||
    governance.config.communityVoteThreshold.value!

  const maxVoteWeight = isPluginCommunityVoting
    ? maxVoteRecord.account.maxVoterWeight
    : getProposalMaxVoteWeight(realm.account, proposal, proposalMint)

  const minimumYesVotes =
    fmtTokenAmount(maxVoteWeight, proposalMint.decimals) *
    (voteThresholdPct / 100)

  const isMultiProposal = proposal?.options?.length > 1
  const yesVotePct = !isMultiProposal
    ? calculatePct(proposal.getYesVoteCount(), maxVoteWeight)
    : 0
  const yesVoteProgress = (yesVotePct / voteThresholdPct) * 100
  const yesVoteCount = !isMultiProposal
    ? fmtTokenAmount(proposal.getYesVoteCount(), proposalMint.decimals)
    : 0
  const noVoteCount = !isMultiProposal
    ? fmtTokenAmount(proposal.getNoVoteCount(), proposalMint.decimals)
    : 0

  const totalVoteCount = !isMultiProposal
    ? yesVoteCount + noVoteCount
    : proposal.options.reduce((acc, opt) => acc + opt.voteResult, 0)
  const optionVotes = isMultiProposal
    ? proposal.options.map((p) => {
        return {
          label: p.label,
          relativeVoteResult: p.voteResult / totalVoteCount,
        }
      })
    : []

  const getRelativeVoteCount = (voteCount: number) =>
    totalVoteCount === 0 ? 0 : (voteCount / totalVoteCount) * 100

  const relativeYesVotes = getRelativeVoteCount(yesVoteCount)
  const relativeNoVotes = getRelativeVoteCount(noVoteCount)

  const rawYesVotesRequired = minimumYesVotes - yesVoteCount
  const yesVotesRequired =
    proposalMint.decimals == 0
      ? Math.ceil(rawYesVotesRequired)
      : rawYesVotesRequired

  return {
    voteThresholdPct,
    yesVotePct,
    yesVoteProgress,
    yesVoteCount,
    noVoteCount,
    relativeYesVotes,
    relativeNoVotes,
    minimumYesVotes,
    yesVotesRequired,
    optionVotes,
    totalVoteCount,
  }
}
