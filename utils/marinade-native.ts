import { PublicKey } from '@solana/web3.js'

export const MARINADE_NATIVE_STAKING_AUTHORITY = new PublicKey(
  'stWirqFCf2Uts1JBL1Jsd3r6VBWhgnpdPxCTe1MFjrq'
)

export const isMNativeStakeAccount = (accountData: Buffer): boolean => {
  return (
    PublicKey.decode(accountData.slice(12, 12 + 32).reverse()).toString() ===
    MARINADE_NATIVE_STAKING_AUTHORITY.toString()
  )
}
