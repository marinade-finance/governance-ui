import { Connection, PublicKey } from '@solana/web3.js'
import { AccountMetaData } from '@solana/spl-governance'
import * as BufferLayout from '@solana/buffer-layout'

export const MEMO_INSTRUCTIONS = {
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: {
    123: {
      name: 'Memo Program v2',
      accounts: [{ name: 'Stake Account' }],
      getDataUI: async (
        _connection: Connection,
        _data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const layout = BufferLayout.utf8(_data.length, 'memoData')
        const decodedData = layout.decode(Buffer.from(_data))

        return (
          <>
            <p>Memo: {decodedData}</p>
          </>
        )
      },
    },
  },
}
