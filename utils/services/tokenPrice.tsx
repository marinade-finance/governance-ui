import axios from 'axios'
import { mergeDeepRight } from 'ramda'

import { notify } from '@utils/notifications'
import { WSOL_MINT } from '@components/instructions/tools'
import overrides from 'public/realms/token-overrides.json'
import { Price, TokenInfo } from './types'
import { chunks } from '@utils/helpers'
import { USDC_MINT } from '@blockworks-foundation/mango-v4'

//this service provide prices it is not recommended to get anything more from here besides token name or price.
//decimals from metadata can be different from the realm on chain one

// `price.jup.ag` and `token.jup.ag` were retired and no longer resolve at all
// (no A/AAAA records), which left every USD figure in the app at $0/undefined.
// These are the live successors on `api.jup.ag`. Both return a different shape
// from the v4/strict endpoints they replace, so the responses are mapped onto
// the internal `Price`/`TokenInfo` types below rather than consumed directly.
const priceEndpoint = 'https://api.jup.ag/price/v3'
const tokenListUrl = 'https://api.jup.ag/tokens/v2/tag?query=verified'

/** Solana mainnet, per the SPL token-list convention `TokenInfo.chainId` uses. */
const SOLANA_MAINNET_CHAIN_ID = 101

/**
 * An entry from `api.jup.ag/tokens/v2/tag`. Renames relative to the old
 * `token.jup.ag/strict` list: `address` -> `id`, `logoURI` -> `icon`. It also
 * drops `chainId` and `extensions` entirely (so `extensions.coingeckoId` now
 * only ever comes from `token-overrides.json`).
 */
type JupiterTokenV2 = {
  id: string
  name: string
  symbol: string
  decimals: number
  icon?: string
  tags?: string[]
}

/**
 * An entry from `api.jup.ag/price/v3`. The response is a flat map keyed by mint
 * with no `data` wrapper, and the price field is `usdPrice` rather than `price`.
 * It carries no symbol or quote-token information.
 */
type JupiterPriceV3 = {
  usdPrice: number
  decimals?: number
  blockId?: number
  priceChange24h?: number
}

export type TokenInfoWithoutDecimals = Omit<TokenInfo, 'decimals'>

/** @deprecated */
class TokenPriceService {
  _tokenList: TokenInfo[]
  _tokenPriceToUSDlist: {
    [mintAddress: string]: Price
  }
  constructor() {
    this._tokenList = []
    this._tokenPriceToUSDlist = {}
  }
  /**
   * Map a Price V3 entry onto the internal `Price` shape that the rest of the
   * app consumes. V3 quotes strictly in USD and returns no symbol, so the
   * symbol is recovered from the token list and the quote token is reported as
   * USDC (the same convention v4 defaulted to, and what the USDC fallback below
   * already assumed).
   */
  _toPrice(mintAddress: string, usdPrice: number): Price {
    const USDC_MINT_BASE = USDC_MINT.toBase58()
    return {
      id: mintAddress,
      mintSymbol: this.getTokenInfo(mintAddress)?.symbol ?? '',
      price: usdPrice,
      vsToken: USDC_MINT_BASE,
      vsTokenSymbol: 'USDC',
    }
  }
  async fetchSolanaTokenList() {
    try {
      const tokens = await axios.get(tokenListUrl)
      const tokenList = tokens.data as JupiterTokenV2[]
      if (Array.isArray(tokenList) && tokenList.length) {
        this._tokenList = tokenList.map((token) => {
          const mapped: TokenInfo = {
            chainId: SOLANA_MAINNET_CHAIN_ID,
            address: token.id,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logoURI: token.icon,
            tags: token.tags,
          }

          const override = overrides[mapped.address]

          if (override) {
            return mergeDeepRight(mapped, override) as TokenInfo
          }

          return mapped
        })
      }
    } catch (e) {
      console.log(e)
      notify({
        type: 'error',
        message: 'unable to fetch token list',
      })
    }
  }
  async fetchTokenPrices(mintAddresses: string[]) {
    if (mintAddresses.length) {
      //can query only 100 at once
      const mintAddressesWithSol = chunks([...mintAddresses, WSOL_MINT], 100)
      for (const mintChunk of mintAddressesWithSol) {
        const symbols = mintChunk.join(',')
        try {
          const response = await axios.get(`${priceEndpoint}?ids=${symbols}`)
          // Price V3 responds with a flat `{ [mint]: { usdPrice, ... } }` map,
          // unlike v4's `{ data: { [id]: { price, ... } } }`.
          const priceToUsd = (response?.data ?? {}) as Record<
            string,
            JupiterPriceV3 | undefined
          >
          const keyValue = Object.fromEntries(
            Object.entries(priceToUsd)
              .filter(([, val]) => typeof val?.usdPrice === 'number')
              .map(([mint, val]) => [mint, this._toPrice(mint, val!.usdPrice)])
          )

          this._tokenPriceToUSDlist = {
            ...this._tokenPriceToUSDlist,
            ...keyValue,
          }
        } catch (e) {
          notify({
            type: 'error',
            message: 'unable to fetch token prices',
          })
        }
      }
      const USDC_MINT_BASE = USDC_MINT.toBase58()
      if (!this._tokenPriceToUSDlist[USDC_MINT_BASE]) {
        this._tokenPriceToUSDlist[USDC_MINT_BASE] = {
          id: USDC_MINT_BASE,
          mintSymbol: 'USDC',
          price: 1,
          vsToken: USDC_MINT_BASE,
          vsTokenSymbol: 'USDC',
        }
      }

      //override chai price if its broken
      const chaiMint = '3jsFX1tx2Z8ewmamiwSU851GzyzM2DJMq7KWW5DM8Py3'
      const chaiData = this._tokenPriceToUSDlist[chaiMint]

      if (chaiData?.price && (chaiData.price > 1.3 || chaiData.price < 0.9)) {
        this._tokenPriceToUSDlist[chaiMint] = {
          ...chaiData,
          price: 1,
        }
      }
    }
  }
  /**
   * @deprecated
   * seriously do not use this. use fetchJupiterPrice
   */
  getUSDTokenPrice(mintAddress: string): number {
    return mintAddress ? this._tokenPriceToUSDlist[mintAddress]?.price || 0 : 0
  }
  /**
   * For decimals use on chain tryGetMint
   */
  getTokenInfo(mintAddress: string): TokenInfoWithoutDecimals | undefined {
    const tokenListRecord = this._tokenList?.find(
      (x) => x.address === mintAddress
    )
    return tokenListRecord
  }
  /**
   * For decimals use on chain tryGetMint
   */
  getTokenInfoFromCoingeckoId(
    coingeckoId: string
  ): TokenInfoWithoutDecimals | undefined {
    const tokenListRecord = this._tokenList?.find(
      (x) => x.extensions?.coingeckoId === coingeckoId
    )
    return tokenListRecord
  }
}

const tokenPriceService = new TokenPriceService()

export default tokenPriceService
