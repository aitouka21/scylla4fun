import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Config, Context, DateTime, Effect } from 'effect';
import { DDBClient } from './ddb-client.mjs';
import { ItemSchema } from './schema.mjs';

type Item = typeof ItemSchema.Type;
type PrimaryKey = { key: string; subkey: string };

export class ItemStore extends Context.Tag('ItemStore')<ItemStore, Effect.Effect.Success<typeof ItemStoreLive>>() { }

export const ItemStoreLive = Effect.gen(function* () {
  const TableName = yield* Config.string('ITEM_STORE_TABLE_NAME');
  const client = yield* DDBClient;
  const ddbClient = DynamoDBDocumentClient.from(client);

  return {
    scan: Effect.gen(function* () {
      const command = new ScanCommand({ TableName });
      const result = yield* Effect.tryPromise(() => ddbClient.send(command));
      yield* Effect.logTrace('scan command result').pipe(Effect.annotateLogs({ result }));
      return (result.Items ?? []) as Item[];
    }),

    get: (Key: PrimaryKey) =>
      Effect.gen(function* () {
        const command = new GetCommand({ TableName, Key });
        const result = yield* Effect.tryPromise(() => ddbClient.send(command));
        yield* Effect.logTrace('get command result').pipe(Effect.annotateLogs({ result }));
        return result.Item as Item | undefined;
      }),

    put: (Key: PrimaryKey, value: number) =>
      Effect.gen(function* () {
        const Item: Item = {
          key: Key.key,
          subkey: Key.subkey,
          value,
          metadata: {
            createdAt: DateTime.unsafeNow(),
            createdBy: 'API',
            tag: ['foo', 'bar', 'baz'],
          },
        };
        const command = new PutCommand({ TableName, Item });
        const result = yield* Effect.tryPromise(() => ddbClient.send(command));
        yield* Effect.logTrace('put command result').pipe(Effect.annotateLogs({ result }));
      }),
  };
});
