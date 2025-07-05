"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText,
  Building,
  Globe,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
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
  primary: '#0f172a',
  primaryLight: '#1e293b',
  secondary: '#475569',
  accent: '#0ea5e9',
  accentLight: '#38bdf8',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  resolved: '#16a34a',
  pending: '#3b82f6',
  neutral: '#64748b',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  surface: '#f1f5f9',
  border: '#e2e8f0',
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    inverse: '#ffffff'
  },
  gradient: {
    primary: 'from-slate-900 to-slate-800',
    secondary: 'from-blue-600 to-blue-700',
    accent: 'from-sky-500 to-sky-600',
    success: 'from-emerald-500 to-emerald-600',
    warning: 'from-amber-500 to-amber-600',
    danger: 'from-red-500 to-red-600'
  }
};

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  color = "blue" 
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: { value: number; positive: boolean };
  color?: "blue" | "purple" | "red" | "green" | "orange";
}) {
  const gradients = {
    blue: "from-slate-800 to-slate-900",
    purple: "from-blue-600 to-blue-700",
    red: "from-red-500 to-red-600",
    green: "from-emerald-500 to-emerald-600",
    orange: "from-amber-500 to-amber-600",
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
            {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium ${
                  trend.positive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend.value).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
          <div className={`w-16 h-16 bg-gradient-to-br ${gradients[color]} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-b-slate-800 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg font-medium">Loading analytics...</p>
          <p className="text-slate-500 text-sm mt-2">Gathering comprehensive insights</p>
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
    fill: item._id.toLowerCase() === 'critical' ? COLORS.critical :
          item._id.toLowerCase() === 'high' ? COLORS.high :
          item._id.toLowerCase() === 'medium' ? COLORS.medium :
          item._id.toLowerCase() === 'low' ? COLORS.low :
          COLORS.neutral
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
              <p className="text-xl text-slate-600 mt-2">Comprehensive insights into HSSE incidents and performance metrics</p>
            </div>
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-800 to-slate-600 rounded-full"></div>
        </div>

        <Tabs defaultValue="overview" className="space-y-10">
          <div className="flex justify-center mb-2">
            <TabsList className="inline-flex h-auto bg-white shadow-lg border border-slate-200 rounded-2xl p-2 backdrop-blur-sm overflow-x-auto">
              <TabsTrigger value="overview" className="flex items-center gap-2 px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <PieChartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="incidents" className="flex items-center gap-2 px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Incident Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="geographic" className="flex items-center gap-2 px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Geographic</span>
              </TabsTrigger>
              <TabsTrigger value="employers" className="flex items-center gap-2 px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Employer Risk</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2 px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <LineChartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Performance</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Incidents"
                value={data.summary.totalReports.toLocaleString()}
                subtitle="All time records"
                icon={FileText}
                color="blue"
              />
              <MetricCard
                title="This Month"
                value={data.summary.monthReports.toLocaleString()}
                subtitle="vs last month"
                icon={Calendar}
                color="purple"
                trend={{
                  value: data.summary.monthOverMonthChange,
                  positive: data.summary.monthOverMonthChange < 0
                }}
              />
              <MetricCard
                title="Critical Incidents"
                value={data.summary.criticalIncidents.toLocaleString()}
                subtitle="Immediate attention required"
                icon={AlertTriangle}
                color="red"
              />
              <MetricCard
                title="Resolution Rate"
                value={`${data.summary.resolutionRate.toFixed(1)}%`}
                subtitle={`Avg: ${data.summary.avgResponseTimeHours.toFixed(1)}h response`}
                icon={CheckCircle}
                color="green"
              />
            </div>

            {/* Summary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Trend */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    Monthly Incident Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="critical" stackId="1" stroke={COLORS.critical} fill={COLORS.critical} fillOpacity={0.9} />
                      <Area type="monotone" dataKey="high" stackId="1" stroke={COLORS.high} fill={COLORS.high} fillOpacity={0.9} />
                      <Area type="monotone" dataKey="medium" stackId="1" stroke={COLORS.medium} fill={COLORS.medium} fillOpacity={0.9} />
                      <Area type="monotone" dataKey="low" stackId="1" stroke={COLORS.low} fill={COLORS.low} fillOpacity={0.9} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <PieChartIcon className="w-5 h-5 text-white" />
                    </div>
                    Severity Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
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
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incident Analysis Tab */}
          <TabsContent value="incidents" className="space-y-8 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Hourly Distribution */}
              <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Incidents by Hour of Day
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                      <Bar dataKey="incidents" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Reporter Types */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    Reporter Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {data.distributions.reporterTypes.map((type) => {
                      const percentage = (type.count / data.summary.totalReports) * 100;
                      return (
                        <div key={type.type}>
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-slate-700">{type.type}</span>
                            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-slate-800 to-slate-700 h-3 rounded-full transition-all duration-300" 
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

            {/* Incident Types */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  Incident Types Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={incidentTypeData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="type" type="category" width={120} stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Trend */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  Daily Trend (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="incidents" 
                      stroke={COLORS.primary} 
                      strokeWidth={3}
                      dot={{ fill: COLORS.primary, strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geographic Tab */}
          <TabsContent value="geographic" className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Geographic Heatmap */}
            <Card className="bg-white shadow-sm border border-slate-200 overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-6">
                <CardTitle className="flex items-center gap-4 text-slate-900">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Geographic Incident Distribution</h3>
                    <p className="text-slate-600 mt-1 text-sm">Interactive heatmap showing incident density across Guyana</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span className="text-slate-600">Critical</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                      <span className="text-slate-600">High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                      <span className="text-slate-600">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <span className="text-slate-600">Low</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
                    <GuyanaHeatmap data={data.geographic.heatmapData} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Locations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    Top Affected Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.geographic.topLocations.slice(0, 8).map((loc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 border border-slate-200">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                            index === 0 ? 'bg-gradient-to-br from-red-500 to-red-600' :
                            index === 1 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                            index === 2 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-br from-slate-500 to-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{loc.location}</p>
                            {loc.criticalCount > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <p className="text-sm text-red-600 font-medium">{loc.criticalCount} critical incidents</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-slate-900">{loc.count}</span>
                          <span className="text-sm text-slate-500 block">incidents</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Statistics */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    Geographic Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Total Locations</p>
                          <p className="text-2xl font-bold text-blue-900">{data.geographic.topLocations.length}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700">Critical Hotspots</p>
                          <p className="text-2xl font-bold text-red-900">{data.geographic.topLocations.filter(loc => loc.criticalCount > 0).length}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-700">Avg Incidents/Location</p>
                          <p className="text-2xl font-bold text-emerald-900">{(data.geographic.topLocations.reduce((sum, loc) => sum + loc.count, 0) / data.geographic.topLocations.length).toFixed(1)}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employer Risk Tab */}
          <TabsContent value="employers" className="space-y-8 animate-in fade-in-0 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* High-Risk Employers */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    High-Risk Employers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {data.employers?.worstPerformers?.slice(0, 10).map((employer, index) => (
                      <div key={employer._id} className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                                employer.riskScore > 50 ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                                employer.riskScore > 30 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 
                                employer.riskScore > 10 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' : 'bg-gradient-to-br from-green-500 to-green-600'
                              }`}>
                                {index + 1}
                              </div>
                              <p className="font-semibold text-slate-900">{employer._id}</p>
                            </div>
                            <p className="text-sm text-slate-600 mb-3 bg-slate-100 px-3 py-1 rounded-full inline-block">{employer.industry} • {employer.companySize}</p>
                            <div className="flex gap-4 text-sm">
                              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-600 rounded-full"></div><strong>{employer.totalIncidents}</strong> incidents</span>
                              <span className="flex items-center gap-1 text-red-600"><div className="w-2 h-2 bg-red-500 rounded-full"></div><strong>{employer.criticalIncidents}</strong> critical</span>
                              <span className="flex items-center gap-1 text-orange-600"><div className="w-2 h-2 bg-orange-500 rounded-full"></div><strong>{employer.totalCasualties}</strong> casualties</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900">{employer.riskScore.toFixed(0)}</div>
                            <div className="text-sm text-slate-500 font-medium">Risk Score</div>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-slate-500">
                        <p>No employer data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Industry Risk Analysis */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    Industry Risk Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {data.employers?.industryRisk?.map((industry, index) => (
                      <div key={industry._id} className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                              {index + 1}
                            </div>
                            <p className="font-semibold text-slate-900">{industry._id}</p>
                          </div>
                          <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-medium">{industry.uniqueCompanies} companies</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-600 rounded-full"></div>{industry.totalIncidents} incidents</span>
                          <span className="flex items-center gap-1 text-red-600"><div className="w-2 h-2 bg-red-500 rounded-full"></div>{industry.criticalIncidents} critical</span>
                          <span className="flex items-center gap-1 font-semibold text-purple-600"><div className="w-2 h-2 bg-purple-500 rounded-full"></div>{industry.incidentRate.toFixed(1)}/company</span>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-slate-500">
                        <p>No industry data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Resolution Rates */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  Resolution Rates by Severity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {data.performance.resolutionRates.map((item) => (
                    <div key={item.severity}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-5 h-5 rounded-xl"
                            style={{ backgroundColor: COLORS[item.severity.toLowerCase() as keyof typeof COLORS] || COLORS.neutral }}
                          />
                          <span className="font-semibold text-slate-700">{item.severity}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-slate-900">{item.rate.toFixed(1)}%</span>
                          <span className="text-sm text-slate-500 ml-2 bg-slate-100 px-2 py-1 rounded-full">{item.resolved}/{item.total}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-4">
                        <div 
                          className="h-4 rounded-full transition-all duration-300"
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

            {/* Status Distribution */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="flex items-center gap-3 text-slate-900">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  Report Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}