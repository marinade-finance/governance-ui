import { IntrospectionData } from '@urql/exchange-graphcache/dist/types/ast';
import React, { useEffect, useState } from 'react';
import { createClient, Client, Provider, Exchange } from 'urql';

import { useJWT } from '@hub/hooks/useJWT';

import { exchanges } from './exchanges';

/**
 * Hosts that used to serve the Hub GraphQL API and have since been retired.
 * `api.realms.today` is NXDOMAIN as of 2026-08; there is no drop-in successor
 * (`realms-api.com` is a REST API with an entirely different shape, and
 * `realms-api.com/graphql` 404s), so porting `hub/` is out of scope here.
 */
const RETIRED_ENDPOINT_HOSTS = ['api.realms.today'];

type EndpointStatus = 'ok' | 'unconfigured' | 'retired' | 'invalid';

export function getHubApiEndpointStatus(endpoint: string): EndpointStatus {
  if (!endpoint) return 'unconfigured';

  try {
    return RETIRED_ENDPOINT_HOSTS.includes(new URL(endpoint).hostname)
      ? 'retired'
      : 'ok';
  } catch {
    return 'invalid';
  }
}

const MESSAGES: Record<Exclude<EndpointStatus, 'ok'>, string> = {
  unconfigured:
    'NEXT_PUBLIC_API_ENDPOINT is not set, so Hub features (feed, discover, ' +
    'stats, ecosystem and realm metadata editing) have no backend and will ' +
    'render empty. On-chain governance pages under /dao are unaffected.',
  retired:
    'NEXT_PUBLIC_API_ENDPOINT points at a retired host that no longer ' +
    'resolves, so Hub features (feed, discover, stats, ecosystem and realm ' +
    'metadata editing) will render empty. On-chain governance pages under ' +
    '/dao are unaffected.',
  invalid:
    'NEXT_PUBLIC_API_ENDPOINT is not a valid URL, so Hub features will ' +
    'render empty. On-chain governance pages under /dao are unaffected.',
};

function HubApiUnavailableBanner(props: {
  status: Exclude<EndpointStatus, 'ok'>;
}) {
  return (
    <div
      role="status"
      className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-900"
    >
      <span className="font-bold">Hub API unavailable. </span>
      {MESSAGES[props.status]}
    </div>
  );
}

const urqlClient = async (
  endpoint: string,
  jwt: string | null,
  schema?: IntrospectionData,
) => {
  return createClient({
    exchanges: (await exchanges(jwt, schema)) as Exchange[],
    url: endpoint,
  });
};

interface Props {
  children?: React.ReactNode;
}

export function GraphQLProvider(props: Props) {
  const [jwt] = useJWT();
  const [client, setClient] = useState<Client | null>(null);

  const endpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || '';
  const status = getHubApiEndpointStatus(endpoint);

  useEffect(() => {
    const schema =
      typeof window !== 'undefined'
        ? // @ts-ignore
          window['__SCHEMA__']
        : undefined;

    setClient(null);
    urqlClient(endpoint, jwt, schema).then(setClient);
  }, [endpoint, jwt]);

  if (!client) {
    return null;
  }

  // A client is mounted even when the endpoint is unusable: hub components call
  // urql's `useQuery` unconditionally and would throw "No client has been
  // specified" without a Provider. Queries then fail and the affected panels
  // render empty — degraded, not fatal — and the banner makes the cause
  // visible instead of leaving a silently blank page.
  return (
    <Provider value={client}>
      {status !== 'ok' && <HubApiUnavailableBanner status={status} />}
      {props.children}
    </Provider>
  );
}
