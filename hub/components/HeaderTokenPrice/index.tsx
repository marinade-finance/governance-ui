// @ts-ignore
import CautionIcon from '@carbon/icons-react/lib/Caution';
import type { PublicKey } from '@solana/web3.js';
import { pipe } from 'fp-ts/lib/function';

import { useCachedValue } from '@hub/hooks/useCachedValue';
import cx from '@hub/lib/cx';
import * as RE from '@hub/types/Result';

interface TokenPrice {
  direction: 'up' | 'down';
  percentChange: number;
  price: number;
}

function useTokenPrice(symbol: string, mint: PublicKey) {
  const mintAddress = mint.toString();

  // `price.jup.ag` was retired and no longer resolves. `api.jup.ag/price/v3`
  // replaces it: the response is a flat map keyed by mint (no `data` wrapper)
  // and the price field is `usdPrice`. It also exposes `priceChange24h`, which
  // lets the up/down indicator show a real figure instead of a hardcoded 0.
  return useCachedValue<TokenPrice>(mintAddress, () =>
    fetch(`https://api.jup.ag/price/v3?ids=${mintAddress}`)
      .then((resp) => resp.json())
      .then((result) => {
        const entry = result?.[mintAddress];
        const price = typeof entry?.usdPrice === 'number' ? entry.usdPrice : 0;
        const percentChange =
          typeof entry?.priceChange24h === 'number' ? entry.priceChange24h : 0;

        return {
          direction: percentChange < 0 ? 'down' : 'up',
          percentChange: Math.abs(Number(percentChange.toFixed(2))),
          price,
        };
      }),
  );
}

interface Props {
  className?: string;
  mint: PublicKey;
  symbol: string;
}

export function HeaderTokenPrice(props: Props) {
  const tokenPrice = useTokenPrice(props.symbol, props.mint);

  return pipe(
    tokenPrice,
    RE.match(
      () => (
        <div className={props.className}>
          <div className="flex items-center">
            <div className="text-xs rounded bg-neutral-200 w-16">&nbsp;</div>
            <div className="text-xs rounded bg-neutral-200 w-16 ml-1">
              &nbsp;
            </div>
          </div>
          <div className="text-base mt-1 rounded bg-neutral-200 w-28">
            &nbsp;
          </div>
        </div>
      ),
      () => (
        <div className={props.className}>
          <div className="flex items-center">
            <div className="text-xs rounded bg-neutral-200 w-16 animate-pulse">
              &nbsp;
            </div>
            <div className="text-xs rounded bg-neutral-200 w-16 ml-1 animate-pulse">
              &nbsp;
            </div>
          </div>
          <div className="text-base mt-1 rounded bg-neutral-200 w-28 animate-pulse">
            &nbsp;
          </div>
        </div>
      ),
      ({ direction, price, percentChange }) => (
        <div className={props.className}>
          <div className="flex items-center">
            <div className="text-xs text-neutral-600">
              #{props.symbol} Price
            </div>
            {percentChange !== 0 ? (
              <CautionIcon
                className={cx(
                  'h-2',
                  'mx-[1px]',
                  'w-2',
                  direction === 'up' && 'fill-emerald-500',
                  direction === 'down' && 'fill-rose-500',
                  direction === 'down' && 'rotate-180',
                )}
              />
            ) : null}

            {percentChange !== 0 ? (
              <div
                className={cx(
                  'text-xs',
                  direction === 'up' && 'text-emerald-500',
                  direction === 'down' && 'text-rose-500',
                )}
              >
                {percentChange}%
              </div>
            ) : null}
          </div>
          <div className="text-lg text-neutral-900">${price}</div>
        </div>
      ),
    ),
  );
}
