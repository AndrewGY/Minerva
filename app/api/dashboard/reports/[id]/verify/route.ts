import { NextRequest, NextResponse } from "next/server";
import { checkAuthSession } from "@/lib/auth-check";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await checkAuthSession("ADMIN");
    
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = params;
    const body = await request.json();
    const { incidentType, severityLevel, incidentDate, location } = body;

    // Validate required fields
    if (!incidentType || !severityLevel || !incidentDate || !location?.address) {
      return NextResponse.json(
        { error: "Missing required verification fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find and update the report
    const updatedReport = await Report.findByIdAndUpdate(
      id,
      {
        $set: {
          incidentType,
          severityLevel,
          incidentDate: new Date(incidentDate),
          location: {
            address: location.address,
            lat: location.lat || 0,
            lng: location.lng || 0
          },
          isVerified: true,
          status: 'VERIFIED'
        }
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Report verified successfully",
      report: updatedReport 
    });

  } catch (error) {
    console.error("Report verification failed:", error);
    return NextResponse.json(
      { error: "Failed to verify report" },
      { status: 500 }
    );
  }
} 