import { BillingMode, CreateTableCommand, ListTablesCommand, StreamViewType } from '@aws-sdk/client-dynamodb';
import { DDBClient, DDBClientLive } from '../ddb-client.mjs';
import { Effect } from 'effect';

const init = (tableName: string) =>
  Effect.gen(function* () {
    const client = yield* DDBClient;
    {
      const command = new ListTablesCommand();
      const result = yield* Effect.promise(() => client.send(command));
      if (!result.TableNames) throw new Error('unable to get tables');
      if (result.TableNames.includes(tableName)) {
        return yield* Effect.log('table already created');
      }
    }

    {
      // TODO: test config combination
      const command = new CreateTableCommand({
        TableName: tableName,
        KeySchema: [
          { AttributeName: 'key', KeyType: 'HASH' },
          { AttributeName: 'subkey', KeyType: 'RANGE' },
        ],
        BillingMode: BillingMode.PAY_PER_REQUEST,
        AttributeDefinitions: [
          { AttributeName: 'key', AttributeType: 'S' },
          { AttributeName: 'subkey', AttributeType: 'S' },
        ],
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: StreamViewType.NEW_AND_OLD_IMAGES,
        },
      });
      yield* Effect.promise(() => client.send(command));
      yield* Effect.log('done');
    }
  });

await Effect.runPromise(init('Nokia3310Testing').pipe(Effect.provideServiceEffect(DDBClient, DDBClientLive)));
