import classNames from 'classnames'

import useRealm from '@hooks/useRealm'
import useProposalVotes from '@hooks/useProposalVotes'
import { BN } from 'bn.js'
import { Proposal } from '@solana/spl-governance'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getMintMetadata } from './instructions/programs/splToken'

interface Props {
  className?: string
  proposal: Proposal
}

export default function MultiChoiceVotesCasted(props: Props) {
  const { realm, realmInfo } = useRealm()
  const { multiWeightVotes } = useProposalVotes(props.proposal)

  const votesCasted = multiWeightVotes
    ? multiWeightVotes.reduce(
        (sum, current) => sum.add(current.voteWeight),
        new BN(0)
      )
    : undefined
  const depositMint = realm?.account.config.councilMint
  const tokenName = getMintMetadata(depositMint)?.name ?? 'Token' ?? ''

  if (!(realm && realmInfo)) {
    return (
      <div
        className={classNames(props.className, 'rounded-md bg-bkg-1 h-[76px]')}
      />
    )
  }

  return (
    <div className={classNames(props.className, 'p-3 rounded-md bg-bkg-1')}>
      <div className="text-white/50 text-xs">Votes casted</div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-white font-bold text-xl">
          {votesCasted
            ? votesCasted.div(new BN(LAMPORTS_PER_SOL)).toString()
            : 0}
          {` ve${tokenName}`}
        </div>
      </div>
    </div>
  )
}
