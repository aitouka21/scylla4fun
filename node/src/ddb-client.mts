import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context, Effect } from 'effect';

export class DDBClient extends Context.Tag('DDBClient')<DDBClient, DynamoDBClient>() {}

type RoundRobinEndpointProviderConfig = Partial<{
  hostname?: string;
  ports?: [number, ...number[]];
}>;

function RoundRobinEndpointProvider(config?: RoundRobinEndpointProviderConfig) {
  const hostname = config?.hostname ?? 'localhost';
  const ports = config?.ports ?? [8000, 8001, 8002];
  let counter = 0;
  return async () => {
    return {
      hostname,
      path: '/',
      protocol: 'http:',
      port: ports[counter++ % ports.length]!,
    };
  };
}

export const DDBClientLive = Effect.succeed(
  new DynamoDBClient({
    endpoint: RoundRobinEndpointProvider(),
  })
);
