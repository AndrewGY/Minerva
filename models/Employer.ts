import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployer extends Document {
  name: string;
  registrationNumber?: string;
  industry: string;
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  address: {
    street?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };
  primaryContact: {
    name?: string;
    position?: string;
    email?: string;
    phone?: string;
  };
  complianceStatus?: 'compliant' | 'non-compliant' | 'pending';
  riskScore?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployerSchema = new Schema<IEmployer>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  registrationNumber: {
    type: String,
    trim: true,
  },
  industry: {
    type: String,
    required: true,
    enum: [
      'mining',
      'construction',
      'manufacturing',
      'oil-gas',
      'healthcare',
      'transportation',
      'agriculture',
      'retail',
      'technology',
      'education',
      'hospitality',
      'utilities',
      'other'
    ],
  },
  companySize: {
    type: String,
    required: true,
    enum: ['small', 'medium', 'large', 'enterprise'],
  },
  address: {
    street: { type: String },
    city: { type: String },
    region: { type: String },
    country: { type: String, default: 'Guyana' },
    postalCode: { type: String },
  },
  primaryContact: {
    name: { type: String },
    position: { type: String },
    email: { 
      type: String,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: { type: String },
  },
  complianceStatus: {
    type: String,
    enum: ['compliant', 'non-compliant', 'pending'],
    default: 'pending',
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Add indexes for performance
EmployerSchema.index({ name: 1 });
EmployerSchema.index({ industry: 1 });
EmployerSchema.index({ active: 1 });

const Employer = mongoose.models.Employer || mongoose.model<IEmployer>('Employer', EmployerSchema);

export default Employer;