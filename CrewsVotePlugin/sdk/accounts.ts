import {
  CrewWrapper,
  RootWrapper,
  SGCrewsSDK,
} from '@marinade.finance/sg-crews-sdk'
import { PublicKey } from '@solana/web3.js'

export const getCrewsVoterWeightRecordAddress = (
  sdk: SGCrewsSDK,
  crewAddress?: PublicKey
) => {
  if (!crewAddress) return undefined

  return CrewWrapper.voterWeightRecordAddress({
    sdk,
    crew: crewAddress,
  })
}

export const getCrewsMaxVoterWeightAddress = (
  sdk: SGCrewsSDK,
  rootAddress?: PublicKey
) => {
  if (!rootAddress) return undefined

  return RootWrapper.maxVoterWeightAddress({
    sdk,
    root: rootAddress,
  })
}
