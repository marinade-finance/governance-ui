/**
 * Solana Name Service (`.sol` domain) helpers.
 *
 * This module replaces `@bonfida/spl-name-service`, which was **fully unpublished
 * from npm** (the whole `@bonfida` scope 404s), making `yarn install
 * --frozen-lockfile` impossible from a clean checkout.
 *
 * The core SPL Name Service primitives (`NAME_PROGRAM_ID`, `NameRegistryState`,
 * `transferInstruction`, name-key derivation) now come from the official,
 * npm-published `@solana/spl-name-service`. The handful of helpers that only ever
 * existed in Bonfida's SDK — owner->domain enumeration, batched reverse lookup,
 * subdomain key derivation and the name-tokenizer (NFT-ised domain) constants —
 * are reimplemented here against the same on-chain programs.
 *
 * All addresses and the reverse-lookup/tokenizer derivations below were verified
 * against mainnet: `bonfida.sol`/`toly.sol`/`marinade.sol` resolve to the expected
 * registries, reverse lookup round-trips to the original name, and
 * `findProgramAddress([MINT_PREFIX, nameAccount], NAME_TOKENIZER_ID)` matches the
 * `nftMint` stored in live `NftRecord` accounts.
 */
import { Connection, PublicKey } from '@solana/web3.js'
import {
  NAME_PROGRAM_ID,
  NameRegistryState,
  getHashedName,
  getNameAccountKey,
  transferInstruction,
} from '@solana/spl-name-service'

export {
  NAME_PROGRAM_ID,
  NameRegistryState,
  getHashedName,
  getNameAccountKey,
  transferInstruction,
}

/** The `.sol` top-level-domain registry (parent of every root `.sol` domain). */
export const ROOT_DOMAIN_ACCOUNT = new PublicKey(
  '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'
)

/** `nameClass` used by the reverse-lookup (pubkey -> human readable name) registries. */
export const REVERSE_LOOKUP_CLASS = new PublicKey(
  '33m47vH6Eav6jr5Ry86XjhRft2jRBLDnDgPSHoquXi2Z'
)

/** Bonfida name-tokenizer program, which wraps a domain into an NFT. */
export const NAME_TOKENIZER_ID = new PublicKey(
  'nftD3vbNkNqfj2Sd3HZwbpw4BxxKWr4AjGb9X38JeZk'
)

/** Seed prefix for a tokenized domain's NFT mint PDA. */
export const MINT_PREFIX = Buffer.from('tokenized_name')

/**
 * `getAllDomains` issues one `getProgramAccounts` call per queried owner. Set
 * `NEXT_PUBLIC_DISABLE_SNS=true` to skip domain enumeration entirely (domain
 * names are cosmetic) if an RPC provider rate-limits or refuses those scans.
 */
export const SNS_LOOKUP_ENABLED = process.env.NEXT_PUBLIC_DISABLE_SNS !== 'true'

/** Offset of `owner` inside a `NameRegistryState` account (after `parentName`). */
const OWNER_OFFSET = 32

/** `getMultipleAccountsInfo` rejects more than 100 keys per request. */
const MULTIPLE_ACCOUNTS_CHUNK = 100

export interface DomainKey {
  pubkey: PublicKey
  hashed: Buffer
  isSub: boolean
  parent: PublicKey | undefined
}

/**
 * Derive the registry address for `domain`, which may be `name`, `name.sol` or
 * `sub.name.sol`. Mirrors Bonfida's `getDomainKey`.
 */
export async function getDomainKey(domain: string): Promise<DomainKey> {
  const trimmed = domain.replace(/\.sol$/, '')
  const parts = trimmed.split('.')

  if (parts.length === 2) {
    // `sub.name` — subdomains are stored under the parent domain, and their
    // hashed name is prefixed with a NUL byte.
    const [sub, parentName] = parts
    const parentHashed = await getHashedName(parentName)
    const parent = await getNameAccountKey(
      parentHashed,
      undefined,
      ROOT_DOMAIN_ACCOUNT
    )
    const hashed = await getHashedName('\0'.concat(sub))
    const pubkey = await getNameAccountKey(hashed, undefined, parent)
    return { pubkey, hashed, isSub: true, parent }
  }

  if (parts.length !== 1) {
    throw new Error(`Invalid domain name: ${domain}`)
  }

  const hashed = await getHashedName(trimmed)
  const pubkey = await getNameAccountKey(
    hashed,
    undefined,
    ROOT_DOMAIN_ACCOUNT
  )
  return { pubkey, hashed, isSub: false, parent: ROOT_DOMAIN_ACCOUNT }
}

/**
 * Every root `.sol` domain registry owned by `owner`.
 *
 * Implemented as a `getProgramAccounts` scan filtered on `parentName == .sol TLD`
 * and `owner`, with a zero-length `dataSlice` so only the keys come back.
 */
export async function getAllDomains(
  connection: Connection,
  owner: PublicKey
): Promise<PublicKey[]> {
  if (!SNS_LOOKUP_ENABLED) return []

  const accounts = await connection.getProgramAccounts(NAME_PROGRAM_ID, {
    dataSlice: { offset: 0, length: 0 },
    filters: [
      { memcmp: { offset: 0, bytes: ROOT_DOMAIN_ACCOUNT.toBase58() } },
      { memcmp: { offset: OWNER_OFFSET, bytes: owner.toBase58() } },
    ],
  })

  return accounts.map((account) => account.pubkey)
}

/**
 * Resolve domain registry addresses back to their human-readable names.
 *
 * Returns one entry per input, positionally aligned, with `undefined` where no
 * reverse-lookup registry exists.
 */
export async function performReverseLookupBatch(
  connection: Connection,
  domains: PublicKey[]
): Promise<(string | undefined)[]> {
  if (!domains.length) return []

  const reverseKeys = await Promise.all(
    domains.map(async (domain) =>
      getNameAccountKey(
        await getHashedName(domain.toBase58()),
        REVERSE_LOOKUP_CLASS,
        undefined
      )
    )
  )

  const names: (string | undefined)[] = []

  for (let i = 0; i < reverseKeys.length; i += MULTIPLE_ACCOUNTS_CHUNK) {
    const chunk = reverseKeys.slice(i, i + MULTIPLE_ACCOUNTS_CHUNK)
    const infos = await connection.getMultipleAccountsInfo(chunk)

    for (const info of infos) {
      names.push(deserializeReverseLookup(info?.data))
    }
  }

  return names
}

/**
 * The reverse registry stores a borsh `String` (u32 little-endian length prefix
 * followed by UTF-8 bytes) directly after the 96-byte `NameRegistryState` header.
 */
function deserializeReverseLookup(
  data: Buffer | undefined
): string | undefined {
  if (!data || data.length < NameRegistryState.HEADER_LEN + 4) return undefined

  const payload = data.subarray(NameRegistryState.HEADER_LEN)
  const length = payload.readUInt32LE(0)

  if (length === 0 || payload.length < 4 + length) return undefined

  return payload.subarray(4, 4 + length).toString('utf8')
}
