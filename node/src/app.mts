import { Config, Effect, Layer, Logger, LogLevel, Option, Schema } from 'effect';
import { DDBClient, DDBClientLive } from './ddb-client.mjs';
import { ItemStore, ItemStoreLive } from './item-store.mjs';
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
} from '@effect/platform';
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import { createServer } from 'node:http';
import { InternalServerError, NotFound } from '@effect/platform/HttpApiError';

const LogLevelLive = Config.logLevel('LOG_LEVEL')
  .pipe(Config.option)
  .pipe(
    Effect.andThen((level) =>
      Logger.minimumLogLevel(
        Option.match(level, {
          onNone: () => LogLevel.Info,
          onSome: (level) => level,
        })
      )
    ),
    Layer.unwrapEffect
  );

const Item = Schema.Struct({
  key: Schema.String,
  subkey: Schema.String,
  value: Schema.Number,
});

const keyParam = HttpApiSchema.param('key', Schema.String);
const subkeyParam = HttpApiSchema.param('subkey', Schema.String);

const itemsGroup = HttpApiGroup.make('items')
  .add(
    HttpApiEndpoint.get('getItem')`/${keyParam}/${subkeyParam}`.addSuccess(Item).addError(InternalServerError).addError(NotFound)
  )
  .add(HttpApiEndpoint.get('listItems')``.addSuccess(Schema.Array(Item)).addError(InternalServerError))
  .add(HttpApiEndpoint.put('putItem')``.setPayload(Item).addError(InternalServerError))
  .prefix(`/items`);

const api = HttpApi.make('api').add(itemsGroup);

const itemsGroupLive = HttpApiBuilder.group(api, 'items', (handlers) =>
  handlers
    .handle('listItems', () =>
      Effect.gen(function* () {
        const store = yield* ItemStore;
        return yield* store.scan.pipe(Effect.mapError((_) => new InternalServerError()));
      })
    )
    .handle('getItem', (req) =>
      Effect.gen(function* () {
        const store = yield* ItemStore;
        const item = yield* store.get(req.path).pipe(Effect.mapError((_) => new InternalServerError()));
        if (!item) return yield* Effect.fail(new NotFound());
        return item;
      })
    )
    .handle('putItem', (req) =>
      Effect.gen(function* () {
        const store = yield* ItemStore;
        yield* store.put(req.payload, req.payload.value).pipe(Effect.mapError((_) => new InternalServerError()));
      })
    )
);

const ItemStoreLayer = Layer.effect(ItemStore, ItemStoreLive);
const DDBClientLayer = Layer.effect(DDBClient, DDBClientLive);

const ApiLive = HttpApiBuilder.api(api).pipe(Layer.provide(itemsGroupLive));

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger)
  .pipe(Layer.provide(HttpApiSwagger.layer()))
  .pipe(Layer.provide(ApiLive))
  .pipe(HttpServer.withLogAddress)
  .pipe(Layer.provide(ItemStoreLayer))
  .pipe(Layer.provide(DDBClientLayer))
  .pipe(Layer.provide(Logger.pretty))
  .pipe(Layer.provide(LogLevelLive))
  .pipe(Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })));

Layer.launch(HttpLive).pipe(NodeRuntime.runMain);
