import mongoose from "mongoose";

const adminActivityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  action: {
    type: String,
    enum: [
      "CREATE_VIDEO",
      "UPDATE_VIDEO",
      "DELETE_VIDEO",
      "PERMANENT_DELETE_VIDEO",
      "RESTORE_VIDEO",
      "REORDER_VIDEOS",
      "CREATE_PHOTO",
      "UPDATE_PHOTO",
      "DELETE_PHOTO",
      "PERMANENT_DELETE_PHOTO",
      "RESTORE_PHOTO",
      "REORDER_PHOTOS",
      "CHANGE_STATUS",
      "CHANGE_FEATURED",
      "UPDATE_SETTINGS",
      "BULK_ACTION"
    ],
    required: true
  },
  entityType: {
    type: String,
    default: "VideoShowcase"
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  changes: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const AdminActivityLog =
  mongoose.models.AdminActivityLog ||
  mongoose.model("AdminActivityLog", adminActivityLogSchema);

export default AdminActivityLog;
