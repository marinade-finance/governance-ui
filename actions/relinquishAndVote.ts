import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

import {
  Proposal,
  Vote,
  TokenOwnerRecord,
  withCastVote,
} from '@solana/spl-governance'
import { RpcContext } from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import { sendTransaction } from '../utils/send'
import { withRelinquishVote } from '@solana/spl-governance'
import { VotingClient } from '@utils/uiTypes/VotePlugin'
import { chunks } from '@utils/helpers'
import {
  sendTransactionsV3,
  SequenceType,
  txBatchesToInstructionSetWithSigners,
} from '@utils/sendTransactions'
import { NftVoterClient } from '@solana/governance-program-library'

export const relinquishAndVote = async (
  { connection, wallet, programId, programVersion, walletPubkey }: RpcContext,
  realm: PublicKey,
  proposal: ProgramAccount<Proposal>,
  tokenOwnerRecord: ProgramAccount<TokenOwnerRecord>,
  voteRecord: PublicKey,
  vote: Vote,
  instructions: TransactionInstruction[] = [],
  plugin: VotingClient
) => {
  const signers: Keypair[] = []

  const governanceAuthority = walletPubkey
  const beneficiary = walletPubkey
  await withRelinquishVote(
    instructions,
    programId,
    programVersion,
    realm,
    proposal.account.governance,
    proposal.pubkey,
    tokenOwnerRecord.pubkey,
    proposal.account.governingTokenMint,
    voteRecord,
    governanceAuthority,
    beneficiary
  )
  await plugin.withRelinquishVote(instructions, proposal, voteRecord)

  const votingPlugin = await plugin?.withCastPluginVote(
    instructions,
    proposal,
    tokenOwnerRecord
  )

  await withCastVote(
    instructions,
    programId,
    programVersion,
    realm,
    proposal.account.governance,
    proposal.pubkey,
    proposal.account.tokenOwnerRecord,
    tokenOwnerRecord.pubkey,
    governanceAuthority,
    proposal.account.governingTokenMint,
    vote,
    walletPubkey,
    votingPlugin?.voterWeightPk,
    votingPlugin?.maxVoterWeightRecord
  )

  const shouldChunk = plugin?.client instanceof NftVoterClient
  if (shouldChunk) {
    const insertChunks = chunks(instructions, 2)
    const instArray = [
      ...insertChunks.slice(0, 1).map((txBatch, batchIdx) => {
        return {
          instructionsSet: txBatchesToInstructionSetWithSigners(
            txBatch,
            [],
            batchIdx
          ),
          sequenceType: SequenceType.Sequential,
        }
      }),
      ...insertChunks.slice(1, insertChunks.length).map((txBatch, batchIdx) => {
        return {
          instructionsSet: txBatchesToInstructionSetWithSigners(
            txBatch,
            [],
            batchIdx
          ),
          sequenceType: SequenceType.Parallel,
        }
      }),
    ]
    await sendTransactionsV3({
      connection,
      wallet,
      transactionInstructions: instArray,
    })
  } else {
    const transaction = new Transaction()
    transaction.add(...instructions)

    await sendTransaction({ transaction, wallet, connection, signers })
  }
}
