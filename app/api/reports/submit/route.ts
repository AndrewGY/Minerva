import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";
import { validateHSSEIncident } from "@/lib/openai-validator";
import { z } from "zod";

const externalReportSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  article_url: z.string().url().optional(),
  phone_number: z.string().optional(),
});

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Authenticate using SCRAPER_API_KEY
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== SCRAPER_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type');
    let parsedData;
    let uploadedFile = null;

    // Handle multipart/form-data for image uploads
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Extract JSON data from form
      const jsonData = formData.get('data') as string;
      if (!jsonData) {
        return NextResponse.json(
          { error: 'Missing data field in form' },
          { status: 400 }
        );
      }

      try {
        parsedData = JSON.parse(jsonData);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid JSON in data field' },
          { status: 400 }
        );
      }

      // Handle file upload if present
      const file = formData.get('image') as File;
      if (file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only JPEG, JPG, PNG, and GIF are allowed' },
            { status: 400 }
          );
        }

        if (file.size > maxSize) {
          return NextResponse.json(
            { error: 'File too large. Maximum size is 10MB' },
            { status: 400 }
          );
        }

        // Save the uploaded file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        const fileName = `${timestamp}-${random}.${extension}`;
        
        const filePath = join(uploadsDir, fileName);
        await writeFile(filePath, buffer);

        uploadedFile = {
          url: `/uploads/${fileName}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        };
      }
    } else {
      // Handle JSON requests
      parsedData = await request.json();
    }

    // Validate the request data
    const validatedData = externalReportSchema.parse(parsedData);

    // Use OpenAI to validate if this is a genuine HSSE incident
    const validation = await validateHSSEIncident(
      `External Report: ${validatedData.description.substring(0, 100)}`,
      validatedData.description
    );

    if (!validation.isValid) {
      return NextResponse.json({
        accepted: false,
        reason: validation.reason,
        confidence: validation.confidence,
      }, { status: 200 });
    }

    // Connect to database
    await connectToDatabase();

    // Prepare report data
    const incidentDate = new Date(validatedData.date);
    const attachments = [];

    // Add uploaded file as attachment if present
    if (uploadedFile) {
      attachments.push(uploadedFile);
    }

    const reportData = {
      incidentDate,
      location: {
        address: validatedData.location.address,
        lat: validatedData.location.lat || 0,
        lng: validatedData.location.lng || 0,
      },
      description: validatedData.description,
      incidentType: validation.incidentType || 'other',
      severityLevel: validation.severityLevel,
      isAnonymous: !validatedData.phone_number, // If phone provided, not anonymous
      reporterPhone: validatedData.phone_number || undefined,
      status: 'RECEIVED',
      attachments,
      metadata: {
        source: 'external_api',
        articleUrl: validatedData.article_url,
        validationConfidence: validation.confidence,
        validationReason: validation.reason,
        submittedVia: 'external_api',
      },
    };

    // Create the report
    const report = await Report.create(reportData);

    console.log(`External report created: ${report.publicId} (${validation.incidentType})`);

    return NextResponse.json({
      success: true,
      accepted: true,
      publicId: report.publicId,
      message: 'Report submitted successfully',
      validation: {
        confidence: validation.confidence,
        reason: validation.reason,
        incidentType: validation.incidentType,
        severityLevel: validation.severityLevel,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("External report submission failed:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid data provided",
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "External Report Submission API",
    version: "1.0",
    endpoints: {
      POST: {
        description: "Submit a report from external applications",
        authentication: "x-api-key header with SCRAPER_API_KEY",
        required_fields: ["description", "location", "date"],
        optional_fields: ["article_url", "phone_number", "image"],
        content_types: ["application/json", "multipart/form-data"]
      }
    }
  });
} 