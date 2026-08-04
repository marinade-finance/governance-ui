# Known issues

Deliberately unfixed problems in this fork, recorded so nobody has to
rediscover them. Everything here was verified against the code, the live
mainnet RPC, or a real `next build` — measurements and dates are given so the
claims can be rechecked. Last reviewed 2026-08-04.

This repository is Marinade's fork of `solana-labs/governance-ui` and exists as
the **write-path fallback** for the Marinade DAO (realm
`899YG3yk4F66ZgbNWLHriZHTXSKk9e1kvsKEquW7L6Mo`, governance program
`GovMaiHfpVPw8BAM1mbdzgmSZYDw2tdP32J2fapoQoYs`, VSR plugin
`VoteMBhDCqGLRgYpp9o7DGyq81KNmwjXQRAHStjtJsS`). Fixes are prioritised
accordingly: correctness of the governance read/write paths first, cosmetics and
non-Marinade plugins last.

## Gate status

All five gates pass on Node 22.22.2 / yarn 1.22.22 as of 2026-08-04:

| gate | result |
| --- | --- |
| `yarn install --frozen-lockfile` | pass, 34.8 s from an empty `node_modules` |
| `yarn lint` | pass, 0 errors / 69 warnings |
| `yarn type-check` | pass, 0 errors |
| `yarn test` | pass, 2 suites, 3 tests + 1 todo |
| `yarn build` | pass, 4 m 45 s, 174 routes |

`yarn build` needs `yarn allow-scripts` and `yarn bigint-fix` first, because
`.yarnrc` sets `ignore-scripts true`. `yarn ci` does both.

The build still prints two `Attempted import error` warnings — see issue 4 below
for the anchor one; neither fails the build.

---

## 1. 126 of 174 emitted routes are component files exposed as public pages

`next.config.js:28` sets:

```js
pageExtensions: ['mdx', 'md', 'jsx', 'tsx', 'api.ts'], // .ts files are not pages
```

Next.js turns **every** `.tsx` file under `pages/` into a route, including files
that are plainly components rather than pages. Measured on this branch, the
build emits **174 routes, of which 126** are of this kind — only 48 are real
pages. For example:

```
/dao/[symbol]/members/Members            /dao/[symbol]/members/VsrMembers
/dao/[symbol]/params/components/ParamsView    /dao/[symbol]/params/components/StatsView
/dao/[symbol]/params/components/AccountsView  /dao/[symbol]/account/Account
/dao/[symbol]/params/MetadataCreationModal    /dao/[symbol]/proposal/components/MyProposalsBtn
/dao/[symbol]/proposal/[pk]/ProposalWarnings  /realms/components/RealmsDashboard
```

Each is separately server-rendered, publicly reachable, drags in the 2.36 MB
shared chunk, and inflates build time.

**Why unfixed.** The correct fix — restricting `pageExtensions` to something
like `page.tsx`, or moving every non-page file out of `pages/` — is a large
mechanical refactor of the `pages/` tree touching well over a hundred files and
all their import sites. It cannot be done safely alongside the correctness work
in this branch, and a mistake silently 404s a real route.

**Risk while unfixed.** Low security risk (these render the same data the real
pages do, with no additional authority), moderate cost in build time and bundle
size. Worth doing as a dedicated PR with route-by-route before/after diffing of
the emitted route list.

---

## 2. Unbounded `getProgramAccounts` on the All-Members path (~10.9 MB)

`hooks/queries/tokenOwnerRecord.ts:94-135`
(`useTokenOwnerRecordsForRealmQuery`) fetches every `TokenOwnerRecord` in the
realm with only a realm filter and no pagination.

Measured live against the Marinade realm on 2026-08-04:

| gPA filters | accounts | response bytes | wall time |
| --- | --- | --- | --- |
| realm@1 only | 18,115 | 10,957,655 | 2.03 s |
| type@0 + realm@1 (what the code sends) | 18,097 | **10,947,770** | 1.87 s |
| type@0 + realm@1 + community mint MNDE@33 | ~18,090 | 10,939,300 | 0.97 s |
| type@0 + realm@1 + council mint@33 | ~14 | 8,505 | 0.32 s |
| type@0 + realm@1 + `dataSlice{65,32}` | 18,097 | 4,939,566 | 0.64 s |

Two corrections to the way this is usually described:

- **A realm filter is already present.** The call is not "unfiltered"; it sends
  `pubkeyFilter(1, realm.pubkey)` (plus an account-type filter).
- **Adding a governing-token-mint filter does not help.** Essentially every TOR
  in this realm is on the community mint, so `realm + communityMint` is still
  10.94 MB. Only pagination or a `dataSlice` (which roughly halves the payload)
  would actually reduce it.

**Trigger scope is narrow.** There are exactly two call sites:
`pages/dao/[symbol]/members/VsrMembers.tsx:34`, reachable only after the user
clicks the "All Members" toggle, and
`components/ProposalVotingPower/QuadraticVotingPower.tsx:28`, which is the
quadratic plugin and not used by Marinade. It is **not** on the default DAO
home or the default members page.

**Why unfixed.** It is a payload-and-render problem rather than an RPC refusal
(this RPC serves it in 1-2 s), it sits behind an explicit user action, and the
real fix is a paginated query plus a virtualised 18,097-row list — a redesign of
that view, not a patch.

---

## 3. The All-Members view shows no voting power at all (VSR)

`pages/dao/[symbol]/members/VsrMembers.tsx:35-43` hardcodes:

```ts
communityVotes: new BN(0),
councilVotes: new BN(0)
```

**What is *not* wrong:** no user is shown a misleading "0". `VsrMembers` passes
`vsrMode`/`vsrDisplay` down, and both display sites suppress the figures rather
than printing zero — `components/Members/MembersTabs.tsx:157` renders no
per-row vote line in VSR mode, and `components/Members/MemberOverview.tsx:441`
and `:454` both evaluate falsy with `BN(0)` so neither the community nor the
council tile renders. The props exist precisely because the values are dummies.
The default members page is unaffected: it renders the council view from real
`governingTokenDepositAmount` values.

**What is wrong:** on the All Members view you cannot see any member's VSR
power. Knock-on effects: `memberVotePowerRank`
(`MemberOverview.tsx:359-370`) is computed over an all-zero array and then
discarded, and `isRevokableCouncilMember`/`isRevokableCommunityMember`
(`:390-400`) are always false there, so the Revoke Membership control never
appears. Separately, that `useMemo` sorts the react-query cache array in place.

**Why unfixed.** Correct VSR power cannot be read from a cached
`VoterWeightRecord` — those are stale. (Verified: wallet `8aGDS…7bXxY` has a
cached VWR of 2,196,489 MNDE against a true live-decayed power of 1,000,000, and
several large holders such as `CyAH9…1KcZ6` and `53gDP…Pmde7` have expired
Cliff/Monthly lockups and a true power of 0.) Computing it properly means
decoding every VSR `Voter` account for the registrar (~18,905 accounts), reading
the registrar's voting-mint configs, and recomputing each deposit entry's power
against the current clock.

The repo's existing helper, `getDeposits` in
`VoteStakeRegistry/tools/deposits.ts:46`, is strictly **per wallet** — it derives
one Voter PDA and additionally parses transaction logs
(`getDepositsAdditionalInfoEvents`). Using it for 18,097 members would be
18,097 round trips. A bulk path is a genuinely new query plus decoder, and it
would add another multi-megabyte fetch to the one view that already pulls
10.9 MB (issue 2). Fixing it properly means fixing issue 2 at the same time.

**Do not** "fix" this by populating the numbers from `VoterWeightRecord`
accounts: that replaces a blank with a wrong number, which is worse.

---

## 4. `'Wallet' is not exported from '@coral-xyz/anchor'` (benign, but keep it that way)

`next build` prints:

```
Attempted import error: 'Wallet' is not exported from '@coral-xyz/anchor' (imported as 'Wallet').
```

**Mechanism.** `package.json` `resolutions` pins `@coral-xyz/anchor` to `0.29.0`
globally (with `@pythnetwork/staking-sdk` separately pinned to `0.30.1`), and
yarn reports the pin overriding packages that asked for `^0.28.0`. In anchor
0.29.0's ESM build, `Wallet` is not a static export at all —
`dist/esm/index.js` assigns it CommonJS-style inside a guard:

```js
if (!isBrowser) {
  exports.workspace = require("./workspace.js").default;
  exports.Wallet = require("./nodewallet.js").default;
}
```

Webpack analyses ESM exports statically, sees no `Wallet`, and warns. In a
browser `isBrowser` is true, so the assignment never runs and the value would be
`undefined` at runtime.

**Why this is currently harmless.** Every one of the ten `Wallet` references in
this repo is a *type* position — `as Wallet`, `: Wallet`,
`Omit<Wallet, 'payer'>` — in `hooks/useWalletDeprecated.tsx`,
`actions/createTokenizedRealm.ts`, `actions/createNFTRealm.ts`,
`actions/addPlugins/addGatewayPlugin.ts`, `actions/addPlugins/addQVPlugin.ts`,
`hub/components/EditRealmConfig/createTransaction.ts`,
`VoteStakeRegistry/components/Account/LockTokensAccountWithdraw.tsx` and
`cli/createProposalScript.ts`. There is no `new Wallet(...)` anywhere, so the
binding is never dereferenced and the `undefined` value is never observed.

**The actual risk.** The moment anyone uses `Wallet` as a *value* in
browser-reachable code — `new Wallet(keypair)` — it throws
`TypeError: Wallet is not a constructor` in the browser only, while working
under Node in tests and scripts. That is a nasty failure mode on a write path.
Use `AnchorProvider` with the wallet adapter, and keep `Wallet` type-only.

The same build also warns
`'__wbg_systeminstruction_free' is not exported from './staking_bg.wasm'`, from
`@pythnetwork/staking-wasm`. That is the Pyth plugin, which Marinade does not
use.

---

## 5. `hub/` has no backend and is not portable

`hub/` is 334 files, about 27% of the repo. Its GraphQL backend was
`api.realms.today`, which is **NXDOMAIN** (verified by authoritative Cloudflare
DNS-over-HTTPS, not inferred from a proxy failure; `app.realms.today` on the
same parent still resolves). There is no drop-in successor: `realms-api.com` is
a REST API with an entirely different shape and `realms-api.com/graphql`
returns 404.

**Why unfixed.** Porting 334 files from a GraphQL schema to a differently
shaped REST API is a project, not a fix, and none of it is on the Marinade
governance path.

**What was done instead.** The failure is now explicit rather than silent.
`hub/providers/GraphQL/index.tsx` classifies `NEXT_PUBLIC_API_ENDPOINT` as
`ok` / `unconfigured` / `retired` / `invalid` and renders an explanatory banner
for anything but `ok`, while still mounting a urql client so hub components that
call `useQuery` unconditionally degrade to empty panels instead of throwing
"No client has been specified". `.env.sample` ships the variable blank with a
comment rather than pointing at a dead host.

**Scope.** The affected routes are `/realm/[id]`, `/feed`, `/discover`,
`/stats` and `/ecosystem`. Note it reaches slightly further than "just hub":
`GraphQLProvider` is also mounted by `pages/dao/[symbol]/editConfig.tsx` and
`pages/dao/[symbol]/treasury/governance/[governanceId]/edit.tsx`, so those two
governance editing surfaces lose their metadata layer too.

`hub/` also costs the whole app: `pages/_app.tsx` statically imports
`@hub/App`, so the shared chunk is 2.36 MB before any page code, of which `_app`
alone is 2.26 MB. Dropping `hub/` was considered and rejected as out of scope
for this branch — it is the single biggest available bundle win, but it needs
its own PR and a decision about the metadata-editing surfaces above.

---

## 6. Smaller things left alone

- **`openserum.io` is dead (HTTP 522).** Referenced by
  `components/instructions/programs/mangoV4.tsx:710,724` as market links and by
  a rewrite at `next.config.js:47`. Mango-only, so it does not affect Marinade;
  the links simply fail to load.
- **Telemetry points at Solana Labs, not Marinade.** GA4 `G-TG90SK6TGB`
  (`components/App.tsx`, `hub/App.tsx`) and the Sentry DSN
  `…@o434108.ingest.sentry.io/6380292`, org `solana` / project `realms`
  (`sentry.client.config.js`, `sentry.properties`). Also
  `components/App.tsx`'s `allowedDomains` lists only `app.realms.today` and
  localhost, so a Marinade-hosted domain fails the favicon/OG allowlist. These
  must be replaced or removed before any Marinade-branded deployment.
- **Backup transaction RPC is Mango's.** `utils/connection.ts:6-8` hardcodes
  `https://rpc.mngo.cloud/rlmk0lo5odee/` (an embedded Mango key) and
  `utils/sendTransactions.tsx` uses it. It is live, but it is not ours, and it
  also confuses `getNetworkFromEndpoint`.
- **`getNetworkFromEndpoint` throws during render.** `utils/connection.ts:44-52`
  throws for any endpoint string not in `ENDPOINTS`, and it is called from
  component bodies (`components/Members/useMembers.tsx`,
  `hooks/queries/digitalAssets.ts:202,258,272`). `components/ErrorBoundary.tsx`
  catches it, but that fallback also dumps `error.stack` into the DOM for end
  users (`:47`).
- **Platform staleness.** Next 12.3.2 (EOL), `react-dom` 18.0.0 against
  `react` 18.2.0, `@types/react` 17.0.44 against React 18, the deprecated
  `@tailwindcss/line-clamp`, and two spl-governance SDKs side by side
  (`@solana/spl-governance@0.3.28` plus `@realms-today/spl-governance@0.3.29`
  for a single hook). `next.config.js` also registers an `@svgr/webpack` loader
  that is not installed, which will break on the first SVG import.
- **Effectively no test coverage of the governance path.** Two test files
  total; the real gate is ESLint plus `tsc`.
- **CI never builds.** `.github/workflows/ci-main-tests.yml` runs `yarn ci`
  followed by `yarn test-all` (= `lint && type-check && test`), so a change that
  compiles under `tsc` but breaks `next build` — a bad dynamic import, a broken
  webpack resolution — reaches `main` undetected. Adding a `yarn build` step
  would cost roughly 5 minutes per run and is worth considering.
- **69 `react-hooks/exhaustive-deps` warnings** remain (plus ~211 inline
  disables of the same rule). They are warnings, so `yarn lint` passes; several
  are probably real stale-closure bugs and deserve a dedicated pass.

---

## Endpoint status reference (verified 2026-08-04)

| Purpose | Endpoint | Status |
| --- | --- | --- |
| Price oracle | `api.jup.ag/price/v3` | **live** (now used) |
| Token list | `api.jup.ag/tokens/v2/tag?query=verified` | **live** (now used), 3,880 tokens |
| Price oracle (old) | `price.jup.ag/v4/price` | dead, no A/AAAA record |
| Token list (old) | `token.jup.ag/strict` | dead, no A/AAAA record |
| Swap quotes | `quote-api.jup.ag/v6` | dead; successor `api.jup.ag/swap/v1` |
| Hub GraphQL | `api.realms.today/graphql` | **NXDOMAIN, no successor** |
| SNS `.sol` names | on-chain `namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX` | live |
| Serum/OpenBook | `openserum.io` | dead (HTTP 522) |
| Mainnet RPC | `rpc.marinade.finance` | live (403s from some sandboxes; verify in a browser) |

Note on `@bonfida/spl-name-service`: the entire `@bonfida` npm scope has been
unpublished, which used to make `yarn install --frozen-lockfile` impossible.
This is **fixed**, not deferred — see `utils/sns.ts` and the commit that adds
it. The `.sol` domain feature is fully functional against the official
`@solana/spl-name-service`; `NEXT_PUBLIC_DISABLE_SNS=true` turns off domain
enumeration if an RPC provider objects to the per-wallet
`getProgramAccounts` scans.
