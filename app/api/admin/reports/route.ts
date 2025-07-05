import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      reports,
      total: reports.length
    });

  } catch (error) {
    console.error("Admin reports fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}