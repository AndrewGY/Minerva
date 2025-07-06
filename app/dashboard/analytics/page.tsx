"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  LineChart as LineChartIcon,
  Eye,
  Briefcase,
  Settings,

  Award,
  BookOpen,
  Filter,
  Download,
  RefreshCw,
  DollarSign,
  Scale,
  Gavel,
  Heart,
  Building2,
  Factory,
  Search
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
  public: {
    publishedReports: Array<{
      _id: string;
      title: string;
      publishedAt: Date;
      publicId: string;
      summary: string;
      location: string;
      industry: string;
    }>;
    topReporters: Array<{
      reporterType: string;
      count: number;
      percentage: number;
    }>;
    totalIncidents: {
      thisYear: number;
      thisMonth: number;
      totalResolved: number;
      percentageResolved: number;
      daysSinceLastMajor: number;
    };
    incidentsBySeverity: Array<{
      severity: string;
      count: number;
      percentage: number;
    }>;
    incidentsByType: Array<{
      type: string;
      count: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      incidents: number;
      resolved: number;
    }>;
    incidentsByRegion: Array<{
      region: string;
      count: number;
      severity: string;
    }>;
    investigationOutcomes: Array<{
      outcome: string;
      count: number;
      percentage: number;
    }>;
    geographic?: {
      heatmapData: Array<{
        location: {
          lat: number;
          lng: number;
        };
        severityLevel: string;
        incidentType: string;
      }>;
    };
    outcomes?: {
      investigationStats: {
        completed: number;
        ongoing: number;
      };
      resolutionRate: number;
      avgInvestigationTime: number;
    };
  };

  industry: {
    topCauses: Array<{
      cause: string;
      count: number;
    }>;
    regionalDensity: Array<{
      region: string;
      incidents: number;
      density: string;
    }>;
  };

  policy: {
    nationalMetrics: {
      accidentRate: number;
      yoyChange: number;
    };
    investigationPipeline: Array<{
      status: string;
      count: number;
      color: string;
      description: string;
    }>;
    publicEngagement: {
      publicReports: number;
      citizenReports: number;
      channels: Array<{
        channel: string;
        reports: number;
        percentage: number;
      }>;
    };
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
    
    // Allow public access to analytics (no login required)
    fetchAnalytics();
  }, [status]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics/data");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Analytics</h1>
              <p className="text-xl text-slate-600 mt-2">Comprehensive insights for different stakeholder perspectives</p>
            </div>
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-800 to-slate-600 rounded-full"></div>
        </div>

        <Tabs defaultValue="public" className="space-y-10">
          <div className="flex justify-center mb-2">
            <TabsList className="inline-flex h-auto bg-white shadow-lg border border-slate-200 rounded-2xl p-2 backdrop-blur-sm overflow-x-auto">
              <TabsTrigger value="public" className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Public View</span>
              </TabsTrigger>
              <TabsTrigger value="industry" className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">Industry Professionals</span>
              </TabsTrigger>
              <TabsTrigger value="policy" className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-slate-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md whitespace-nowrap">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Policymakers & Regulators</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* PUBLIC VIEW - General Public Dashboard */}
          <TabsContent value="public" className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Public Safety Dashboard</h2>
                  <p className="text-blue-100 text-lg">Transparent workplace safety insights for Guyana</p>
                </div>
              </div>
              
              {/* Key Public Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-blue-200" />
                    <div>
                      <p className="text-sm text-blue-200">Days Since Last Major Incident</p>
                      <p className="text-3xl font-bold">{data.public?.totalIncidents.daysSinceLastMajor || 12}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-emerald-200" />
                    <div>
                      <p className="text-sm text-blue-200">Incidents Resolved</p>
                      <p className="text-3xl font-bold">{data.public?.totalIncidents.percentageResolved || 0}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-yellow-200" />
                    <div>
                      <p className="text-sm text-blue-200">This Year</p>
                      <p className="text-3xl font-bold">{data.public?.totalIncidents.thisYear || 245}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Incidents by Severity */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    Incidents by Severity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.public?.incidentsBySeverity.map(item => ({
                          name: item.severity.charAt(0) + item.severity.slice(1).toLowerCase(),
                          value: item.count,
                          fill: item.severity === 'CRITICAL' ? COLORS.critical :
                                item.severity === 'HIGH' ? COLORS.high :
                                item.severity === 'MEDIUM' ? COLORS.medium : COLORS.low
                        })) || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        dataKey="value"
                      >
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Common Incident Types */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-blue-500" />
                    Most Common Incident Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(data.public?.incidentsByType || []).map((item, index) => {
                      const total = data.public?.totalIncidents.thisYear || 1;
                      const percentage = (item.count / total) * 100;
                      return (
                        <div key={item.type} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-700">{item.type}</span>
                            <span className="text-sm text-slate-600">{item.count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
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

            {/* Monthly Trend */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <LineChartIcon className="w-6 h-6 text-indigo-500" />
                  Monthly Incident Trends & Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={data.public?.monthlyTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="incidents" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} name="Total Incidents" />
                    <Area type="monotone" dataKey="resolved" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.8} name="Resolved" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Geographic Heatmap */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-green-500" />
                    Incident Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GuyanaHeatmap data={data.public?.geographic?.heatmapData || []} />
                </CardContent>
              </Card>

              {/* Investigation Outcomes */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Search className="w-6 h-6 text-purple-500" />
                    Investigation Outcomes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-green-900">{data.public?.outcomes?.investigationStats?.completed ?? 0}</p>
                          <p className="text-sm text-green-700">Completed</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-blue-900">{data.public?.outcomes?.investigationStats?.ongoing ?? 0}</p>
                          <p className="text-sm text-blue-700">Ongoing</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-slate-900">{data.public?.outcomes?.resolutionRate ?? 0}%</p>
                      <p className="text-slate-600">Average Resolution Rate</p>
                      <p className="text-sm text-slate-500 mt-2">Avg time: {data.public?.outcomes?.avgInvestigationTime ?? 0} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Published Reports */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-600" />
                  Recent Published Investigation Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(data.public?.publishedReports || []).length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No published investigation reports yet</p>
                    </div>
                  ) : (
                    (data.public?.publishedReports || []).map((report, index) => (
                      <div key={report._id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all duration-200 border border-slate-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-xs">{report.publicId}</Badge>
                            <Badge className="text-xs bg-blue-100 text-blue-700">{report.industry}</Badge>
                          </div>
                          <h4 className="font-semibold text-slate-900 mb-1">{report.title}</h4>
                          <p className="text-sm text-slate-600">{report.location} • {new Date(report.publishedAt).toLocaleDateString()}</p>
                        </div>
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          View Report
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INDUSTRY PROFESSIONALS VIEW */}
          <TabsContent value="industry" className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Industry Analytics</h2>
                  <p className="text-emerald-100 text-lg">Incident patterns and regional analysis</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Incident Causes */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                    Top Incident Causes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.industry?.topCauses?.map((item, index) => (
                      <div key={item.cause} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-700">{item.cause}</span>
                          <span className="text-sm text-slate-600">{item.count}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                            style={{ width: `${data.industry.topCauses.length > 0 ? (item.count / Math.max(...data.industry.topCauses.map(c => c.count))) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No incident data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Regional Incident Density */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MapPin className="w-6 h-6 text-purple-500" />
                    Regional Incident Density
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.industry?.regionalDensity?.map((item, index) => (
                      <div key={item.region} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              item.density === 'High' ? 'bg-red-500' :
                              item.density === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <span className="font-semibold text-slate-900">{item.region}</span>
                          </div>
                          <Badge variant="outline" className={
                            item.density === 'High' ? 'border-red-200 text-red-700' :
                            item.density === 'Medium' ? 'border-yellow-200 text-yellow-700' : 'border-green-200 text-green-700'
                          }>
                            {item.density} Density
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          <span>{item.incidents} incidents reported</span>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No regional data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Safety Materials & Resources */}
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-emerald-500" />
                  Safety Materials & Resources
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Essential safety documents and guidelines for industry professionals
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Safety Manual */}
                  <a
                    href="https://docs.google.com/document/d/1mhqnAos3FzySY9_BaD6XGXMb8xn2PEZBMWgVhf1BQ5Q/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 hover:border-emerald-300 transition-all duration-200 cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-emerald-900 mb-1">Workplace Safety Manual</h4>
                        <p className="text-sm text-emerald-700 mb-2">Comprehensive guide to workplace safety protocols</p>
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                          <span className="px-2 py-1 bg-emerald-100 rounded-full">Google Docs</span>
                          <span>Click to open</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Emergency Procedures */}
                  <a
                    href="https://docs.google.com/document/d/1mhqnAos3FzySY9_BaD6XGXMb8xn2PEZBMWgVhf1BQ5Q/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 hover:border-red-300 transition-all duration-200 cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 mb-1">Emergency Response Procedures</h4>
                        <p className="text-sm text-red-700 mb-2">Step-by-step emergency response protocols</p>
                        <div className="flex items-center gap-2 text-xs text-red-600">
                          <span className="px-2 py-1 bg-red-100 rounded-full">Google Docs</span>
                          <span>Click to open</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Training Materials */}
                  <a
                    href="https://docs.google.com/document/d/1mhqnAos3FzySY9_BaD6XGXMb8xn2PEZBMWgVhf1BQ5Q/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-300 transition-all duration-200 cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">Safety Training Materials</h4>
                        <p className="text-sm text-blue-700 mb-2">Employee training resources and checklists</p>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <span className="px-2 py-1 bg-blue-100 rounded-full">Google Docs</span>
                          <span>Click to open</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* PPE Guidelines */}
                  <a
                    href="https://docs.google.com/document/d/1mhqnAos3FzySY9_BaD6XGXMb8xn2PEZBMWgVhf1BQ5Q/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 hover:border-purple-300 transition-all duration-200 cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Shield className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-purple-900 mb-1">PPE Guidelines</h4>
                        <p className="text-sm text-purple-700 mb-2">Personal protective equipment selection guide</p>
                        <div className="flex items-center gap-2 text-xs text-purple-600">
                          <span className="px-2 py-1 bg-purple-100 rounded-full">Google Docs</span>
                          <span>Click to open</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Risk Assessment */}
                  <a
                    href="https://docs.google.com/document/d/1mhqnAos3FzySY9_BaD6XGXMb8xn2PEZBMWgVhf1BQ5Q/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 hover:border-yellow-300 transition-all duration-200 cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                        <TrendingDown className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-900 mb-1">Risk Assessment Templates</h4>
                        <p className="text-sm text-yellow-700 mb-2">Workplace risk evaluation forms and matrices</p>
                        <div className="flex items-center gap-2 text-xs text-yellow-600">
                          <span className="px-2 py-1 bg-yellow-100 rounded-full">Google Docs</span>
                          <span>Click to open</span>
                        </div>
                      </div>
                    </div>
                  </a>

                  {/* Incident Report Forms */}
                  <a
                    href="https://docs.google.com/document/d/1mhqnAos3FzySY9_BaD6XGXMb8xn2PEZBMWgVhf1BQ5Q/edit?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 hover:border-slate-300 transition-all duration-200 cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                        <Search className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">Incident Report Forms</h4>
                        <p className="text-sm text-slate-700 mb-2">Standardized incident reporting templates</p>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="px-2 py-1 bg-slate-100 rounded-full">Google Docs</span>
                          <span>Click to open</span>
                        </div>
                      </div>
                    </div>
                  </a>
                </div>

                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Need Additional Resources?</h4>
                      <p className="text-sm text-slate-600">Contact our safety team for industry-specific materials and consultation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* POLICYMAKERS & REGULATORS VIEW */}
          <TabsContent value="policy" className="space-y-8 animate-in fade-in-0 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Scale className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold">Policy & Regulatory Overview</h2>
                  <p className="text-indigo-100 text-lg">National incident tracking and investigation pipeline</p>
                </div>
              </div>
              
              {/* Real National Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-8 h-8 text-indigo-200" />
                    <div>
                      <p className="text-sm text-indigo-200">Total Incidents This Year</p>
                      <p className="text-3xl font-bold">{data?.policy?.nationalMetrics?.accidentRate || 0}</p>
                      <p className="text-xs text-indigo-200">incidents reported</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-200" />
                    <div>
                      <p className="text-sm text-indigo-200">YoY Change</p>
                      <p className={`text-3xl font-bold ${(data?.policy?.nationalMetrics?.yoyChange || 0) < 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {(data?.policy?.nationalMetrics?.yoyChange || 0) > 0 ? '+' : ''}{(data?.policy?.nationalMetrics?.yoyChange || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs text-indigo-200">vs last year</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Investigation Pipeline */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Search className="w-6 h-6 text-blue-500" />
                    Investigation Pipeline Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(data.policy?.investigationPipeline || []).map((item, index) => (
                      <div key={item.status} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full ${item.color.replace('bg-', 'bg-')}`} />
                            <span className="font-semibold text-slate-900">{item.status}</span>
                          </div>
                          <span className="text-2xl font-bold text-slate-700">{item.count}</span>
                        </div>
                        <p className="text-sm text-slate-600 pl-7">{item.description}</p>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-sm">No investigation data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Public Engagement Metrics */}
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-green-500" />
                    Public Engagement & Transparency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-blue-900">Public Reports</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{data.policy?.publicEngagement?.publicReports ?? 0}</p>
                        <p className="text-sm text-blue-600">published this month</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">Citizen Reports</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{data.policy?.publicEngagement?.citizenReports ?? 0}</p>
                        <p className="text-sm text-green-600">reports received</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-900">Engagement Channels</h4>
                      {(data.policy?.publicEngagement?.channels || []).length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm">No channel data available</p>
                        </div>
                      ) : (
                        (data.policy?.publicEngagement?.channels || []).map((item, index) => (
                          <div key={item.channel} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-slate-700">{item.channel}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">{item.reports} reports</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}