import { NextRequest, NextResponse } from "next/server";
import { checkAuthSession } from "@/lib/auth-check";
import connectToDatabase from "@/lib/mongodb";
import Employer from "@/models/Employer";
import { z } from "zod";

// Validation schema for updating employer
const updateEmployerSchema = z.object({
  name: z.string().min(1).optional(),
  registrationNumber: z.string().optional(),
  industry: z.enum([
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
  ]).optional(),
  companySize: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  primaryContact: z.object({
    name: z.string().optional(),
    position: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
  }).optional(),
  complianceStatus: z.enum(['compliant', 'non-compliant', 'pending']).optional(),
  riskScore: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

// GET /api/employers/[id] - Get employer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await checkAuthSession();
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectToDatabase();
    
    const employer = await Employer.findById(params.id).select('-__v');
    
    if (!employer) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    return NextResponse.json(employer);
  } catch (error) {
    console.error("Failed to fetch employer:", error);
    return NextResponse.json(
      { error: "Failed to fetch employer" },
      { status: 500 }
    );
  }
}

// PATCH /api/employers/[id] - Update employer (requires admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await checkAuthSession("ADMIN");
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateEmployerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if employer exists
    const employer = await Employer.findById(params.id);
    if (!employer) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    // If updating name, check for duplicates
    if (validationResult.data.name && validationResult.data.name !== employer.name) {
      const duplicate = await Employer.findOne({
        _id: { $ne: params.id },
        name: { $regex: `^${validationResult.data.name}$`, $options: 'i' }
      });
      
      if (duplicate) {
        return NextResponse.json(
          { error: "Employer with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update employer
    Object.assign(employer, validationResult.data);
    await employer.save();

    return NextResponse.json(employer);
  } catch (error) {
    console.error("Failed to update employer:", error);
    return NextResponse.json(
      { error: "Failed to update employer" },
      { status: 500 }
    );
  }
}

// DELETE /api/employers/[id] - Delete employer (requires admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await checkAuthSession("ADMIN");
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectToDatabase();

    // Instead of hard delete, we'll soft delete by setting active to false
    const employer = await Employer.findByIdAndUpdate(
      params.id,
      { active: false },
      { new: true }
    );

    if (!employer) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Employer deactivated successfully" });
  } catch (error) {
    console.error("Failed to delete employer:", error);
    return NextResponse.json(
      { error: "Failed to delete employer" },
      { status: 500 }
    );
  }
}