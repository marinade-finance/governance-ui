import { Proposal } from '@solana/spl-governance'
import { Option } from 'tools/core/option'
import useRealm from '@hooks/useRealm'
import dynamic from 'next/dynamic'
import { ChevronRightIcon } from '@heroicons/react/solid'
import useQueryContext from '@hooks/useQueryContext'
import {
  gatewayPluginsPks,
  nftPluginsPks,
  vsrPluginsPks,
  switchboardPluginsPks,
  crewsPluginPks,
} from '@hooks/useVotingPlugins'
import GatewayCard from '@components/Gateway/GatewayCard'
import ClaimUnreleasedNFTs from './ClaimUnreleasedNFTs'
import Link from 'next/link'
import { getTokenOwnerRecordAddress } from '@solana/spl-governance'
import useWalletStore from 'stores/useWalletStore'
import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'

const LockPluginTokenBalanceCard = dynamic(
  () =>
    import(
      'VoteStakeRegistry/components/TokenBalance/LockPluginTokenBalanceCard'
    )
)
const TokenBalanceCard = dynamic(() => import('./TokenBalanceCard'))
const NftVotingPower = dynamic(
  () => import('../ProposalVotingPower/NftVotingPower')
)
// const NftBalanceCard = dynamic(() => import('./NftBalanceCard'))
const SwitchboardPermissionCard = dynamic(
  () => import('./SwitchboardPermissionCard')
)
const CrewsVotingPower = dynamic(
  () => import('@components/ProposalVotingPower/CrewsVotingPower')
)

interface GovernancePowerTitleProps {
  linkToOwnerRecord?: boolean
}

const GovernancePowerTitle = ({
  linkToOwnerRecord = true,
}: GovernancePowerTitleProps) => {
  const { councilMint, mint, realm, symbol } = useRealm()
  const [tokenOwnerRecordPk, setTokenOwnerRecordPk] = useState('')
  const { fmtUrlWithCluster } = useQueryContext()
  const wallet = useWalletStore((s) => s.current)
  const connected = useWalletStore((s) => s.connected)

  useEffect(() => {
    const getTokenOwnerRecord = async () => {
      if (realm && wallet) {
        const defaultMint = !mint?.supply.isZero()
          ? realm.account.communityMint
          : !councilMint?.supply.isZero()
          ? realm.account.config.councilMint
          : undefined
        const tokenOwnerRecordAddress = await getTokenOwnerRecordAddress(
          realm.owner ?? PublicKey.default,
          realm.pubkey ?? PublicKey.default,
          defaultMint! ?? PublicKey.default,
          wallet.publicKey!
        )
        setTokenOwnerRecordPk(tokenOwnerRecordAddress.toBase58())
      }
    }
    if (realm && wallet?.connected) {
      getTokenOwnerRecord()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO please fix, it can cause difficult bugs. You might wanna check out https://bobbyhadz.com/blog/react-hooks-exhaustive-deps for info. -@asktree
  }, [realm?.pubkey.toBase58(), wallet?.connected])
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="mb-0">My governance power</h3>
      {linkToOwnerRecord ? (
        <Link
          href={fmtUrlWithCluster(
            `/dao/${symbol}/account/${tokenOwnerRecordPk}`
          )}
        >
          <a
            className={`default-transition flex items-center text-fgd-2 text-sm transition-all hover:text-fgd-3 ${
              !connected || !tokenOwnerRecordPk
                ? 'opacity-50 pointer-events-none'
                : ''
            }`}
          >
            View
            <ChevronRightIcon className="flex-shrink-0 w-6 h-6" />
          </a>
        </Link>
      ) : undefined}
    </div>
  )
}

const TokenBalanceCardWrapper = ({
  proposal,
  inAccountDetails,
}: {
  proposal?: Option<Proposal>
  inAccountDetails?: boolean
}) => {
  const {
    ownTokenRecord,
    config,
    ownCouncilTokenRecord,
    councilTokenAccount,
  } = useRealm()
  const currentPluginPk = config?.account?.communityTokenConfig.voterWeightAddin
  const getTokenBalanceCard = () => {
    //based on realm config it will provide proper tokenBalanceCardComponent
    const isLockTokensMode =
      currentPluginPk && vsrPluginsPks.includes(currentPluginPk?.toBase58())
    const isNftMode =
      currentPluginPk && nftPluginsPks.includes(currentPluginPk?.toBase58())
    const isCrewsMode =
      currentPluginPk && crewsPluginPks.includes(currentPluginPk?.toBase58())
    const isGatewayMode =
      currentPluginPk && gatewayPluginsPks.includes(currentPluginPk?.toBase58())
    const isSwitchboardMode =
      currentPluginPk &&
      switchboardPluginsPks.includes(currentPluginPk?.toBase58())

    if (
      isLockTokensMode &&
      (!ownTokenRecord ||
        ownTokenRecord.account.governingTokenDepositAmount.isZero())
    ) {
      return (
        <LockPluginTokenBalanceCard
          inAccountDetails={inAccountDetails}
        ></LockPluginTokenBalanceCard>
      )
    }
    if (
      isNftMode &&
      (!ownTokenRecord ||
        ownTokenRecord.account.governingTokenDepositAmount.isZero())
    ) {
      return (
        <>
          {(ownCouncilTokenRecord &&
            !ownCouncilTokenRecord?.account.governingTokenDepositAmount.isZero()) ||
          (councilTokenAccount &&
            !councilTokenAccount?.account.amount.isZero()) ? (
            <>
              {!inAccountDetails && <GovernancePowerTitle />}
              <NftVotingPower inAccountDetails={inAccountDetails} />
              <TokenBalanceCard
                proposal={proposal}
                inAccountDetails={inAccountDetails}
              />
              <ClaimUnreleasedNFTs inAccountDetails={inAccountDetails} />
            </>
          ) : (
            <>
              {!inAccountDetails && <GovernancePowerTitle />}
              <NftVotingPower inAccountDetails={inAccountDetails} />
              <ClaimUnreleasedNFTs inAccountDetails={inAccountDetails} />
            </>
          )}
        </>
      )
    }
    if (
      isCrewsMode &&
      (!ownTokenRecord ||
        ownTokenRecord.account.governingTokenDepositAmount.isZero())
    ) {
      return (
        <>
          {!inAccountDetails && (
            <GovernancePowerTitle linkToOwnerRecord={false} />
          )}
          <CrewsVotingPower />
        </>
      )
    }
    if (
      isSwitchboardMode &&
      (!ownTokenRecord ||
        ownTokenRecord.account.governingTokenDepositAmount.isZero())
    ) {
      return <SwitchboardPermissionCard></SwitchboardPermissionCard>
    }
    //Default
    return (
      <>
        {!inAccountDetails && <GovernancePowerTitle />}
        <TokenBalanceCard
          proposal={proposal}
          inAccountDetails={inAccountDetails}
        >
          {/*Add the gateway card if this is a gated DAO*/}
          {isGatewayMode && <GatewayCard></GatewayCard>}
        </TokenBalanceCard>
      </>
    )
  }
  return (
    <div
      className={`rounded-lg bg-bkg-2 ${inAccountDetails ? `` : `p-4 md:p-6`}`}
    >
      {getTokenBalanceCard()}
    </div>
  )
}

export default TokenBalanceCardWrapper
