import { HydratedDocument, Types } from 'mongoose';

/**
 * Helper types to derive API-friendly shapes from @Schema() classes.
 * Similar to DTOs, but generated from the schema class + timestamps.
 */

export type TimestampDocumentType<M> = HydratedDocument<M> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type TimestampType<M> = M & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
