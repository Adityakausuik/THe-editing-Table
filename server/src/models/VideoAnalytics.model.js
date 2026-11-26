import { Schema, model } from '../db/modelSchema.js';

const videoAnalyticsSchema = new Schema({
  videoId: {
    type: Schema.Types.ObjectId,
    ref: "VideoShowcaseItem",
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ["impression", "play", "complete", "cta_click"],
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  deviceType: {
    type: String,
    trim: true
  },
  browser: {
    type: String,
    trim: true
  },
  operatingSystem: {
    type: String,
    trim: true
  },
  referrer: {
    type: String,
    trim: true
  },
  ipHash: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

videoAnalyticsSchema.index({ videoId: 1, eventType: 1, createdAt: -1 });
videoAnalyticsSchema.index({ eventType: 1, createdAt: -1 });
videoAnalyticsSchema.index({ sessionId: 1, videoId: 1 });

const VideoAnalytics =
  model("VideoAnalytics", videoAnalyticsSchema, "videoanalytics");

export default VideoAnalytics;
