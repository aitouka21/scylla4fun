import {
  DescribeStreamCommand,
  DescribeStreamInput,
  DynamoDBStreamsClient,
  GetRecordsCommand,
  GetRecordsCommandInput,
  GetShardIteratorCommand,
} from "@aws-sdk/client-dynamodb-streams";
import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";

{
  const client = new DynamoDBClient({
    endpoint: "http://localhost:8000",
  });

  const command = new DescribeTableCommand({
    TableName: "Nokia3310Testing",
  });

  const a = await client.send(command);
  var streamArn = a.Table?.LatestStreamArn;
  if (!streamArn) throw new Error("missing stream arn");
}

const client = new DynamoDBStreamsClient({
  endpoint: "http://localhost:8000",
});

{
  // TODO: study how to consume stream
  var shardIds: string[] = [];

  const input: DescribeStreamInput = {
    StreamArn: streamArn,
  };

  do {
    const command = new DescribeStreamCommand(input);
    const result = await client.send(command);
    input.ExclusiveStartShardId =
      result.StreamDescription?.LastEvaluatedShardId;
    if (result.StreamDescription)
      if (result.StreamDescription.Shards)
        for (const shard of result.StreamDescription.Shards)
          if (shard.ShardId) shardIds.push(shard.ShardId);
  } while (input.ExclusiveStartShardId);
}

for (const shardId of shardIds) {
  // console.log(`handling shard (id: ${shardId})`);
  const command = new GetShardIteratorCommand({
    StreamArn: streamArn,
    ShardId: shardId,
    ShardIteratorType: "TRIM_HORIZON",
  });
  const result = await client.send(command);
  var shardIterator = result.ShardIterator;
  if (!shardIterator) continue;

  const input: GetRecordsCommandInput = {
    ShardIterator: shardIterator,
  };

  do {
    const command = new GetRecordsCommand(input);
    const result = await client.send(command);
    if (result.NextShardIterator === input.ShardIterator) break;
    input.ShardIterator = result.NextShardIterator;
    if (result.Records)
      for (const record of result.Records) console.dir(record, { depth: null });
  } while (input.ShardIterator);
}
