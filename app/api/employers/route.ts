import { NextRequest, NextResponse } from "next/server";
import { checkAuthSession } from "@/lib/auth-check";
import connectToDatabase from "@/lib/mongodb";
import Employer from "@/models/Employer";
import { z } from "zod";

// Validation schema for creating employer
const createEmployerSchema = z.object({
  name: z.string().min(1, "Company name is required"),
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
  ]),
  companySize: z.enum(['small', 'medium', 'large', 'enterprise']),
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
});

// GET /api/employers - Get all employers (requires authentication)
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAuthSession();
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    await connectToDatabase();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get('active');
    const industry = searchParams.get('industry');
    const search = searchParams.get('search');
    
    // Build query
    const query: any = {};
    if (active !== null) {
      query.active = active === 'true';
    }
    if (industry) {
      query.industry = industry;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const employers = await Employer.find(query)
      .sort({ name: 1 })
      .select('-__v');

    return NextResponse.json(employers);
  } catch (error) {
    console.error("Failed to fetch employers:", error);
    return NextResponse.json(
      { error: "Failed to fetch employers" },
      { status: 500 }
    );
  }
}

// POST /api/employers - Create new employer (requires admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAuthSession("ADMIN");
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = createEmployerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if employer already exists
    const existingEmployer = await Employer.findOne({ 
      name: { $regex: `^${validationResult.data.name}$`, $options: 'i' } 
    });
    
    if (existingEmployer) {
      return NextResponse.json(
        { error: "Employer with this name already exists" },
        { status: 409 }
      );
    }

    // Create new employer
    const employer = new Employer({
      ...validationResult.data,
      address: validationResult.data.address || {},
      primaryContact: validationResult.data.primaryContact || {},
      active: true,
      riskScore: 0,
    });

    await employer.save();

    return NextResponse.json(employer, { status: 201 });
  } catch (error) {
    console.error("Failed to create employer:", error);
    return NextResponse.json(
      { error: "Failed to create employer" },
      { status: 500 }
    );
  }
}