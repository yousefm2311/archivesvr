import { Schema, model, models } from "mongoose";

const ClientDocumentSchema = new Schema(
  {
    clientCode: {
      type: String,
      required: true,
      index: true,
    },

    docName: {
      type: String,
      required: true,
    },

    normalizedDocName: {
      type: String,
      required: true,
      index: true,
    },

    docDate: {
      type: Date,
      default: null,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    uploadedBy: {
      type: Schema.Types.Mixed,
      required: true,
    },

    branch: {
      type: String,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    clientName: {
      type: String,
    },
  },
  { collection: "clientDocuments" }
);

export const ClientDocumentModel =
  models.ClientDocument ||
  model("ClientDocument", ClientDocumentSchema);
