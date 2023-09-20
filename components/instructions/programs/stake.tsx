import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { AccountMetaData } from '@solana/spl-governance'
import * as BufferLayout from '@solana/buffer-layout'

export const STAKE_INSTRUCTIONS = {
  Stake11111111111111111111111111111111111111: {
    0: {
      name: 'Stake Program - Initialize',
      accounts: [{ name: 'Stake Account' }],
      getDataUI: async (
        _connection: Connection,
        _data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const layout = BufferLayout.struct<any['Initialize']>([
          BufferLayout.u32('type'),
          BufferLayout.struct(
            [
              BufferLayout.blob(32, 'staker'),
              BufferLayout.blob(32, 'withdrawer'),
            ],
            'authorized'
          ),
        ])

        const decodedLayout = layout.decode(Buffer.from(_data))

        return (
          <>
            <p>
              Staker Authority:{' '}
              {new PublicKey(decodedLayout.authorized.staker).toString()}
            </p>
            <p>
              Withdrawer Authority:{' '}
              {new PublicKey(decodedLayout.authorized.withdrawer).toString()}
            </p>
          </>
        )
      },
    },
    3: {
      name: 'Stake Program - Split',
      accounts: [],
      getDataUI: async (
        _connection: Connection,
        _data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const { lamports } = BufferLayout.struct<any['Split']>([
          BufferLayout.u32('instruction'),
          BufferLayout.ns64('lamports'),
        ]).decode(Buffer.from(_data))
        const rent = await _connection.getMinimumBalanceForRentExemption(200)
        return (
          <>
            <p>
              Amount: {(lamports - rent) / LAMPORTS_PER_SOL} + rent:{' '}
              {rent / LAMPORTS_PER_SOL} = Total sol amount:{' '}
              {lamports / LAMPORTS_PER_SOL}
            </p>
            <p></p>
          </>
        )
      },
    },
    4: {
      name: 'Stake Program - Withdraw',
      accounts: [],
      getDataUI: async (
        _connection: Connection,
        _data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const { lamports } = BufferLayout.struct<any['Withdraw']>([
          BufferLayout.u32('instruction'),
          BufferLayout.ns64('lamports'),
        ]).decode(Buffer.from(_data))
        return (
          <>
            <p>Withdraw amount: {lamports / LAMPORTS_PER_SOL}</p>
            <p></p>
          </>
        )
      },
    },
    2: {
      name: 'Stake Program - Delegate',
      accounts: [{ name: 'Stake Account' }, { name: 'Vote Account' }],
      getDataUI: async (
        _connection: Connection,
        _data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        return <></>
      },
    },
  },
}
