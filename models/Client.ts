import { Schema, model, models } from "mongoose";

const ClientSchema = new Schema(
  {
    clientCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    clientName: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: String,
    },

    createdBranch: {
      type: String,
    },

    createdBranchName: {
      type: String,
    },
  },
  { collection: "clients" }
);

export const ClientModel =
  models.Client || model("Client", ClientSchema);
