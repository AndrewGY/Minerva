import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Report from "@/models/Report";
import InvestigationReport from "@/models/InvestigationReport";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const lastYearStart = new Date(thisYear - 1, 0, 1);
    const lastYearEnd = new Date(thisYear - 1, 11, 31);

    const allReports = await Report.find({}).lean();
    
    const thisYearReports = allReports.filter(r => new Date(r.incidentDate).getFullYear() === thisYear);
    const thisMonthReports = allReports.filter(r => {
      const date = new Date(r.incidentDate);
      return date.getFullYear() === thisYear && date.getMonth() === thisMonth;
    });
    const resolvedReports = allReports.filter(r => r.status === 'RESOLVED');
    
    const majorIncidents = allReports.filter(r => r.severityLevel === 'CRITICAL').sort((a, b) => 
      new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
    );
    const lastMajorIncident = majorIncidents[0];
    const daysSinceLastMajor = lastMajorIncident 
      ? Math.floor((now.getTime() - new Date(lastMajorIncident.incidentDate).getTime()) / (1000 * 60 * 60 * 24))
      : 365;

    // Debug logging for header stats
    console.log('=== DEBUG HEADER STATS ===');
    console.log(`Total reports: ${allReports.length}`);
    console.log(`Resolved reports: ${resolvedReports.length}`);
    console.log(`Critical incidents: ${majorIncidents.length}`);
    console.log(`Last major incident:`, lastMajorIncident ? {
      id: lastMajorIncident.publicId,
      date: lastMajorIncident.incidentDate,
      severity: lastMajorIncident.severityLevel
    } : 'None');
    console.log(`Days since last major: ${daysSinceLastMajor}`);

    const lastYearReports = allReports.filter(r => {
      const date = new Date(r.incidentDate);
      return date >= lastYearStart && date <= lastYearEnd;
    });
    const reductionPercentage = lastYearReports.length > 0 
      ? ((lastYearReports.length - thisYearReports.length) / lastYearReports.length) * 100
      : 0;

    // Get actual published investigation reports
    const publishedReports = await InvestigationReport.find({ 
      status: 'PUBLISHED'
    })
    .sort({ publishedAt: -1 })
    .limit(10)
    .lean();

    // Get investigation stats
    const allInvestigationReports = await InvestigationReport.find({}).lean();
    const completedInvestigations = allInvestigationReports.filter(r => r.status === 'PUBLISHED' || r.status === 'APPROVED').length;
    const ongoingInvestigations = allInvestigationReports.filter(r => r.status === 'DRAFT' || r.status === 'UNDER_REVIEW').length;

    // Calculate incidents with completed investigations
    const reportsWithCompletedInvestigations = allReports.filter(report => {
      // Check if this report has a completed investigation
      const hasCompletedInvestigation = allInvestigationReports.some(investigation => 
        investigation.originalReportId?.toString() === report._id.toString() && 
        (investigation.status === 'PUBLISHED' || investigation.status === 'APPROVED')
      );
      return hasCompletedInvestigation;
    });

    const investigationCompletionRate = allReports.length > 0 
      ? (reportsWithCompletedInvestigations.length / allReports.length) * 100 
      : 0;

    console.log(`Reports with completed investigations: ${reportsWithCompletedInvestigations.length} out of ${allReports.length}`);
    console.log(`Investigation completion rate: ${investigationCompletionRate.toFixed(2)}%`);

    const severityCounts = {
      LOW: allReports.filter(r => r.severityLevel === 'LOW').length,
      MEDIUM: allReports.filter(r => r.severityLevel === 'MEDIUM').length,
      HIGH: allReports.filter(r => r.severityLevel === 'HIGH').length,
      CRITICAL: allReports.filter(r => r.severityLevel === 'CRITICAL').length,
    };

    const typeCounts = allReports.reduce((acc, report) => {
      const type = report.incidentType || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate monthly trends across all years, not just current year
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const monthReports = allReports.filter(r => {
        const reportDate = new Date(r.incidentDate);
        return reportDate.getMonth() === i;
      });
      return {
        month: new Date(thisYear, i, 1).toLocaleString('default', { month: 'short' }),
        incidents: monthReports.length,
        resolved: monthReports.filter(r => r.status === 'RESOLVED').length,
      };
    });

    const regionCounts = allReports.reduce((acc, report) => {
      const address = report.location?.address || '';
      let region = 'Other';
      if (address.includes('Georgetown')) region = 'Georgetown';
      else if (address.includes('New Amsterdam')) region = 'New Amsterdam';
      else if (address.includes('Linden')) region = 'Linden';
      else if (address.includes('Anna Regina')) region = 'Anna Regina';
      else if (address.includes('Bartica')) region = 'Bartica';
      else if (address.includes('Berbice')) region = 'Berbice';
      
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const investigationOutcomes = {
      'Human Error': resolvedReports.filter(r => 
        r.incidentType?.toLowerCase().includes('error') ||
        r.description?.toLowerCase().includes('human') ||
        r.description?.toLowerCase().includes('mistake') ||
        r.description?.toLowerCase().includes('training')
      ).length,
      'Equipment Failure': resolvedReports.filter(r => 
        r.incidentType?.toLowerCase().includes('equipment') ||
        r.incidentType?.toLowerCase().includes('machinery') ||
        r.description?.toLowerCase().includes('equipment') ||
        r.description?.toLowerCase().includes('machine') ||
        r.description?.toLowerCase().includes('malfunction')
      ).length,
      'Process Gap': resolvedReports.filter(r => 
        r.incidentType?.toLowerCase().includes('process') ||
        r.incidentType?.toLowerCase().includes('procedure') ||
        r.description?.toLowerCase().includes('process') ||
        r.description?.toLowerCase().includes('procedure') ||
        r.description?.toLowerCase().includes('protocol')
      ).length,
      'Environmental': resolvedReports.filter(r => 
        r.incidentType?.toLowerCase().includes('environmental') ||
        r.incidentType?.toLowerCase().includes('chemical') ||
        r.description?.toLowerCase().includes('environment') ||
        r.description?.toLowerCase().includes('chemical') ||
        r.description?.toLowerCase().includes('weather')
      ).length,
      'Other': 0,
    };
    
    const categorizedCount = investigationOutcomes['Human Error'] + 
                           investigationOutcomes['Equipment Failure'] + 
                           investigationOutcomes['Process Gap'] + 
                           investigationOutcomes['Environmental'];
    investigationOutcomes['Other'] = resolvedReports.length - categorizedCount;

    const reporterTypes = allReports.reduce((acc, report) => {
      const type = report.isAnonymous ? 'Anonymous' : 
                  report.reporterEmail?.includes('@') ? 'Registered User' : 'Anonymous';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReporters = Object.entries(reporterTypes).map(([type, count]) => ({
      reporterType: type,
      count,
      percentage: (count / allReports.length) * 100
    }));

    const industryCounts = allReports.reduce((acc, report) => {
      const industry = report.industry || 'other';
      if (!acc[industry]) {
        acc[industry] = {
          total: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
          resolved: 0,
          thisYear: 0,
          lastYear: 0,
        };
      }
      acc[industry].total++;
      acc[industry][report.severityLevel?.toLowerCase() || 'medium']++;
      if (report.status === 'RESOLVED') acc[industry].resolved++;
      
      const reportYear = new Date(report.incidentDate).getFullYear();
      if (reportYear === thisYear) acc[industry].thisYear++;
      if (reportYear === thisYear - 1) acc[industry].lastYear++;
      
      return acc;
    }, {} as Record<string, any>);

    const yearlyTrends = [];
    for (let i = 4; i >= 0; i--) {
      const year = thisYear - i;
      const yearReports = allReports.filter(r => new Date(r.incidentDate).getFullYear() === year);
      const criticalCount = yearReports.filter(r => r.severityLevel === 'CRITICAL').length;
      
      yearlyTrends.push({
        year,
        fatalities: criticalCount,
        incidents: yearReports.length,
      });
    }

    const investigationPipeline = {
      new: allReports.filter(r => r.status === 'RECEIVED').length,
      investigating: allReports.filter(r => r.status === 'UNDER_REVIEW').length,
      pendingReview: allReports.filter(r => r.status === 'VERIFIED').length,
      actionRequired: allReports.filter(r => r.status === 'VERIFIED' && r.severityLevel === 'HIGH').length,
      closed: allReports.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED').length,
    };

    const sourceCounts = allReports.reduce((acc, report) => {
      let channel = 'Online Portal'; // Default for regular form submissions
      
      // Check both source and metadata.source for actual values stored in database
      if (report.source === 'Whatsapp') {
        channel = 'WhatsApp';
      } else if (report.source === 'facebook') {
        channel = 'Facebook';
      } else if (report.source === 'news') {
        channel = 'News Articles';
      } else if (report.metadata?.source === 'news_scraper') {
        channel = 'News Articles';
      } else if (report.metadata?.source === 'external_api') {
        channel = 'External API';
      } else if (report.metadata?.source === 'phone') {
        channel = 'Phone Hotline';
      } else if (report.metadata?.source === 'email') {
        channel = 'Email';
      } else if (report.metadata?.source === 'walk_in') {
        channel = 'Walk-in';
      } else if (report.metadata?.source === 'mobile_app') {
        channel = 'Mobile App';
      }
      // Note: Regular form submissions have no source, so they default to 'Online Portal'
      
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const heatmapData = allReports
      .filter(r => {
        // Handle both location formats: {lat, lng} and {latitude, longitude}
        const lat = r.location?.lat || r.location?.latitude;
        const lng = r.location?.lng || r.location?.longitude;
        const hasValidLocation = lat && lng && 
               typeof lat === 'number' && typeof lng === 'number' &&
               lat !== 0 && lng !== 0 &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
        

        
        return hasValidLocation;
      })
      .map(r => {
        // Normalize to lat/lng format for the heatmap
        const lat = r.location?.lat || r.location?.latitude;
        const lng = r.location?.lng || r.location?.longitude;
        return {
          location: {
            lat: lat,
            lng: lng,
          },
          severityLevel: r.severityLevel || 'MEDIUM',
          incidentType: r.incidentType || 'Unknown',
        };
      });



    const analyticsData = {
      public: {
        publishedReports: publishedReports.map(r => ({
          _id: r._id.toString(),
          title: r.title || 'Investigation Report',
          publishedAt: r.publishedAt || r.createdAt,
          publicId: r.publicId,
          summary: r.incidentCause?.substring(0, 150) + '...' || 'Investigation completed',
          location: r.employerInfo?.address?.city || 'Unknown',
          industry: r.employerInfo?.industry || 'Unknown',
        })),
        topReporters,
        totalIncidents: {
          thisYear: allReports.length, // Show all reports, not just current year
          thisMonth: thisMonthReports.length,
          totalResolved: reportsWithCompletedInvestigations.length,
          percentageResolved: Math.round(investigationCompletionRate), // Based on completed investigations
          daysSinceLastMajor,
        },
        incidentsBySeverity: Object.entries(severityCounts).map(([level, count]) => ({
          severity: level,
          count,
          percentage: allReports.length > 0 ? (count / allReports.length) * 100 : 0,
        })),
        incidentsByType: Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([type, count]) => ({
            type: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
            count,
          })),
        monthlyTrends,
        incidentsByRegion: Object.entries(regionCounts).map(([region, count]) => ({
          region,
          count,
          severity: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
        })),
        investigationOutcomes: Object.entries(investigationOutcomes).map(([outcome, count]) => ({
          outcome,
          count,
          percentage: resolvedReports.length > 0 ? (count / resolvedReports.length) * 100 : 0,
        })),
        geographic: {
          heatmapData: heatmapData,
        },
        outcomes: {
          investigationStats: {
            completed: completedInvestigations,
            ongoing: ongoingInvestigations,
          },
          resolutionRate: allReports.length > 0 ? Math.round((resolvedReports.length / allReports.length) * 100) : 0,
          avgInvestigationTime: 0,
        },
      },
      industry: {
        topCauses: Object.entries(typeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cause, count]) => ({
            cause: cause.charAt(0).toUpperCase() + cause.slice(1).replace('-', ' '),
            count,
          })),
        regionalDensity: Object.entries(regionCounts).map(([region, incidents]) => ({
          region,
          incidents,
          density: incidents > 20 ? 'High' : incidents > 10 ? 'Medium' : 'Low',
        })),
      },
      policy: {
        nationalMetrics: {
          accidentRate: allReports.length, // Show all reports
          yoyChange: reductionPercentage,
        },
        investigationPipeline: [
          { status: 'New Reports', count: investigationPipeline.new, color: 'bg-blue-500', description: 'Awaiting initial review' },
          { status: 'Under Investigation', count: investigationPipeline.investigating, color: 'bg-yellow-500', description: 'Active investigations' },
          { status: 'Pending Review', count: investigationPipeline.pendingReview, color: 'bg-orange-500', description: 'Awaiting management review' },
          { status: 'Action Required', count: investigationPipeline.actionRequired, color: 'bg-red-500', description: 'Enforcement actions needed' },
          { status: 'Closed', count: investigationPipeline.closed, color: 'bg-green-500', description: 'Completed investigations' },
        ],
        publicEngagement: {
          publicReports: completedInvestigations,
          citizenReports: allReports.length, // Show all citizen reports, not just this month
          channels: Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([channel, reports]) => ({
              channel,
              reports,
              percentage: allReports.length > 0 ? Math.round((reports / allReports.length) * 100) : 0,
            })),
        },
      },
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}