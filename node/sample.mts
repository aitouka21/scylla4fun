import {
  DynamoDBClient,
  CreateTableCommand,
  StreamViewType,
  BillingMode,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ endpoint: "http://localhost:8000" });
const tableName = "Nokia3310Testing";

async function hasTable(tableName: string): Promise<boolean> {
  const command = new ListTablesCommand();
  const result = await client.send(command);
  if (!result.TableNames) return false;
  return result.TableNames.includes(tableName);
}

async function createTable(tableName: string): Promise<void> {
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: "key", KeyType: "HASH" },
      { AttributeName: "subkey", KeyType: "RANGE" },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
    AttributeDefinitions: [
      { AttributeName: "key", AttributeType: "S" },
      { AttributeName: "subkey", AttributeType: "S" },
    ],
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: StreamViewType.NEW_AND_OLD_IMAGES,
    },
  });
  await client.send(command);
}

if (!(await hasTable(tableName))) {
  await createTable(tableName);
}

const ddb = DynamoDBDocumentClient.from(client);
{
  const command = new ScanCommand({
    TableName: tableName,
  });

  const result = await ddb.send(command);
  console.dir(result, { depth: null });
}

{
  const command = new PutCommand({
    TableName: tableName,
    Item: { key: "FOO", subkey: "BAR1", value: 123 },
    ConditionExpression: "attribute_not_exists(#pk)",
    ExpressionAttributeNames: { "#pk": "key" },
  });
  const result = await ddb.send(command);
  console.dir(result, { depth: null });
}
