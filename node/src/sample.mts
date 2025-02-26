import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { RoundRobinEndpointProvider } from "./util.mjs";
import { init } from "./table.mjs";

const client = new DynamoDBClient({
  endpoint: RoundRobinEndpointProvider(),
  logger: console,
});

const TableName = "Nokia3310Testing";
await init(client, TableName);

type PrimaryKey = { key: string; subkey: string };

class FooStore {
  #client: DynamoDBDocumentClient;
  #table = TableName;

  constructor(client: DynamoDBClient) {
    this.#client = DynamoDBDocumentClient.from(client);
  }

  async get(pk: PrimaryKey) {
    const command = new GetCommand({
      TableName: this.#table,
      Key: pk,
    });
    const result = await this.#client.send(command);
    return result.Item;
  }

  async put(pk: PrimaryKey, value: number) {
    const command = new PutCommand({
      TableName: this.#table,
      Item: {
        key: pk.key,
        subkey: pk.subkey,
        value,
      },
    });
    await this.#client.send(command);
  }

  async scan() {
    const command = new ScanCommand({
      TableName: this.#table,
    });
    const result = await this.#client.send(command);
    return result.Items ?? [];
  }

  async insert() { }
}

const fooStore = new FooStore(client);

{
  const items = await fooStore.scan();
  console.log(items);
}

{
  await fooStore.put(
    { key: "foo", subkey: "bar" },
    Math.round(Math.random() * 10),
  );
}

{
  const item = await fooStore.get({ key: "foo", subkey: "bar" });
  console.log(item);
}
