import styled from '@emotion/styled'
import { ChevronRightIcon } from '@heroicons/react/solid'
import ProposalStateBadge from './ProposalStatusBadge'
import Link from 'next/link'
import { Proposal, ProposalState } from '@solana/spl-governance'
import useRealm from '../hooks/useRealm'
import ProposalTimeStatus from './ProposalTimeStatus'
import ProposalMyVoteBadge from './ProposalMyVoteBadge'

import useQueryContext from '../hooks/useQueryContext'
import { PublicKey } from '@solana/web3.js'
import WeightedVoteResults from './WeightedVoteResults'

type WeightedProposalCardProps = {
  proposalPk: PublicKey
  proposal: Proposal
}

const StyledSvg = styled(ChevronRightIcon)``

const StyledCardWrapper = styled.div`
  :hover {
    ${StyledSvg} {
      transform: translateX(4px);
    }
  }
`

const WeightedProposalCard = ({
  proposalPk,
  proposal,
}: WeightedProposalCardProps) => {
  const { symbol } = useRealm()
  const { fmtUrlWithCluster } = useQueryContext()

  return (
    <div>
      <Link
        href={fmtUrlWithCluster(
          `/dao/${symbol}/weighted-proposal/${proposalPk.toBase58()}`
        )}
      >
        <a>
          <StyledCardWrapper className="border border-fgd-4 default-transition rounded-lg hover:bg-bkg-3">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-fgd-1 overflow-wrap-anywhere">
                  {proposal.name}
                </h3>
                <div className="flex items-center pl-4 pt-1">
                  {proposal.state === ProposalState.Voting && (
                    <ProposalMyVoteBadge
                      className="mr-2"
                      proposal={{ account: proposal, pubkey: proposalPk }}
                    />
                  )}
                  <ProposalStateBadge proposal={proposal} />
                  <StyledSvg className="default-transition h-6 ml-3 text-fgd-2 w-6" />
                </div>
              </div>
              <ProposalTimeStatus proposal={proposal} />
            </div>
            {proposal.state === ProposalState.Voting && (
              <div className="border-t border-fgd-4 mt-2 p-4">
                <div className="pb-3 lg:pb-0 w-full">
                  <WeightedVoteResults isListView proposal={proposal} />
                </div>
              </div>
            )}
          </StyledCardWrapper>
        </a>
      </Link>
    </div>
  )
}

export default WeightedProposalCard
