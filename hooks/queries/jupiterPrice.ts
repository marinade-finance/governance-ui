import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import queryClient from './queryClient'

// `price.jup.ag` was retired and no longer resolves (no A/AAAA records), which
// left every USD figure in the app at 0. `api.jup.ag/price/v3` is the live
// successor, but its response shape differs from v4 — see below.
const URL = 'https://api.jup.ag/price/v3'

/* example query
GET https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112
response: {"So11111111111111111111111111111111111111112":{"usdPrice":73.04934526843839,"blockId":437157938,"decimals":9,"priceChange24h":0.688308086813784,"liquidity":656502529.164988,"createdAt":"2024-06-05T08:55:25.527Z"}}
*/
/* example intentionally broken query
GET https://api.jup.ag/price/v3?ids=bingus
response: {}
*/

/**
 * Raw Price V3 entry. Differences from v4: the response is a flat map keyed by
 * mint with no `data`/`timeTaken` wrapper, the price field is `usdPrice` rather
 * than `price`, only mints (not symbols) may be queried, and no symbol or
 * quote-token metadata is returned.
 */
type JupiterPriceV3 = {
  usdPrice: number
  decimals?: number
  blockId?: number
  priceChange24h?: number
}
type Response = Record<string, JupiterPriceV3 | undefined>

/** Internal shape, kept stable for consumers which read `.price`. */
type Price = {
  id: string // pubkey,
  price: number
  decimals?: number
}

const toPrice = (mint: string, raw: JupiterPriceV3): Price => ({
  id: mint,
  price: raw.usdPrice,
  decimals: raw.decimals,
})

function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n)
  }
}

/**
 * Price V3 accepts at most 50 mints per request and — unlike v4, which took 100
 * — silently truncates: 100 ids still return HTTP 200 with only the first 50
 * entries, no error. Batching at v4's 100 therefore dropped every mint past the
 * 50th to a $0 price with nothing to indicate it. Measured against the live
 * endpoint on 2026-08-04: 50 ids -> 50 entries, 51 -> 50, 100 -> 50 (exactly
 * the first 50, in request order).
 */
const MAX_IDS_PER_REQUEST = 50

export const jupiterPriceQueryKeys = {
  all: ['Jupiter Price API'],
  byMint: (mint: PublicKey) => [...jupiterPriceQueryKeys.all, mint.toString()],
  byMints: (mints: PublicKey[]) => [
    ...jupiterPriceQueryKeys.all,
    mints.map((x) => x.toString()).sort(),
  ],
}

const jupQueryFn = async (mint: PublicKey) => {
  const x = await fetch(`${URL}?ids=${mint?.toString()}`)
  const response = (await x.json()) as Response
  const raw = response?.[mint.toString()]
  return typeof raw?.usdPrice === 'number'
    ? ({ found: true, result: toPrice(mint.toString(), raw) } as const)
    : ({ found: false, result: undefined } as const)
}

export const useJupiterPriceByMintQuery = (mint: PublicKey | undefined) => {
  const enabled = mint !== undefined
  return useQuery({
    queryKey: enabled ? jupiterPriceQueryKeys.byMint(mint) : undefined,
    queryFn: async () => {
      if (!enabled) throw new Error()
      return jupQueryFn(mint)
    },
  })
}

export const fetchJupiterPrice = async (mint: PublicKey) =>
  queryClient.fetchQuery({
    queryKey: jupiterPriceQueryKeys.byMint(mint),
    queryFn: () => jupQueryFn(mint),
  })

/**
 * @deprecated
 * do not use this! it only exists to replace a previously existing synchronous function. use fetchJupiterPrice
 * */
export const getJupiterPriceSync = (mint: PublicKey) =>
  ((queryClient.getQueryData(jupiterPriceQueryKeys.byMint(mint)) as any)?.result
    ?.price as number) ?? 0

export const useJupiterPricesByMintsQuery = (mints: PublicKey[]) => {
  const enabled = mints.length > 0
  return useQuery({
    enabled,
    queryKey: jupiterPriceQueryKeys.byMints(mints),
    queryFn: async () => {
      const batches = [...chunks(mints, MAX_IDS_PER_REQUEST)]
      const responses = await Promise.all(
        batches.map(async (batch) => {
          const x = await fetch(`${URL}?ids=${batch.join(',')}`)
          const response = (await x.json()) as Response
          return response
        })
      )
      const data = responses.reduce((acc, next) => {
        for (const [mint, raw] of Object.entries(next ?? {})) {
          if (typeof raw?.usdPrice === 'number') {
            acc[mint] = toPrice(mint, raw)
          }
        }
        return acc
      }, {} as Record<string, Price>)

      //override chai price if its broken
      const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
      const chaiData = data[chaiMint]

      if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
        data[chaiMint] = {
          ...chaiData,
          price: 1,
        }
      }
      return data
    },
    onSuccess: (data) => {
      mints.forEach((mint) =>
        queryClient.setQueryData(
          jupiterPriceQueryKeys.byMint(mint),
          data[mint.toString()]
            ? ({ found: true, result: data[mint.toString()] } as const)
            : ({ found: false, result: undefined } as const)
        )
      )
    },
  })
}
