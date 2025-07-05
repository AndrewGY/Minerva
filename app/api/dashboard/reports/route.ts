import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    
    // TODO: maybe add pagination here instead of just limiting to 100
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      reports,
      total: reports.length
    });

  } catch (error) {
    console.error("Dashboard reports fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}