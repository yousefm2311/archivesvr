import { Schema, model, models } from "mongoose";
import { unique } from "next/dist/build/utils";

const ArchiveSchema = new Schema(
  {
    clientCode: {
      type: String,
      required: true,
      index: true,
      unique: true
    },

    archiveName: {
      type: String,
    },

    archivePath: {
      type: String,
      required: true,
    },

    totalOriginalBytes: {
      type: Number,
    },

    archivedBytes: {
      type: Number,
    },

    filesCount: {
      type: Number,
    },

    createdBy: {
      type: Schema.Types.Mixed,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "archives" }
);

export const ArchiveModel =
  models.Archive || model("Archive", ArchiveSchema);
