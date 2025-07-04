import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";
import { z } from "zod";

const schema = z.object({
  incidentDate: z.string().transform(str => new Date(str)),
  location: z.object({
    address: z.string().min(5),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  industry: z.string().optional(),
  incidentType: z.string().optional(),
  regulationBreached: z.string().optional(),
  severityLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(20),
  reporterEmail: z.string().email().optional().or(z.literal("")),
  reporterPhone: z.string().optional(),
  isAnonymous: z.boolean(),
  attachments: z.array(z.object({
    url: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    annotations: z.array(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      radius: z.number(),
      normalizedX: z.number(),
      normalizedY: z.number(),
      normalizedRadius: z.number(),
    })).default([]),
  })).optional(),
  recaptchaToken: z.string().min(1),
});

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.error('reCAPTCHA secret not configured');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Temporarily bypass reCAPTCHA verification
    if (data.recaptchaToken !== "temp-disabled") {
      const isValid = await verifyRecaptcha(data.recaptchaToken);
      if (!isValid) {
        return NextResponse.json({ error: "Verification failed" }, { status: 400 });
      }
    }

    await connectToDatabase();

    const location = {
      lat: data.location.lat || 0,
      lng: data.location.lng || 0,
      address: data.location.address,
    };

    const reportData = {
      incidentDate: data.incidentDate,
      location,
      industry: data.industry,
      incidentType: data.incidentType || "other",
      regulationBreached: data.regulationBreached,
      severityLevel: data.severityLevel,
      description: data.description,
      isAnonymous: data.isAnonymous,
      attachments: data.attachments || [],
      status: "RECEIVED",
    };

    if (!data.isAnonymous) {
      if (data.reporterEmail) {
        (reportData as any).reporterEmail = data.reporterEmail;
      }
      if (data.reporterPhone) {
        (reportData as any).reporterPhone = data.reporterPhone;
      }
    }

    const report = await Report.create(reportData);

    console.log(`Report created: ${report.publicId} (${data.severityLevel})`);

    if (data.severityLevel === "CRITICAL") {
      console.log(`CRITICAL ALERT: ${report.publicId}`);
    }

    return NextResponse.json({
      message: "Report submitted",
      publicId: report.publicId,
      status: report.status,
    });

  } catch (error) {
    console.error("Report creation failed:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (publicId) {
      await connectToDatabase();
      
      const report = await Report.findOne(
        { publicId },
        {
          publicId: 1,
          status: 1,
          incidentType: 1,
          severityLevel: 1,
          createdAt: 1,
          resolvedAt: 1,
        }
      );

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      return NextResponse.json({
        publicId: report.publicId,
        status: report.status,
        incidentType: report.incidentType,
        severityLevel: report.severityLevel,
        submittedAt: report.createdAt,
        resolvedAt: report.resolvedAt,
      });
    }

    await connectToDatabase();
    
    const totalReports = await Report.countDocuments();
    const recentReports = await Report.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const byStatus = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const bySeverity = await Report.aggregate([
      { $group: { _id: "$severityLevel", count: { $sum: 1 } } }
    ]);

    return NextResponse.json({
      totalReports,
      recentReports,
      byStatus,
      bySeverity,
    });

  } catch (error) {
    console.error("Fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}