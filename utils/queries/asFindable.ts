/**
 * @param {any}  thisContext - second param if you want to call function that is part of
 * an object eg. connection.getAccountInfo
 * getAccountInfo will loss this binding so you need to
 * pass connection as context. Depends on lib/function implementation
 */
const asFindable = <P extends any[], R>(
  f: (...p: P) => Promise<R>,
  thisContext?: any
) => async (...p: P) => {
  try {
    const result = thisContext ? await f.call(thisContext, ...p) : await f(...p)
    if (result === null || result === undefined) {
      return {
        found: false,
        result: undefined,
      } as const
    }
    return {
      found: true,
      result: result as NonNullable<R>,
    } as const
  } catch (e) {
    const message = errorMessage(e)

    // Only treat "this account does not exist" as a clean miss. The previous
    // check matched a bare `not found` substring, so unrelated failures — a 404
    // or HTML error body from an RPC proxy, an unsupported RPC method, a DNS
    // error — were reported to the user as a missing account (eg the DAO home
    // rendering "Realm not found" for what was really a broken endpoint). Those
    // now propagate so react-query surfaces a real error state instead.
    if (isAccountMissing(message)) {
      return { found: false, result: undefined, err: message } as const
    }

    return Promise.reject(e)
  }
}

/**
 * Read an error message without assuming the thrown value is an `Error`.
 * `e.message` was dereferenced unguarded, so throwing a string, a number or
 * `undefined` raised a `TypeError` from inside this catch block and masked the
 * original failure entirely.
 */
const errorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { message?: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return ''
}

/**
 * Messages that genuinely mean "no such account", as thrown by
 * `@solana/spl-governance` (`Account <pubkey> not found`) and `@solana/web3.js`
 * (`Account does not exist <pubkey>`).
 */
const ACCOUNT_MISSING_PATTERNS = [
  /account .*not found/i,
  /account does not exist/i,
  /could not find account/i,
]

const isAccountMissing = (message: string) =>
  message.length > 0 &&
  ACCOUNT_MISSING_PATTERNS.some((pattern) => pattern.test(message))

export default asFindable
