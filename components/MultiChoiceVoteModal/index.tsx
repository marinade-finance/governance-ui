import React, { FunctionComponent, useMemo, useState } from 'react'
import {
  RpcContext,
  Vote,
  VoteKind,
  VoteChoice,
  getVoteRecordAddress,
} from '@solana/spl-governance'
import useWalletStore from '../../stores/useWalletStore'
import useRealm from '../../hooks/useRealm'
import { castVote } from '../../actions/castVote'

import Button, { SecondaryButton } from '../Button'
import Loading from '../Loading'
import Modal from '../Modal'
import { TokenOwnerRecord, VoteRecord } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { getProgramVersionForRealm } from '@models/registry/api'
import useVotePluginsClientStore from 'stores/useVotePluginsClientStore'
import { nftPluginsPks } from '@hooks/useVotingPlugins'
import useNftProposalStore from 'NftVotePlugin/NftProposalStore'
import { NftVoterClient } from '@solana/governance-program-library'
import useProposalVotes from '@hooks/useProposalVotes'
import { getColumns } from './voting-table-columns'
import Input from '@components/inputs/Input'
import { SearchIcon } from '@heroicons/react/solid'
import { useVoteWeights } from './useVoteWeights'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { TransactionInstruction } from '@solana/web3.js'
import { relinquishVote } from 'actions/relinquishVote'

interface MultiChoiceVoteModalProps {
  onClose: () => void
  isOpen: boolean
  voterTokenRecord: ProgramAccount<TokenOwnerRecord>
  ownVoteRecord?: ProgramAccount<VoteRecord>
}

const MultiChoiceVoteModal: FunctionComponent<MultiChoiceVoteModalProps> = ({
  onClose,
  isOpen,
  voterTokenRecord,
  ownVoteRecord,
}) => {
  const client = useVotePluginsClientStore(
    (s) => s.state.currentRealmVotingClient
  )
  const [submitting, setSubmitting] = useState(false)
  const wallet = useWalletStore((s) => s.current)
  const connection = useWalletStore((s) => s.connection)
  const { proposal } = useWalletStore((s) => s.selectedProposal)
  const { multiWeightVotes } = useProposalVotes(proposal?.account)
  const { realm, realmInfo, config } = useRealm()
  const { refetchProposals } = useWalletStore((s) => s.actions)
  const { voteWeights, updateWeight, getRelativeVoteWeight } = useVoteWeights()

  const isNftPlugin =
    config?.account.communityTokenConfig.voterWeightAddin &&
    nftPluginsPks.includes(
      config?.account.communityTokenConfig.voterWeightAddin?.toBase58()
    )
  const { closeNftVotingCountingModal } = useNftProposalStore.getState()

  const submitVotes = async () => {
    setSubmitting(true)
    const rpcContext = new RpcContext(
      proposal!.owner,
      getProgramVersionForRealm(realmInfo!),
      wallet!,
      connection.current,
      connection.endpoint
    )

    const approveChoices = multiWeightVotes?.map(
      (option) =>
        new VoteChoice({
          rank: 0,
          weightPercentage: Math.round(
            getRelativeVoteWeight(option.label) * 100
          ),
        })
    )

    try {
      await castVote(
        rpcContext,
        realm!,
        proposal!,
        voterTokenRecord,
        new Vote({
          voteType: VoteKind.Approve,
          approveChoices,
          deny: undefined,
          veto: undefined,
        }),
        undefined,
        client,
        refetchProposals
      )
      if (!isNftPlugin) {
        await refetchProposals()
      }
    } catch (ex) {
      if (isNftPlugin) {
        closeNftVotingCountingModal(
          client.client as NftVoterClient,
          proposal!,
          wallet!.publicKey!
        )
      }
      //TODO: How do we present transaction errors to users? Just the notification?
      console.error("Can't cast vote", ex)
      onClose()
    } finally {
      setSubmitting(false)
      onClose()
    }
  }

  const revokeVotes = async () => {
    if (realm === undefined || proposal === undefined) return

    setSubmitting(true)

    const rpcContext = new RpcContext(
      proposal!.owner,
      getProgramVersionForRealm(realmInfo!),
      wallet!,
      connection.current,
      connection.endpoint
    )
    try {
      const instructions: TransactionInstruction[] = []

      const ownVoteRecord = await getVoteRecordAddress(
        realmInfo!.programId,
        proposal.pubkey,
        voterTokenRecord.pubkey
      )

      await relinquishVote(
        rpcContext,
        realm.pubkey,
        proposal,
        voterTokenRecord.pubkey,
        ownVoteRecord,
        instructions,
        client
      )
      await refetchProposals()
    } catch (ex) {
      console.error("Can't relinquish vote", ex)
    }
    setSubmitting(false)
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(multiWeightVotes ?? [])

  const columns = useMemo(
    () => getColumns(voteWeights, updateWeight, getRelativeVoteWeight),
    [voteWeights, updateWeight, getRelativeVoteWeight]
  )

  const filterOptions = (searchString: string) => {
    setSearchTerm(searchString)
    if (searchString !== '' && multiWeightVotes) {
      setFilteredOptions(
        multiWeightVotes.filter((a) => a.label.includes(searchString.trim()))
      )
    } else {
      setFilteredOptions(multiWeightVotes ?? [])
    }
  }

  const table = useReactTable({
    columns,
    data: filteredOptions,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Modal
      onClose={onClose}
      isOpen={isOpen}
      sizeClassName="max-w-4xl w-full h-[800px] max-h-screen"
    >
      <div className="h-full flex flex-col">
        <h2>Cast your votes</h2>
        <div className="flex justify-end mt-5">
          <div>
            <Input
              className="pl-8 w-[300px]"
              value={searchTerm}
              type="text"
              onChange={(e) => filterOptions(e.target.value)}
              placeholder="Search options..."
              prefix={<SearchIcon className="w-5 h-5 text-fgd-3" />}
            />
          </div>
        </div>
        <div className="flex-grow mt-3 border border-fgd-4 p-4 md:py-8 md:px-12 rounded-lg overflow-y-auto">
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center mt-8">
          <SecondaryButton className="w-44 mr-4" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button
            className="w-44 flex items-center justify-center"
            onClick={ownVoteRecord !== undefined ? revokeVotes : submitVotes}
          >
            {submitting ? (
              <Loading />
            ) : (
              <span>
                {ownVoteRecord !== undefined ? 'Revoke votes' : 'Submit votes'}
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default MultiChoiceVoteModal
