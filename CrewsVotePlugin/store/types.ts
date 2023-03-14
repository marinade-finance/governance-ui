import { BN } from '@coral-xyz/anchor'
import { CrewWrapper } from '@marinade.finance/sg-crews-sdk'

export type CrewWrapperEnvelope = {
  crewWrapper: CrewWrapper
  votingPower: BN
}
