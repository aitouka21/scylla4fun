import {
  BillingMode,
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
  StreamViewType,
} from "@aws-sdk/client-dynamodb";

export async function init(
  client: DynamoDBClient,
  tableName: string,
): Promise<void> {
  {
    const command = new ListTablesCommand();
    const result = await client.send(command);
    if (!result.TableNames) throw new Error("unable to get tables");

    if (result.TableNames.includes(tableName)) {
      return;
    }
  }

  {
    // TODO: test config combination
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
}
