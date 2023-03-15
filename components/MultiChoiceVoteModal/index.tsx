import React, { FunctionComponent, useMemo, useState } from 'react'
import { RpcContext, getVoteRecordAddress } from '@solana/spl-governance'
import useWalletStore from '../../stores/useWalletStore'
import useRealm from '../../hooks/useRealm'
import { castVote } from '../../actions/castVote'

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
import { relinquishAndVote } from 'actions/relinquishAndVote'

import * as Button from '@hub/components/controls/Button'
import * as Modal from '@hub/components/controls/Modal'
import DocumentTasks from '@carbon/icons-react/lib/DocumentTasks'
import Events from '@carbon/icons-react/lib/Events'
import Launch from '@carbon/icons-react/lib/Launch'

interface MultiChoiceVoteModalProps {
  onOpenChange: (open: boolean) => void
  isOpen: boolean
  voterTokenRecord: ProgramAccount<TokenOwnerRecord>
  ownVoteRecord?: ProgramAccount<VoteRecord>
}

const MultiChoiceVoteModal: FunctionComponent<MultiChoiceVoteModalProps> = ({
  onOpenChange,
  isOpen,
  voterTokenRecord,
  ownVoteRecord,
}) => {
  const client = useVotePluginsClientStore(
    (s) => s.state.currentRealmVotingClient
  )
  const [expanded, setExpanded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const wallet = useWalletStore((s) => s.current)
  const connection = useWalletStore((s) => s.connection)
  const { proposal } = useWalletStore((s) => s.selectedProposal)
  const { multiWeightVotes } = useProposalVotes(proposal?.account)
  const { realm, realmInfo, config } = useRealm()
  const { refetchProposals } = useWalletStore((s) => s.actions)
  const {
    voteWeights,
    updateWeight,
    getRelativeVoteWeight,
    getVotes,
  } = useVoteWeights()

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

    try {
      await castVote(
        rpcContext,
        realm!,
        proposal!,
        voterTokenRecord,
        getVotes(multiWeightVotes),
        undefined,
        client,
        () => {
          refetchProposals()
          onOpenChange(false)
        }
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
    } finally {
      setSubmitting(false)
    }
  }

  const submitRevotes = async () => {
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

      await relinquishAndVote(
        rpcContext,
        realm.pubkey,
        proposal,
        voterTokenRecord,
        ownVoteRecord,
        getVotes(multiWeightVotes),
        instructions,
        client
      )
      await refetchProposals()
    } catch (ex) {
      console.error("Can't relinquish vote", ex)
    }
    setSubmitting(false)
  }

  const resetVotes = async () => {
    if (realm === undefined || proposal === undefined) return

    setRevoking(true)

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
    setRevoking(false)
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(multiWeightVotes ?? [])

  const columns = useMemo(
    () =>
      getColumns(
        voteWeights,
        updateWeight,
        getRelativeVoteWeight,
        multiWeightVotes
      ),
    [voteWeights, updateWeight, getRelativeVoteWeight, multiWeightVotes]
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

  const toggleExpand = () => {
    setExpanded((state) => !state)
  }

  const table = useReactTable({
    columns,
    data: filteredOptions,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Modal.Root open={isOpen} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Overlay>
          <Modal.Content className="flex flex-col w-full max-w-4xl mx-10 max-h-[70vh]">
            <Modal.Close />
            <div className="p-8 pb-6 border-b border-neutral-700">
              <div className="flex gap-2 text-neutral-500">
                <Events />
                <h2 className="text-xs">CAST YOUR COMMUNITY VOTES</h2>
              </div>
              <div
                className={`text-sm mt-2 relative flex items-start ${
                  !expanded ? 'w-10/12' : ''
                }`}
              >
                <p
                  className={`overflow-hidden text-ellipsis ${
                    expanded ? 'whitespace-normal' : 'whitespace-nowrap'
                  }`}
                >
                  The current impact of your votes will be reflected
                  dynamically. Note that those numbers are subject to change
                  depending on the amount of votes casted for this cycle.
                </p>
                <button
                  className={`text-neutral-500 hover:text-neutral-400 text-sm ${
                    !expanded ? 'ml-1' : 'absolute right-0 bottom-0'
                  }`}
                  onClick={toggleExpand}
                >
                  {!expanded ? 'more' : 'less'}
                </button>
              </div>
            </div>
            <div className="px-8 mt-5">
              <div className="flex gap-4">
                <Input
                  className="pl-8 border-neutral-700 placeholder-neutral-500"
                  value={searchTerm}
                  type="text"
                  onChange={(e) => filterOptions(e.target.value)}
                  placeholder="Search gauges"
                  prefix={<SearchIcon className="w-5 h-5 text-neutral-500" />}
                  noMaxWidth
                />
                <Button.Borderless className="w-52">
                  Request a Gauge <Launch className="ml-2" />
                </Button.Borderless>
              </div>
            </div>
            <div className="flex flex-grow mt-8 overflow-y-auto">
              <table className="flex-grow mx-8">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="pb-6 text-left border-b border-neutral-700"
                        >
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
                        <td
                          key={cell.id}
                          className="py-2.5 border-b border-neutral-700"
                        >
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
            <div className="flex justify-end gap-2 p-8">
              <Button.Borderless
                className="px-9"
                disabled={ownVoteRecord === undefined}
                onClick={resetVotes}
                pending={revoking}
              >
                Reset Votes
              </Button.Borderless>
              <Button.Primary
                className="text-black px-9"
                onClick={
                  ownVoteRecord !== undefined ? submitRevotes : submitVotes
                }
                pending={submitting}
              >
                <DocumentTasks className="mr-2" />
                {ownVoteRecord !== undefined ? 'Overide Votes' : 'Submit Votes'}
              </Button.Primary>
            </div>
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Portal>
    </Modal.Root>
  )
}

export default MultiChoiceVoteModal
