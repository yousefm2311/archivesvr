import mongoose from "mongoose";

const getMongoUri = () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set");
  }
  return uri;
};

const getMongoDbName = () => {
  const dbName = process.env.MONGO_DB;
  if (!dbName) {
    throw new Error("MONGO_DB is not set");
  }
  return dbName;
};

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  const uri = getMongoUri();
  await mongoose.connect(uri, {
    dbName: getMongoDbName(),
    maxPoolSize: Number(process.env.MONGO_POOL_MAX ?? 50),
    minPoolSize: Number(process.env.MONGO_POOL_MIN ?? 5),
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT ?? 5000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT ?? 45000),
  });
}

export { mongoose };
