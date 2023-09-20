import React from 'react'
import cx from 'classnames'

import { Stake } from '@models/treasury/Asset'
import Address from '@components/Address'
import { DesktopComputerIcon } from '@heroicons/react/solid'
import { MARINADE_NATIVE_STAKING_AUTHORITY } from '@utils/marinade-native'

interface Props {
  className?: string
  account: Stake
}

export default function Header(props: Props) {
  return (
    <div
      className={cx(
        props.className,
        'bg-bkg-1',
        'min-h-[128px]',
        'px-8',
        'py-4',
        'flex',
        'items-center',
        'justify-between'
      )}
    >
      <div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20">
            <DesktopComputerIcon className="h-6 w-6 stroke-primary-light" />
          </div>
          <div>
            <div className="text-white/50 text-sm">Stake account</div>
            <div className="text-fgd-1 font-bold text-2xl">
              <div className="overflow-hidden">
                <div
                  className={cx(
                    'overflow-hidden',
                    'text-ellipsis',
                    'text-sm',
                    'text-white/50',
                    'whitespace-nowrap'
                  )}
                >
                  SOL
                </div>
                <div
                  className={cx(
                    'align-baseline',
                    'font-bold',
                    'overflow-hidden',
                    'text-2xl',
                    'text-ellipsis',
                    'text-fgd-1',
                    'whitespace-nowrap'
                  )}
                  title={'SOL'}
                >
                  {props.account.amount}
                </div>
              </div>
              {props.account.raw.extensions.stake?.stakingAuthority.toString() ===
              MARINADE_NATIVE_STAKING_AUTHORITY.toString() ? (
                <span className="text-xs text-white/50">
                  Marinade Native Stake Accounts
                </span>
              ) : (
                <Address address={props.account.pubkey} className="text-xs" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
