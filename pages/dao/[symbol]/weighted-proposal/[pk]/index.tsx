import remarkGfm from 'remark-gfm'
import remarkRequests from 'remark-requests'
import { ExternalLinkIcon } from '@heroicons/react/outline'
import useProposal from 'hooks/useProposal'
import ProposalStateBadge from 'components/ProposalStatusBadge'
import { InstructionPanel } from 'components/instructions/instructionPanel'
import DiscussionPanel from 'components/chat/DiscussionPanel'
import useRealm from 'hooks/useRealm'
import ProposalTimeStatus from 'components/ProposalTimeStatus'
import React, { useEffect, useState } from 'react'
import { getRealmExplorerHost } from 'tools/routing'
import { ProposalState } from '@solana/spl-governance'
import { resolveProposalDescription } from '@utils/helpers'
import PreviousRouteBtn from '@components/PreviousRouteBtn'
import ProposalVotingPower from '@components/ProposalVotingPower'
import { useMediaQuery } from 'react-responsive'
import { Remark } from 'react-remark'
import WeightedVoteResults from '@components/WeightedVoteResults'
import WeightedVotePanel from '@components/WeightedVotePanel'

const WeightedProposal = () => {
  const { realmInfo } = useRealm()
  const { proposal, descriptionLink, governance } = useProposal()
  const [description, setDescription] = useState('')
  const showResults =
    proposal &&
    proposal.account.state !== ProposalState.Cancelled &&
    proposal.account.state !== ProposalState.Draft

  const votingEnded =
    !!governance &&
    !!proposal &&
    proposal.account.getTimeToVoteEnd(governance.account) < 0

  const isTwoCol = useMediaQuery({ query: '(min-width: 768px)' })

  useEffect(() => {
    const handleResolveDescription = async () => {
      const description = await resolveProposalDescription(descriptionLink!)
      setDescription(description)
    }
    if (descriptionLink) {
      handleResolveDescription()
    } else {
      setDescription('')
    }
  }, [descriptionLink])

  const showTokenBalance = proposal
    ? proposal.account.state === ProposalState.Draft ||
      proposal.account.state === ProposalState.SigningOff ||
      (proposal.account.state === ProposalState.Voting && !votingEnded)
    : true

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="bg-bkg-2 rounded-lg p-4 md:p-6 col-span-12 md:col-span-7 lg:col-span-8 space-y-3">
        {proposal ? (
          <>
            <div className="flex flex-items justify-between">
              <PreviousRouteBtn />
              <div className="flex items-center">
                <a
                  href={`https://${getRealmExplorerHost(
                    realmInfo
                  )}/#/proposal/${proposal.pubkey.toBase58()}?programId=${proposal.owner.toBase58()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLinkIcon className="flex-shrink-0 h-4 ml-2 mt-0.5 text-primary-light w-4" />
                </a>
              </div>
            </div>

            <div className="py-4">
              <div className="flex items-center justify-between mb-1">
                <h1 className="mr-2 overflow-wrap-anywhere">
                  {proposal?.account.name}
                </h1>
                <ProposalStateBadge proposal={proposal.account} />
              </div>
            </div>

            {description && (
              <div className="pb-2 markdown">
                <Remark
                  remarkPlugins={[
                    remarkGfm,
                    [
                      remarkRequests,
                      {
                        apis: [
                          {
                            name: 'marinadeApi',
                            url: 'https://api.marinade.finance/tlv',
                          },
                        ],
                      },
                    ],
                  ]}
                >
                  {description}
                </Remark>
              </div>
            )}

            <InstructionPanel />
            {isTwoCol && <DiscussionPanel />}
          </>
        ) : (
          <>
            <div className="animate-pulse bg-bkg-3 h-12 rounded-lg" />
            <div className="animate-pulse bg-bkg-3 h-64 rounded-lg" />
            <div className="animate-pulse bg-bkg-3 h-64 rounded-lg" />
          </>
        )}
      </div>

      <div className="col-span-12 md:col-span-5 lg:col-span-4 space-y-4">
        {showTokenBalance && <ProposalVotingPower />}
        {showResults ? (
          <div className="bg-bkg-2 rounded-lg">
            <div className="p-4 md:p-6">
              {proposal?.account.state === ProposalState.Voting ? (
                <div className="flex items-end justify-between mb-4">
                  <h3 className="mb-0">Voting Now</h3>
                  <ProposalTimeStatus proposal={proposal?.account} />
                </div>
              ) : (
                <h3 className="mb-4">Results</h3>
              )}
              <WeightedVoteResults proposal={proposal.account} />
            </div>
          </div>
        ) : null}
        <WeightedVotePanel />
        {!isTwoCol && proposal && (
          <div className="bg-bkg-2 rounded-lg p-4 md:p-6 ">
            <DiscussionPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default WeightedProposal
