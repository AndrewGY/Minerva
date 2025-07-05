import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICasualty {
  name: string;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  position?: string;
  department?: string;
  employeeId?: string;
  status: 'INJURED' | 'HOSPITALIZED' | 'DECEASED' | 'MISSING' | 'UNHARMED';
  injuryType?: string;
  injurySeverity?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  causeOfDeath?: string;
  hospitalName?: string;
  treatmentDetails?: string;
  contactNumber?: string;
  nextOfKinName?: string;
  nextOfKinContact?: string;
  notes?: string;
}

export interface IEmployerInfo {
  employerId?: mongoose.Types.ObjectId; // Reference to Employer model
  companyName: string;
  companyRegistrationNumber?: string;
  industry: string;
  companySize: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'; // <50, 50-249, 250-999, 1000+
  primaryContact: {
    name: string;
    position: string;
    email: string;
    phone: string;
  };
  safetyOfficer?: {
    name: string;
    position: string;
    email: string;
    phone: string;
    certifications?: string[];
  };
  address: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode?: string;
  };
  previousIncidents?: number;
  lastSafetyAuditDate?: Date;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  notes?: string;
}

export interface IInvestigationReport extends Document {
  publicId: string;
  originalReportId: mongoose.Types.ObjectId;
  investigatorId: mongoose.Types.ObjectId;
  title: string;
  
  // Employer Information
  employerInfo: IEmployerInfo;
  
  // Investigation Overview
  investigationStartDate: Date;
  investigationEndDate?: Date;
  incidentCause: string;
  rootCauses: string[];
  contributingFactors: string[];
  
  // People Affected
  totalPeopleAffected: number;
  casualties: ICasualty[];
  
  // Investigation Details
  investigationMethod: string;
  evidenceCollected: string[];
  attachments: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    annotations: Array<{
      id: string;
      x: number;
      y: number;
      radius: number;
      normalizedX: number;
      normalizedY: number;
      normalizedRadius: number;
    }>;
  }>;
  witnessStatements: string[];
  expertConsultations: string[];
  
  // Environmental Impact
  environmentalDamage?: string;
  cleanupRequired?: boolean;
  cleanupStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  estimatedCleanupCost?: number;
  
  // Financial Impact  
  estimatedDirectCosts?: number;
  estimatedIndirectCosts?: number;
  insuranceClaim?: boolean;
  claimAmount?: number;
  
  // Regulatory
  regulatoryNotificationRequired: boolean;
  regulatoryBodiesNotified: string[];
  complianceIssues: string[];
  
  // Recommendations
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  preventiveMeasures: string[];
  
  // Status and Timeline
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED';
  reviewedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  
  // Attachments
  attachments: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    category: 'EVIDENCE' | 'PHOTOS' | 'DOCUMENTS' | 'REPORTS' | 'OTHER';
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const casualtySchema = new Schema<ICasualty>({
  name: { type: String, required: true },
  age: Number,
  gender: {
    type: String,
    enum: ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'],
  },
  position: String,
  department: String,
  employeeId: String,
  status: {
    type: String,
    enum: ['INJURED', 'HOSPITALIZED', 'DECEASED', 'MISSING', 'UNHARMED'],
    required: true,
  },
  injuryType: String,
  injurySeverity: {
    type: String,
    enum: ['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'],
  },
  causeOfDeath: String,
  hospitalName: String,
  treatmentDetails: String,
  contactNumber: String,
  nextOfKinName: String,
  nextOfKinContact: String,
  notes: String,
});

const employerInfoSchema = new Schema<IEmployerInfo>({
  employerId: {
    type: Schema.Types.ObjectId,
    ref: 'Employer',
  },
  companyName: { type: String, required: true },
  companyRegistrationNumber: String,
  industry: { type: String, required: true },
  companySize: {
    type: String,
    enum: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
    required: true,
  },
  primaryContact: {
    name: { type: String, required: true },
    position: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  safetyOfficer: {
    name: String,
    position: String,
    email: String,
    phone: String,
    certifications: [String],
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    region: { type: String, required: true },
    country: { type: String, required: true, default: 'Guyana' },
    postalCode: String,
  },
  previousIncidents: { type: Number, default: 0 },
  lastSafetyAuditDate: Date,
  complianceStatus: {
    type: String,
    enum: ['COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW'],
    required: true,
    default: 'UNDER_REVIEW',
  },
  insuranceProvider: String,
  insurancePolicyNumber: String,
  notes: String,
});

const investigationReportSchema = new Schema<IInvestigationReport>(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      default: () => `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
    },
    originalReportId: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    investigatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    
    // Employer Information
    employerInfo: {
      type: employerInfoSchema,
      required: true,
    },
    
    // Investigation Overview
    investigationStartDate: {
      type: Date,
      required: true,
    },
    investigationEndDate: Date,
    incidentCause: {
      type: String,
      required: true,
    },
    rootCauses: [String],
    contributingFactors: [String],
    
    // People Affected
    totalPeopleAffected: {
      type: Number,
      required: true,
      default: 0,
    },
    casualties: [casualtySchema],
    
    // Investigation Details
    investigationMethod: {
      type: String,
      required: true,
    },
    evidenceCollected: [String],
    attachments: [{
      url: { type: String, required: true },
      fileName: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
      annotations: [{
        id: { type: String, required: true },
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        radius: { type: Number, required: true },
        normalizedX: { type: Number, required: true },
        normalizedY: { type: Number, required: true },
        normalizedRadius: { type: Number, required: true },
      }],
    }],
    witnessStatements: [String],
    expertConsultations: [String],
    
    // Environmental Impact
    environmentalDamage: String,
    cleanupRequired: Boolean,
    cleanupStatus: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    },
    estimatedCleanupCost: Number,
    
    // Financial Impact
    estimatedDirectCosts: Number,
    estimatedIndirectCosts: Number,
    insuranceClaim: Boolean,
    claimAmount: Number,
    
    // Regulatory
    regulatoryNotificationRequired: {
      type: Boolean,
      default: false,
    },
    regulatoryBodiesNotified: [String],
    complianceIssues: [String],
    
    // Recommendations
    immediateActions: [String],
    shortTermActions: [String],
    longTermActions: [String],
    preventiveMeasures: [String],
    
    // Status
    status: {
      type: String,
      enum: ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED'],
      default: 'DRAFT',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: Date,
    
    // Attachments
    attachments: [{
      url: { type: String, required: true },
      fileName: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
      category: {
        type: String,
        enum: ['EVIDENCE', 'PHOTOS', 'DOCUMENTS', 'REPORTS', 'OTHER'],
        default: 'OTHER',
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
investigationReportSchema.index({ originalReportId: 1 });
investigationReportSchema.index({ investigatorId: 1 });
investigationReportSchema.index({ status: 1 });
investigationReportSchema.index({ investigationStartDate: -1 });
investigationReportSchema.index({ publicId: 1 });
investigationReportSchema.index({ 'employerInfo.companyName': 1 });
investigationReportSchema.index({ 'employerInfo.industry': 1 });
investigationReportSchema.index({ 'employerInfo.complianceStatus': 1 });

// Force recompilation to pick up schema changes  
if (mongoose.models.InvestigationReport) {
  delete mongoose.models.InvestigationReport;
}

const InvestigationReport: Model<IInvestigationReport> = mongoose.model<IInvestigationReport>(
  'InvestigationReport', 
  investigationReportSchema
);

export default InvestigationReport;