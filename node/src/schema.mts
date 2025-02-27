import { Schema } from 'effect';

export const ItemSchema = Schema.Struct({
  key: Schema.String,
  subkey: Schema.String,
  value: Schema.Number,
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(Schema.optional),
});
