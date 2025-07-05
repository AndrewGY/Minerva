import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';
import InvestigationReport from '@/models/InvestigationReport';
import Employer from '@/models/Employer';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get date ranges
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Basic statistics
    const [
      totalReports,
      todayReports,
      weekReports,
      monthReports,
      yearReports,
      criticalIncidents,
      resolvedReports,
      avgResponseTime
    ] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ createdAt: { $gte: todayStart } }),
      Report.countDocuments({ createdAt: { $gte: weekStart } }),
      Report.countDocuments({ createdAt: { $gte: monthStart } }),
      Report.countDocuments({ createdAt: { $gte: yearStart } }),
      Report.countDocuments({ severityLevel: 'CRITICAL' }),
      Report.countDocuments({ status: 'RESOLVED' }),
      Report.aggregate([
        { $match: { status: 'RESOLVED', resolvedAt: { $exists: true } } },
        {
          $project: {
            responseTime: {
              $subtract: ['$resolvedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ])
    ]);

    // Status distribution
    const statusDistribution = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Severity distribution
    const severityDistribution = await Report.aggregate([
      { $group: { _id: '$severityLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Incident types distribution
    const incidentTypes = await Report.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Monthly trend (last 12 months)
    const monthlyTrend = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'CRITICAL'] }, 1, 0] }
          },
          high: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'HIGH'] }, 1, 0] }
          },
          medium: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'MEDIUM'] }, 1, 0] }
          },
          low: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'LOW'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Daily trend (last 30 days)
    const dailyTrend = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Time of day distribution
    const hourlyDistribution = await Report.aggregate([
      {
        $group: {
          _id: { $hour: '$incidentDate' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Geographic data for heatmap
    const geoData = await Report.find(
      { 
        'location.lat': { $ne: 0 }, 
        'location.lng': { $ne: 0 } 
      },
      {
        'location.lat': 1,
        'location.lng': 1,
        'severityLevel': 1,
        'incidentType': 1,
        'createdAt': 1
      }
    ).lean();

    // Top affected locations
    const topLocations = await Report.aggregate([
      {
        $match: {
          'location.address': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            $substr: ['$location.address', 0, 50]
          },
          count: { $sum: 1 },
          severities: {
            $push: '$severityLevel'
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          location: '$_id',
          count: 1,
          criticalCount: {
            $size: {
              $filter: {
                input: '$severities',
                as: 'severity',
                cond: { $eq: ['$$severity', 'CRITICAL'] }
              }
            }
          }
        }
      }
    ]);

    // Resolution rate by severity
    const resolutionRates = await Report.aggregate([
      {
        $group: {
          _id: '$severityLevel',
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [
                { $in: ['$status', ['RESOLVED', 'CLOSED']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          severity: '$_id',
          total: 1,
          resolved: 1,
          rate: {
            $multiply: [
              { $divide: ['$resolved', '$total'] },
              100
            ]
          }
        }
      }
    ]);

    // Industry breakdown
    const industryBreakdown = await Report.aggregate([
      { 
        $match: { 
          industry: { $exists: true, $ne: null, $ne: '' } 
        } 
      },
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'CRITICAL'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Calculate comparison with last month
    const lastMonthReports = await Report.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const monthOverMonthChange = lastMonthReports > 0 
      ? ((monthReports - lastMonthReports) / lastMonthReports) * 100 
      : 0;

    // Anonymous vs identified reports
    const reporterTypes = await Report.aggregate([
      {
        $group: {
          _id: '$isAnonymous',
          count: { $sum: 1 }
        }
      }
    ]);

    // Employer analytics from investigation reports with real employer data
    const employerStats = await InvestigationReport.aggregate([
      {
        $lookup: {
          from: 'employers',
          localField: 'employerInfo.employerId',
          foreignField: '_id',
          as: 'employer'
        }
      },
      {
        $unwind: {
          path: '$employer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$employer.name', '$employerInfo.companyName']
          },
          totalIncidents: { $sum: 1 },
          criticalIncidents: {
            $sum: {
              $cond: [
                { $eq: ['$severityLevel', 'CRITICAL'] },
                1,
                0
              ]
            }
          },
          industry: { 
            $first: {
              $ifNull: ['$employer.industry', '$employerInfo.industry']
            }
          },
          companySize: { 
            $first: {
              $ifNull: ['$employer.companySize', '$employerInfo.companySize']
            }
          },
          complianceStatus: { 
            $first: {
              $ifNull: ['$employer.complianceStatus', '$employerInfo.complianceStatus']
            }
          },
          riskScore: { 
            $first: {
              $ifNull: ['$employer.riskScore', 0]
            }
          },
          totalCasualties: { $sum: '$totalPeopleAffected' },
          avgFinancialImpact: {
            $avg: {
              $add: [
                { $ifNull: ['$estimatedDirectCosts', 0] },
                { $ifNull: ['$estimatedIndirectCosts', 0] }
              ]
            }
          }
        }
      },
      {
        $addFields: {
          riskScore: {
            $add: [
              { $multiply: ['$criticalIncidents', 10] },
              { $multiply: ['$totalIncidents', 2] },
              { $multiply: ['$totalCasualties', 5] },
              {
                $cond: [
                  { $eq: ['$complianceStatus', 'NON_COMPLIANT'] },
                  20,
                  0
                ]
              }
            ]
          }
        }
      },
      { $sort: { riskScore: -1, totalIncidents: -1 } },
      { $limit: 20 }
    ]);

    // Industry risk analysis with real employer data
    const industryRisk = await InvestigationReport.aggregate([
      {
        $lookup: {
          from: 'employers',
          localField: 'employerInfo.employerId',
          foreignField: '_id',
          as: 'employer'
        }
      },
      {
        $unwind: {
          path: '$employer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$employer.industry', '$employerInfo.industry']
          },
          totalIncidents: { $sum: 1 },
          totalCompanies: { 
            $addToSet: {
              $ifNull: ['$employer.name', '$employerInfo.companyName']
            }
          },
          criticalIncidents: {
            $sum: {
              $cond: [
                { $eq: ['$severityLevel', 'CRITICAL'] },
                1,
                0
              ]
            }
          },
          totalCasualties: { $sum: '$totalPeopleAffected' },
          avgFinancialImpact: {
            $avg: {
              $add: [
                { $ifNull: ['$estimatedDirectCosts', 0] },
                { $ifNull: ['$estimatedIndirectCosts', 0] }
              ]
            }
          }
        }
      },
      {
        $addFields: {
          uniqueCompanies: { $size: '$totalCompanies' },
          incidentRate: {
            $divide: ['$totalIncidents', { $size: '$totalCompanies' }]
          }
        }
      },
      { $sort: { incidentRate: -1 } }
    ]);

    // Compliance distribution with real employer data
    const complianceDistribution = await InvestigationReport.aggregate([
      {
        $lookup: {
          from: 'employers',
          localField: 'employerInfo.employerId',
          foreignField: '_id',
          as: 'employer'
        }
      },
      {
        $unwind: {
          path: '$employer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$employer.complianceStatus', '$employerInfo.complianceStatus']
          },
          count: { $sum: 1 },
          companies: { $addToSet: '$employerInfo.companyName' }
        }
      },
      {
        $addFields: {
          uniqueCompanies: { $size: '$companies' }
        }
      }
    ]);

    const responseData = {
      summary: {
        totalReports,
        todayReports,
        weekReports,
        monthReports,
        yearReports,
        criticalIncidents,
        resolvedReports,
        resolutionRate: totalReports > 0 ? (resolvedReports / totalReports) * 100 : 0,
        avgResponseTimeHours: avgResponseTime[0]?.avgResponseTime 
          ? avgResponseTime[0].avgResponseTime / (1000 * 60 * 60) 
          : 0,
        monthOverMonthChange
      },
      distributions: {
        status: statusDistribution,
        severity: severityDistribution,
        incidentTypes,
        hourly: hourlyDistribution,
        reporterTypes: reporterTypes.map(r => ({
          type: r._id ? 'Anonymous' : 'Identified',
          count: r.count
        })),
        compliance: complianceDistribution
      },
      trends: {
        monthly: monthlyTrend,
        daily: dailyTrend
      },
      geographic: {
        heatmapData: geoData,
        topLocations
      },
      performance: {
        resolutionRates,
        industryBreakdown
      },
      employers: {
        worstPerformers: employerStats,
        industryRisk: industryRisk,
        complianceBreakdown: complianceDistribution
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}