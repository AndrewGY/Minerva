import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICircleAnnotation {
  id: string;
  x: number;
  y: number;
  radius: number;
  normalizedX: number;
  normalizedY: number;
  normalizedRadius: number;
}

export interface IAttachment {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  annotations?: ICircleAnnotation[];
}

export interface ILocation {
  lat?: number;
  lng?: number;
  latitude?: number;  // Alternative format for WhatsApp/external sources
  longitude?: number; // Alternative format for WhatsApp/external sources
  address?: string;
  name?: string;
}

export interface IReport extends Document {
  publicId: string;
  incidentDate: Date;
  location: ILocation;
  industry?: string;
  siteLocation?: string;
  incidentType: string;
  regulationBreached?: string;
  severityLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reporterId?: mongoose.Types.ObjectId;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'VERIFIED' | 'RESOLVED' | 'CLOSED';
  assignedOfficerId?: mongoose.Types.ObjectId;
  attachments: IAttachment[];
  employerId?: mongoose.Types.ObjectId;
  source?: string; // For WhatsApp and other direct source integrations
  metadata?: {
    source?: string;
    articleUrl?: string;
    postUrl?: string;
    validationConfidence?: number;
    validationReason?: string;
    imagePaths?: string[];
  };
  isVerified?: boolean; // For external sources verification
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const circleAnnotationSchema = new Schema<ICircleAnnotation>({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  radius: { type: Number, required: true },
  normalizedX: { type: Number, required: true },
  normalizedY: { type: Number, required: true },
  normalizedRadius: { type: Number, required: true },
});

const attachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  annotations: { type: [circleAnnotationSchema], default: [] },
});

const locationSchema = new Schema<ILocation>({
  lat: { type: Number, required: false },
  lng: { type: Number, required: false },
  latitude: { type: Number, required: false },  // Alternative format
  longitude: { type: Number, required: false }, // Alternative format
  address: { type: String, required: false },
  name: { type: String, required: false },
});

const reportSchema = new Schema<IReport>(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      default: () => `HSSE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
    },
    incidentDate: {
      type: Date,
      required: true,
    },
    location: {
      type: locationSchema,
      required: true,
    },
    industry: String,
    siteLocation: String,
    incidentType: {
      type: String,
      required: true,
    },
    regulationBreached: String,
    severityLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reporterEmail: String,
    reporterPhone: String,
    employerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employer',
    },
    isAnonymous: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['RECEIVED', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED', 'CLOSED'],
      default: 'RECEIVED',
    },
    assignedOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    attachments: [attachmentSchema],
    source: String, // For WhatsApp and other direct source integrations
    metadata: {
      source: String,
      articleUrl: String,
      postUrl: String,
      validationConfidence: Number,
      validationReason: String,
      imagePaths: [String],
    },
    isVerified: { type: Boolean, default: false },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
reportSchema.index({ status: 1, severityLevel: 1 });
reportSchema.index({ incidentDate: -1 });
reportSchema.index({ publicId: 1 });
reportSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Force recompilation of model to pick up schema changes
if (mongoose.models.Report) {
  delete mongoose.models.Report;
}

const Report: Model<IReport> = mongoose.model<IReport>('Report', reportSchema);

export default Report;