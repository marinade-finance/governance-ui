import { CrewWrapper } from '@marinade.finance/sg-crews-sdk'
import { BN } from '@project-serum/anchor'
import { ProgramAccount, TokenOwnerRecord } from '@solana/spl-governance'
import { PublicKey } from '@solana/web3.js'
import create, { State } from 'zustand'

interface crewsPluginStore extends State {
  state: {
    votingCrews: CrewWrapper[]
    selectedCrew: CrewWrapper | undefined
    currentTokenOwnerRecord: ProgramAccount<TokenOwnerRecord> | undefined
    votingPower: BN
    currentMaxVoterPublicKey: PublicKey | undefined
    isLoadingCrews: boolean
  }
  setVotingCrews: (crews: CrewWrapper[]) => void
  setSelectedCrew: (crew: CrewWrapper | undefined) => void
  setVotingPower: (crew: CrewWrapper | undefined) => void
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
  setVotingCrews: (crews) => {
    set((s) => {
      s.state.votingCrews = crews
    })
    if (crews.length === 0) _get().setSelectedCrew(undefined)
  },
  setSelectedCrew: async (crew) => {
    set((s) => {
      s.state.selectedCrew = crew
    })
    _get().setVotingPower(crew)
    _get().setCurrentTokenOwnerRecord(crew)
  },
  setVotingPower: async (crew) => {
    const record = await crew?.voterWeightRecord()
    set((s) => {
      s.state.votingPower = record?.voterWeight ?? new BN(0)
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
