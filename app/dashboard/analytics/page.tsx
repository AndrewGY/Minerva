"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  Calendar,
  MapPin,
  Activity,
  Shield,
  TrendingDown,
  FileText
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  RadarData,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart
} from "recharts";

// Dynamically import Leaflet components to avoid SSR issues
const GuyanaHeatmap = dynamic(() => import("@/components/GuyanaHeatmap"), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-gray-100 animate-pulse rounded-lg" />
});

interface AnalyticsData {
  summary: {
    totalReports: number;
    todayReports: number;
    weekReports: number;
    monthReports: number;
    yearReports: number;
    criticalIncidents: number;
    resolvedReports: number;
    resolutionRate: number;
    avgResponseTimeHours: number;
    monthOverMonthChange: number;
  };
  distributions: {
    status: Array<{ _id: string; count: number }>;
    severity: Array<{ _id: string; count: number }>;
    incidentTypes: Array<{ _id: string; count: number }>;
    hourly: Array<{ _id: number; count: number }>;
    reporterTypes: Array<{ type: string; count: number }>;
  };
  trends: {
    monthly: Array<{
      _id: { year: number; month: number };
      count: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>;
    daily: Array<{
      _id: { year: number; month: number; day: number };
      count: number;
    }>;
  };
  geographic: {
    heatmapData: Array<{
      location: { lat: number; lng: number };
      severityLevel: string;
      incidentType: string;
    }>;
    topLocations: Array<{
      location: string;
      count: number;
      criticalCount: number;
    }>;
  };
  performance: {
    resolutionRates: Array<{
      severity: string;
      total: number;
      resolved: number;
      rate: number;
    }>;
    industryBreakdown: Array<{
      _id: string;
      count: number;
      critical: number;
    }>;
  };
  employers: {
    worstPerformers: Array<{
      _id: string;
      totalIncidents: number;
      criticalIncidents: number;
      industry: string;
      companySize: string;
      complianceStatus: string;
      safetyRating: string;
      totalCasualties: number;
      riskScore: number;
      avgFinancialImpact: number;
    }>;
    industryRisk: Array<{
      _id: string;
      totalIncidents: number;
      uniqueCompanies: number;
      criticalIncidents: number;
      totalCasualties: number;
      incidentRate: number;
      avgFinancialImpact: number;
    }>;
    complianceBreakdown: Array<{
      _id: string;
      count: number;
      uniqueCompanies: number;
    }>;
  };
}

const COLORS = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#059669',
  resolved: '#065f46',
  pending: '#4338ca',
  neutral: '#6b7280',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  gradient: {
    blue: 'from-blue-600 to-blue-700',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600'
  }
};

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    fetchAnalytics();
  }, [session, status, router]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Format data for charts
  const monthlyTrendData = data.trends.monthly.map(item => ({
    month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
    total: item.count,
    critical: item.critical,
    high: item.high,
    medium: item.medium,
    low: item.low
  }));

  const dailyTrendData = data.trends.daily.map(item => ({
    date: `${item._id.day}/${item._id.month}`,
    incidents: item.count
  }));

  const severityData = data.distributions.severity.map(item => ({
    name: item._id,
    value: item.count,
    fill: COLORS[item._id.toLowerCase() as keyof typeof COLORS] || COLORS.neutral
  }));

  const statusData = data.distributions.status.map(item => ({
    name: item._id.replace('_', ' '),
    value: item.count
  }));

  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const found = data.distributions.hourly.find(h => h._id === hour);
    return {
      hour: `${hour}:00`,
      incidents: found?.count || 0
    };
  });

  const incidentTypeData = data.distributions.incidentTypes.map(item => ({
    type: item._id.replace('-', ' ').replace('_', ' '),
    count: item.count
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
              <p className="text-lg text-gray-600 mt-1">Comprehensive insights into HSSE incidents and performance metrics</p>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"></div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Incidents</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{data.summary.totalReports.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">All time records</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">This Month</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{data.summary.monthReports.toLocaleString()}</p>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      data.summary.monthOverMonthChange >= 0 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {data.summary.monthOverMonthChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(data.summary.monthOverMonthChange).toFixed(1)}%
                    </div>
                    <span className="text-sm text-gray-500">vs last month</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Critical Incidents</p>
                  <p className="text-3xl font-bold text-red-600 mb-1">{data.summary.criticalIncidents.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Immediate attention required</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Resolution Rate</p>
                  <p className="text-3xl font-bold text-green-600 mb-1">{data.summary.resolutionRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">Avg: {data.summary.avgResponseTimeHours.toFixed(1)}h response</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Heatmap */}
        <Card className="mb-10 bg-white shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              Geographic Incident Distribution - Guyana
            </CardTitle>
            <p className="text-blue-100 mt-2">Interactive heatmap showing incident density across regions</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <GuyanaHeatmap data={data.geographic.heatmapData} />
            </div>
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Monthly Trend */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Monthly Incident Trend
              </CardTitle>
              <p className="text-gray-600 mt-2">Severity breakdown over time</p>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke={COLORS.critical} fill={COLORS.critical} fillOpacity={0.8} />
                  <Area type="monotone" dataKey="high" stackId="1" stroke={COLORS.high} fill={COLORS.high} fillOpacity={0.8} />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke={COLORS.medium} fill={COLORS.medium} fillOpacity={0.8} />
                  <Area type="monotone" dataKey="low" stackId="1" stroke={COLORS.low} fill={COLORS.low} fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                Severity Distribution
              </CardTitle>
              <p className="text-gray-600 mt-2">Incident classification breakdown</p>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Hourly Distribution */}
          <Card className="lg:col-span-2 bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                Incidents by Hour of Day
              </CardTitle>
              <p className="text-gray-600 mt-2">Peak incident reporting times</p>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="incidents" 
                    fill={COLORS.primary} 
                    radius={[4, 4, 0, 0]}
                    stroke={COLORS.primaryLight}
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reporter Types */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                Reporter Types
              </CardTitle>
              <p className="text-gray-600 mt-2">Reporting source breakdown</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {data.distributions.reporterTypes.map((type) => {
                  const percentage = (type.count / data.summary.totalReports) * 100;
                  return (
                    <div key={type.type} className="group">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                          <span className="font-semibold text-gray-700">{type.type}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900">{type.count}</span>
                          <span className="text-sm text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 group-hover:from-blue-600 group-hover:to-blue-700" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Locations & Incident Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Top Locations */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                Top Affected Locations
              </CardTitle>
              <p className="text-gray-600 mt-2">Highest incident concentration areas</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {data.geographic.topLocations.slice(0, 8).map((loc, index) => (
                  <div key={index} className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <p className="font-semibold text-gray-900 truncate">{loc.location}</p>
                        </div>
                        {loc.criticalCount > 0 && (
                          <div className="flex items-center gap-2 ml-9">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium text-red-600">{loc.criticalCount} critical incidents</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <span className="text-lg font-bold text-gray-900">{loc.count}</span>
                          <span className="text-sm text-gray-500 block">incidents</span>
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(loc.count / data.geographic.topLocations[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Incident Types */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                Incident Types
              </CardTitle>
              <p className="text-gray-600 mt-2">Most common incident categories</p>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={incidentTypeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    dataKey="type" 
                    type="category" 
                    width={120}
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={COLORS.primary} 
                    radius={[0, 4, 4, 0]}
                    stroke={COLORS.primaryLight}
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Employer Performance Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Worst Performing Employers */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                High-Risk Employers
              </CardTitle>
              <p className="text-gray-600 mt-2">Companies with highest incident rates and risk scores</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {data.employers?.worstPerformers?.slice(0, 10).map((employer, index) => (
                  <div key={employer._id} className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            employer.riskScore > 50 ? 'bg-red-500' : 
                            employer.riskScore > 30 ? 'bg-orange-500' : 
                            employer.riskScore > 10 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 truncate">{employer._id}</p>
                            <p className="text-sm text-gray-600">{employer.industry} • {employer.companySize}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-gray-900">{employer.totalIncidents}</div>
                            <div className="text-gray-500">Incidents</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-red-600">{employer.criticalIncidents}</div>
                            <div className="text-gray-500">Critical</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-orange-600">{employer.totalCasualties}</div>
                            <div className="text-gray-500">Casualties</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employer.complianceStatus === 'COMPLIANT' ? 'bg-green-100 text-green-700' :
                            employer.complianceStatus === 'NON_COMPLIANT' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {employer.complianceStatus.replace('_', ' ')}
                          </div>
                          {employer.safetyRating && (
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              employer.safetyRating === 'EXCELLENT' ? 'bg-green-100 text-green-700' :
                              employer.safetyRating === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                              employer.safetyRating === 'FAIR' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {employer.safetyRating}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-gray-900">{employer.riskScore.toFixed(0)}</div>
                        <div className="text-sm text-gray-500">Risk Score</div>
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <p>No employer data available</p>
                    <p className="text-sm">Investigation reports required for employer analytics</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Industry Risk Analysis */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                Industry Risk Analysis
              </CardTitle>
              <p className="text-gray-600 mt-2">Risk metrics by industry sector</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {data.employers?.industryRisk?.map((industry, index) => (
                  <div key={industry._id} className="group p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{industry._id}</p>
                          <p className="text-sm text-gray-600">{industry.uniqueCompanies} companies</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{industry.incidentRate.toFixed(1)}</div>
                        <div className="text-sm text-gray-500">Incidents/Company</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-gray-900">{industry.totalIncidents}</div>
                        <div className="text-gray-500">Total Incidents</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-red-600">{industry.criticalIncidents}</div>
                        <div className="text-gray-500">Critical</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-orange-600">{industry.totalCasualties}</div>
                        <div className="text-gray-500">Casualties</div>
                      </div>
                    </div>
                    {industry.avgFinancialImpact > 0 && (
                      <div className="mt-3 text-center">
                        <div className="text-sm text-gray-600">
                          Avg Financial Impact: <span className="font-semibold">${industry.avgFinancialImpact.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <p>No industry data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resolution Rates by Severity */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                Resolution Rates by Severity
              </CardTitle>
              <p className="text-gray-600 mt-2">Performance metrics by incident severity</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {data.performance.resolutionRates.map((item) => (
                  <div key={item.severity} className="group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[item.severity.toLowerCase() as keyof typeof COLORS] || COLORS.neutral }}
                        ></div>
                        <span className="font-semibold text-gray-700">{item.severity}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">{item.rate.toFixed(1)}%</span>
                        <span className="text-sm text-gray-500 block">{item.resolved}/{item.total} resolved</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-3 rounded-full transition-all duration-500 group-hover:opacity-80"
                        style={{ 
                          width: `${item.rate}%`,
                          backgroundColor: COLORS[item.severity.toLowerCase() as keyof typeof COLORS] || COLORS.neutral
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card className="bg-white shadow-xl border-0 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                Daily Trend (Last 30 Days)
              </CardTitle>
              <p className="text-gray-600 mt-2">Recent incident reporting patterns</p>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="incidents" 
                    stroke={COLORS.primary} 
                    strokeWidth={3}
                    dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: COLORS.primary }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}