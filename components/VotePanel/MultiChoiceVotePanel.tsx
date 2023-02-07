import { ProposalState } from '@solana/spl-governance'
import { BanIcon } from '@heroicons/react/solid'

import Tooltip from '@components/Tooltip'
import useWalletStore from 'stores/useWalletStore'
import { useIsVoting, useProposalVoteRecordQuery } from '../VotePanel/hooks'
import { CastMultiChoiceVoteButton } from './CastMultiChoiceVoteButtons'

const MultiChoiceVotePanel = () => {
  const { proposal } = useWalletStore((s) => s.selectedProposal)
  const connected = useWalletStore((s) => s.connected)

  const { data: ownVoteRecord } = useProposalVoteRecordQuery('electoral')

  const isVoteCast = ownVoteRecord?.result !== undefined
  const isVoting = useIsVoting()

  const didNotVote =
    connected &&
    !!proposal &&
    !isVoting &&
    proposal.account.state !== ProposalState.Cancelled &&
    proposal.account.state !== ProposalState.Draft &&
    !isVoteCast

  return (
    <>
      {didNotVote && (
        <div className="bg-bkg-2 p-4 md:p-6 rounded-lg flex flex-col items-center justify-center">
          <h3 className="text-center mb-0">You did not vote electorally</h3>
          <Tooltip content="You did not vote on this proposal">
            <BanIcon className="h-[34px] w-[34px] fill-white/50 mt-2" />
          </Tooltip>
        </div>
      )}
      <CastMultiChoiceVoteButton />
    </>
  )
}

export default MultiChoiceVotePanel
