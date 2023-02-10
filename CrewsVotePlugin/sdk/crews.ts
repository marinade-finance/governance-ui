import {
  CrewWrapper,
  RootWrapper,
  SGCrewsSDK,
} from '@marinade.finance/sg-crews-sdk'
import { Wallet } from '@project-serum/anchor'
import { SolanaProvider } from '@saberhq/solana-contrib'
import { Connection, PublicKey } from '@solana/web3.js'

export const createCrewsClient = async (
  connection: Connection,
  wallet: Wallet,
  realm: PublicKey
) => {
  const sdk = new SGCrewsSDK({
    provider: SolanaProvider.init({ connection, wallet }),
  })

  return (
    await RootWrapper.find({
      sdk,
      realm,
    })
  )[0]
}

export const findCrewByTokenOwnerRecord = async (
  record: PublicKey,
  crewsSdk: SGCrewsSDK
): Promise<CrewWrapper | undefined> => {
  try {
    return (
      await CrewWrapper.find({
        sdk: crewsSdk,
        tokenOwnerRecord: record,
      })
    )[0]
  } catch {
    // Ignore crews that can't be fetched
    return undefined
  }
}

export const fetchCrews = async (
  client: RootWrapper,
  tokenOwnerRecords: PublicKey[]
) => {
  const crews: CrewWrapper[] = []

  await Promise.all(
    tokenOwnerRecords.map(async (record) => {
      const crew = await findCrewByTokenOwnerRecord(record, client.sdk)
      if (crew) crews.push(crew)
    })
  )

  return crews
}
