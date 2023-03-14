import { CrewWrapper } from '@marinade.finance/sg-crews-sdk'
import { BN } from '@project-serum/anchor'
import { ProgramAccount, TokenOwnerRecord } from '@solana/spl-governance'
import { PublicKey } from '@solana/web3.js'
import create, { State } from 'zustand'
import { CrewWrapperEnvelope } from './types'

interface crewsPluginStore extends State {
  state: {
    votingCrews: CrewWrapperEnvelope[]
    selectedCrew: CrewWrapperEnvelope | undefined
    currentTokenOwnerRecord: ProgramAccount<TokenOwnerRecord> | undefined
    votingPower: BN
    currentMaxVoterPublicKey: PublicKey | undefined
    isLoadingCrews: boolean
  }
  setVotingCrews: (crews: CrewWrapper[]) => void
  setSelectedCrew: (crew: CrewWrapperEnvelope | undefined) => void
  setVotingPower: (votingPower: BN | undefined) => void
  setCurrentTokenOwnerRecord: (crew: CrewWrapper | undefined) => void
  setCurrentMaxVoterPublicKey: (
    maxVoterPublicKey: PublicKey | undefined
  ) => void
  setIsLoadingCrews: (val: boolean) => void
}

const defaultState = {
  votingCrews: [],
  selectedCrew: undefined,
  currentTokenOwnerRecord: undefined,
  votingPower: new BN(0),
  currentMaxVoterPublicKey: undefined,
  isLoadingCrews: false,
}

const useCrewsPluginStore = create<crewsPluginStore>((set, _get) => ({
  state: {
    ...defaultState,
  },
  setIsLoadingCrews: (val) => {
    set((s) => {
      s.state.isLoadingCrews = val
    })
  },
  setVotingCrews: async (crews) => {
    const extendedCrews = await Promise.all(
      crews.map(async (crew) => {
        return {
          crewWrapper: crew,
          votingPower: (await crew.voterWeightRecord()).voterWeight,
        } as CrewWrapperEnvelope
      })
    )
    set((s) => {
      s.state.votingCrews = extendedCrews.sort((a, b) =>
        a.crewWrapper.data.name.localeCompare(b.crewWrapper.data.name)
      )
    })
    if (crews.length === 0) _get().setSelectedCrew(undefined)
  },
  setSelectedCrew: async (crew) => {
    set((s) => {
      s.state.selectedCrew = crew
    })
    _get().setVotingPower(crew?.votingPower)
    _get().setCurrentTokenOwnerRecord(crew?.crewWrapper)
  },
  setVotingPower: (votingPower) => {
    set((s) => {
      s.state.votingPower = votingPower ?? new BN(0)
    })
  },
  setCurrentTokenOwnerRecord: async (crew) => {
    const record = await crew?.tokenOwnerRecord()
    set((s) => {
      s.state.currentTokenOwnerRecord = record
        ? (record as ProgramAccount<TokenOwnerRecord>)
        : undefined
    })
  },
  setCurrentMaxVoterPublicKey: (maxVoterPublicKey) => {
    set((s) => {
      s.state.currentMaxVoterPublicKey = maxVoterPublicKey
    })
  },
}))

export default useCrewsPluginStore
