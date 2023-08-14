import mongoose from "mongoose";

const { Schema } = mongoose;

const tokenSchema = Schema(
  {
    userId: { type: mongoose.SchemaTypes.ObjectId, ref: "User" },
    token: { type: String, required: true },
  },
  {
    timestamp: true,
  }
);

export default mongoose.model("RefreshToken", tokenSchema, "token");
