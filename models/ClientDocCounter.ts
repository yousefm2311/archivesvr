import { Schema, model, models } from "mongoose";

const ClientDocCounterSchema = new Schema(
  {
    clientCode: {
      type: String,
      required: true,
      index: true,
    },
    baseNormalized: {
      type: String,
      required: true,
      index: true,
    },
    branch: {
      type: String,
      default: "",
    },
    counter: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { collection: "clientDocCounters" }
);

ClientDocCounterSchema.index(
  { clientCode: 1, baseNormalized: 1, branch: 1 },
  { unique: true }
);

export const ClientDocCounterModel =
  models.ClientDocCounter || model("ClientDocCounter", ClientDocCounterSchema);
