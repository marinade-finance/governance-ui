import React, { FunctionComponent, useEffect, useMemo, useState } from 'react'
import { RpcContext } from '@solana/spl-governance'
import useWalletStore from '../../stores/useWalletStore'
import useRealm from '../../hooks/useRealm'
import { castVote } from '../../actions/castVote'

import Button, { SecondaryButton } from '../Button'
import Loading from '../Loading'
import Modal from '../Modal'
import { TokenOwnerRecord } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { getProgramVersionForRealm } from '@models/registry/api'
import useVotePluginsClientStore from 'stores/useVotePluginsClientStore'
import { nftPluginsPks } from '@hooks/useVotingPlugins'
import useNftProposalStore from 'NftVotePlugin/NftProposalStore'
import { NftVoterClient } from '@solana/governance-program-library'
import { useTable } from 'react-table'
import useProposalVotes from '@hooks/useProposalVotes'
import { columns } from './voting-table-columns'
import { VoteWeightsProvider } from './useVoteWeights'
import Input from '@components/inputs/Input'
import { SearchIcon } from '@heroicons/react/solid'

interface WeightedVoteModalProps {
  onClose: () => void
  isOpen: boolean
  voterTokenRecord: ProgramAccount<TokenOwnerRecord>
}

const WeightedVoteModal: FunctionComponent<WeightedVoteModalProps> = ({
  onClose,
  isOpen,
  voterTokenRecord,
}) => {
  const client = useVotePluginsClientStore(
    (s) => s.state.currentRealmVotingClient
  )
  const [submitting, setSubmitting] = useState(false)
  const wallet = useWalletStore((s) => s.current)
  const connection = useWalletStore((s) => s.connection)
  const { proposal } = useWalletStore((s) => s.selectedProposal)
  const { optionVotes } = useProposalVotes(proposal?.account)
  const { fetchChatMessages } = useWalletStore((s) => s.actions)
  const { realm, realmInfo, config } = useRealm()
  const { refetchProposals } = useWalletStore((s) => s.actions)
  const isNftPlugin =
    config?.account.communityTokenConfig.voterWeightAddin &&
    nftPluginsPks.includes(
      config?.account.communityTokenConfig.voterWeightAddin?.toBase58()
    )
  const { closeNftVotingCountingModal } = useNftProposalStore.getState()
  const submitVote = async () => {
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
        0,
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

    fetchChatMessages(proposal!.pubkey)
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(optionVotes)

  const filterOptions = (searchString: string) => {
    setSearchTerm(searchString)
    if (searchString !== '') {
      setFilteredOptions(
        optionVotes.filter((a) => a.label.includes(searchString.trim()))
      )
    } else {
      setFilteredOptions(optionVotes)
    }
  }

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data: filteredOptions })

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
          <table {...getTableProps()} className="w-full">
            <thead>
              {headerGroups.map((headerGroup) => {
                return (
                  <tr
                    {...headerGroup.getHeaderGroupProps()}
                    key={headerGroup.id}
                  >
                    {headerGroup.headers.map((column) => {
                      return (
                        <th {...column.getHeaderProps()}>
                          {column.render('Header')}
                        </th>
                      )
                    })}
                  </tr>
                )
              })}
            </thead>
            <tbody {...getTableBodyProps()} className="border-none">
              {rows.map((row) => {
                prepareRow(row)
                return (
                  <tr {...row.getRowProps()} key={row.id}>
                    {row.cells.map((cell) => {
                      return (
                        <td
                          {...cell.getCellProps()}
                          className="pt-2"
                          key={cell.getCellProps().key}
                        >
                          {cell.render('Cell')}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center mt-8">
          <SecondaryButton className="w-44 mr-4" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <Button
            className="w-44 flex items-center justify-center"
            onClick={() => {}}
          >
            {submitting ? <Loading /> : <span>Submit votes</span>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default (props: WeightedVoteModalProps) => (
  //@ts-ignore
  <VoteWeightsProvider>
    <WeightedVoteModal {...props} />
  </VoteWeightsProvider>
)
