import classNames from 'classnames'
import useCrewsPluginStore from 'CrewsVotePlugin/store/crewsPluginStore'
import useWalletStore from 'stores/useWalletStore'

import Select from '@components/inputs/Select'
import { CrewWrapper } from '@marinade.finance/sg-crews-sdk'
import { useEffect } from 'react'
import { abbreviateAddress } from '@utils/formatting'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from 'bn.js'
import { formatNumber } from '@utils/formatNumber'

interface Props {
  className?: string
}

export default function CrewsVotingPower({ className }: Props) {
  const crews = useCrewsPluginStore((s) => s.state.votingCrews)
  const selectedCrew = useCrewsPluginStore((s) => s.state.selectedCrew)
  const votingPower = useCrewsPluginStore((s) => s.state.votingPower)
  const isLoading = useCrewsPluginStore((s) => s.state.isLoadingCrews)
  const connected = useWalletStore((s) => s.connected)
  const { setSelectedCrew } = useCrewsPluginStore()

  useEffect(() => {
    if (crews.length > 0 && !selectedCrew) setSelectedCrew(crews[0])
  }, [crews, selectedCrew, setSelectedCrew])

  if (isLoading && crews.length === 0) {
    return (
      <div className={classNames(className, 'rounded-md bg-bkg-1 h-[76px]')} />
    )
  }

  if (crews.length === 0) {
    return (
      <div className={classNames(className, 'text-xs', 'text-white/50')}>
        {!connected
          ? 'Please connect your wallet to see your voting power.'
          : 'You do not have any crews with voting power for this dao.'}
      </div>
    )
  }

  return (
    <div className={className}>
      <Select
        label="Active crew"
        onChange={(selection) => {
          setSelectedCrew(selection as CrewWrapper)
        }}
        componentLabel={
          selectedCrew ? (
            <div className="flex flex-row justify-between w-full">
              <div className="text-fgd-1">
                <div className="mb-0.5 truncate w-full">
                  {selectedCrew.data.name}
                </div>
                <div className="space-y-0.5 text-xs text-fgd-3">
                  <div>Address: {abbreviateAddress(selectedCrew.address)}</div>
                </div>
              </div>
              <div className="text-fgd-1 text-right mr-2">
                <div className="font-bold text-white text-sm mb-0.5 w-full">
                  {formatNumber(
                    votingPower.div(new BN(LAMPORTS_PER_SOL)).toNumber()
                  )}
                </div>
                <div className="space-y-0.5 text-xs text-fgd-3">
                  <div>Voting power</div>
                </div>
              </div>
            </div>
          ) : undefined
        }
        placeholder="Please select.."
        value={selectedCrew}
        noMaxWidth={true}
      >
        {crews.map((crew) => {
          return (
            <Select.Option key={crew.address.toBase58()} value={crew}>
              {crew.data.name}
            </Select.Option>
          )
        })}
      </Select>
    </div>
  )
}
