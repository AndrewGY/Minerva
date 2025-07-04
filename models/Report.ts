import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAttachment {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface ILocation {
  lat: number;
  lng: number;
  address: string;
}

export interface IReport extends Document {
  publicId: string;
  incidentDate: Date;
  location: ILocation;
  industry?: string;
  siteLocation?: string;
  incidentType: string;
  regulationBreached?: string;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reporterId?: mongoose.Types.ObjectId;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  status: 'RECEIVED' | 'UNDER_REVIEW' | 'VERIFIED' | 'RESOLVED' | 'CLOSED';
  assignedOfficerId?: mongoose.Types.ObjectId;
  attachments: IAttachment[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const attachmentSchema = new Schema<IAttachment>({
  url: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
});

const locationSchema = new Schema<ILocation>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  address: { type: String, required: true },
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
      required: true,
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

const Report: Model<IReport> = mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);

export default Report;