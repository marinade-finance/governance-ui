import { useState } from 'react'
import Button from '../Button'

import {
  useIsVoting,
  useProposalVoteRecordQuery,
  useProposalVoteRecordQueryByTokenOwner,
  useVoterTokenRecord,
  useVotingPop,
} from './hooks'
import useRealm from '@hooks/useRealm'
import { VotingClientType } from '@utils/uiTypes/VotePlugin'
import useVotePluginsClientStore from 'stores/useVotePluginsClientStore'
import useWalletStore from 'stores/useWalletStore'
import MultiChoiceVoteModal from '@components/MultiChoiceVoteModal'

const useCanVote = () => {
  const client = useVotePluginsClientStore(
    (s) => s.state.currentRealmVotingClient
  )
  const { ownVoterWeight } = useRealm()
  const connected = useWalletStore((s) => s.connected)

  const { data: ownVoteRecord } = useProposalVoteRecordQuery('electoral')
  const voterTokenRecord = useVoterTokenRecord()

  const isVoteCast = !!ownVoteRecord?.found

  const hasMinAmountToVote =
    voterTokenRecord &&
    ownVoterWeight.hasMinAmountToVote(
      voterTokenRecord.account.governingTokenMint
    )

  const canVote =
    connected &&
    !(
      client.clientType === VotingClientType.NftVoterClient && !voterTokenRecord
    ) &&
    !isVoteCast &&
    hasMinAmountToVote

  const voteTooltipContent = !connected
    ? 'You need to connect your wallet to be able to vote'
    : client.clientType === VotingClientType.NftVoterClient && !voterTokenRecord
    ? 'You must join the Realm to be able to vote'
    : !hasMinAmountToVote
    ? 'You don’t have governance power to vote in this dao'
    : ''
  return [canVote, voteTooltipContent] as const
}

export const CastMultiChoiceVoteButton = () => {
  const [showVoteModal, setShowVoteModal] = useState(false)
  const voterTokenRecord = useVoterTokenRecord()

  const [canVote, tooltipContent] = useCanVote()
  const votingPop = useVotingPop()
  const { data: ownVoteRecord } = useProposalVoteRecordQueryByTokenOwner(
    voterTokenRecord?.pubkey
  )

  const isVoteCast = !!ownVoteRecord?.found
  const isVoting = useIsVoting()

  return isVoting ? (
    <>
      <div className="bg-bkg-2 p-4 md:p-6 rounded-lg space-y-4">
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-center">Cast your {votingPop} vote</h3>
        </div>
        <Button
          className="w-full"
          tooltipMessage={tooltipContent}
          onClick={() => {
            setShowVoteModal(true)
          }}
          disabled={!canVote}
        >
          {isVoteCast ? 'Change your votes' : 'Cast your votes'}
        </Button>
      </div>
      <MultiChoiceVoteModal
        isOpen={showVoteModal}
        onOpenChange={setShowVoteModal}
        voterTokenRecord={voterTokenRecord!}
        ownVoteRecord={ownVoteRecord?.result}
      />
    </>
  ) : null
}
