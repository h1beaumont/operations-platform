import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, TrendingUp, Wrench, Building2, DollarSign, 
  ShoppingCart, CheckSquare, Home, GraduationCap, 
  AlertCircle, TrendingDown, ArrowRight, BarChart3,
  Clock, Package
} from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MasterAnalytics } from "@shared/schema";

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
};

export default function MasterAnalytics() {
  const { data: analytics, isLoading } = useQuery<MasterAnalytics>({
    queryKey: ["/api/analytics/master"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const hiringStagesData = Object.entries(analytics.hiring.byStage).map(([stage, count]) => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count,
  }));

  const maintenanceStatusData = Object.entries(analytics.maintenance.byStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    value: count,
  }));

  const maintenancePriorityData = Object.entries(analytics.maintenance.byPriority).map(([priority, count]) => ({
    name: priority.charAt(0).toUpperCase() + priority.slice(1),
    value: count,
  }));

  const financialData = [
    { name: 'Revenue', value: analytics.financial.revenue },
    { name: 'Expenses', value: analytics.financial.expenses },
    { name: 'Profit', value: analytics.financial.profit },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <BarChart3 className="h-8 w-8" />
            Master Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive overview of all StaffFlow metrics</p>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate" data-testid="card-total-candidates">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-total-candidates">
              {analytics.hero.totalCandidates}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.hiring.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-compliance-score">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-compliance-score">
              {analytics.hero.complianceScore.toFixed(1)}/17.0
            </div>
            <Badge 
              variant={analytics.hero.complianceScore >= 15 ? "default" : analytics.hero.complianceScore >= 12 ? "secondary" : "destructive"}
              data-testid="badge-compliance-status"
            >
              {analytics.hero.complianceScore >= 15 ? "Excellent" : analytics.hero.complianceScore >= 12 ? "Good" : "Needs Improvement"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-open-maintenance">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-open-maintenance">
              {analytics.hero.openMaintenance}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {analytics.maintenance.total} total requests
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-revenue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Mock)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-revenue">
              £{(analytics.hero.revenue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              {analytics.financial.profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-active-staff">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-active-staff">
              {analytics.hero.activeStaff}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of {analytics.staff.total} total
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-occupancy">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-occupancy">
              {analytics.hero.occupancyRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.properties.active} active properties
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-task-completion">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-task-completion">
              {analytics.hero.taskCompletionRate.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.tasks.todayCompleted}/{analytics.tasks.todayTotal} completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-low-stock">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-low-stock">
              {analytics.hero.lowStockAlerts}
            </div>
            <Badge 
              variant={analytics.hero.lowStockAlerts === 0 ? "default" : analytics.hero.lowStockAlerts < 5 ? "secondary" : "destructive"}
              data-testid="badge-stock-status"
            >
              {analytics.hero.lowStockAlerts === 0 ? "All Good" : analytics.hero.lowStockAlerts < 5 ? "Low" : "Critical"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Hiring Pipeline
          </h2>
          <Link href="/analytics">
            <Button variant="ghost" size="sm" data-testid="link-hiring-details">
              View Details <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline by Stage</CardTitle>
              <CardDescription>Distribution of candidates across hiring stages</CardDescription>
            </CardHeader>
            <CardContent>
              {hiringStagesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hiringStagesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No pipeline data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Candidates</span>
                <span className="text-2xl font-bold" data-testid="hiring-total-candidates">{analytics.hiring.totalCandidates}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Conversion Rate</span>
                <span className="text-2xl font-bold text-success" data-testid="hiring-conversion-rate">{analytics.hiring.conversionRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg. Time to Hire</span>
                <span className="text-2xl font-bold flex items-center gap-1" data-testid="hiring-time-to-hire">
                  <Clock className="h-5 w-5" />
                  {analytics.hiring.avgTimeToHire.toFixed(0)} days
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Staff & Compliance Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Staff & Compliance
          </h2>
          <Link href="/compliance">
            <Button variant="ghost" size="sm" data-testid="link-staff-details">
              View Details <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="staff-total">{analytics.staff.total}</div>
              <p className="text-sm text-muted-foreground mt-1">{analytics.staff.active} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="staff-compliance-score">{analytics.staff.complianceScore.toFixed(1)}/17.0</div>
              <p className="text-sm text-muted-foreground mt-1">{analytics.staff.complianceRate.toFixed(1)}% rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="staff-compliance-events">{analytics.staff.totalComplianceEvents}</div>
              <p className="text-sm text-muted-foreground mt-1">Total recorded</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Maintenance Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Maintenance
          </h2>
          <Link href="/maintenance">
            <Button variant="ghost" size="sm" data-testid="link-maintenance-details">
              View Details <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Requests by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {maintenanceStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={maintenanceStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {maintenanceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(CHART_COLORS)[index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No maintenance data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {maintenancePriorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={maintenancePriorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={CHART_COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Properties & Financial Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Properties */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Properties
            </h2>
            <Link href="/properties">
              <Button variant="ghost" size="sm" data-testid="link-properties-details">
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Property Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Properties</span>
                  <span className="text-2xl font-bold" data-testid="properties-total">{analytics.properties.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Properties</span>
                  <span className="text-2xl font-bold text-success" data-testid="properties-active">{analytics.properties.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Occupancy Rate</span>
                  <span className="text-2xl font-bold" data-testid="properties-occupancy">{analytics.properties.occupancyRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Financial */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Financial (Mock Data)
            </h2>
            <Link href="/business-analytics">
              <Button variant="ghost" size="sm" data-testid="link-financial-details">
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
              <CardDescription>TODO: Replace with actual financial data</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                  <Bar dataKey="value" fill={CHART_COLORS.success} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ordering & Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ordering */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              Ordering System
            </h2>
            <Link href="/ordering-system">
              <Button variant="ghost" size="sm" data-testid="link-ordering-details">
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Spent</span>
                  <span className="text-2xl font-bold" data-testid="ordering-total-spent">£{analytics.ordering.totalSpent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Orders</span>
                  <span className="text-2xl font-bold" data-testid="ordering-total-orders">{analytics.ordering.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Low Stock Alerts</span>
                  <Badge 
                    variant={analytics.ordering.lowStockCount === 0 ? "default" : analytics.ordering.lowStockCount < 5 ? "secondary" : "destructive"}
                    data-testid="ordering-low-stock-badge"
                  >
                    {analytics.ordering.lowStockCount} items
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckSquare className="h-6 w-6" />
              Task Management
            </h2>
            <Link href="/operations/weekly-rota">
              <Button variant="ghost" size="sm" data-testid="link-tasks-details">
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Today's Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-2xl font-bold text-success" data-testid="tasks-completion-rate">{analytics.tasks.todayCompletionRate.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-2xl font-bold" data-testid="tasks-completed">{analytics.tasks.todayCompleted}/{analytics.tasks.todayTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overdue Tasks</span>
                  <Badge 
                    variant={analytics.tasks.overdue === 0 ? "default" : analytics.tasks.overdue < 5 ? "secondary" : "destructive"}
                    data-testid="tasks-overdue-badge"
                  >
                    {analytics.tasks.overdue} tasks
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* AST Properties & Training Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AST Properties */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Home className="h-6 w-6" />
              AST Properties
            </h2>
            <Link href="/ast/properties">
              <Button variant="ghost" size="sm" data-testid="link-ast-details">
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tenancy Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Properties</span>
                  <span className="text-2xl font-bold" data-testid="ast-total-properties">{analytics.ast.totalProperties}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Tenancies</span>
                  <span className="text-2xl font-bold text-success" data-testid="ast-active-tenancies">{analytics.ast.activeTenancies}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rent Collection Rate</span>
                  <span className="text-2xl font-bold" data-testid="ast-rent-collection">{analytics.ast.rentCollectionRate.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Training */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              Training
            </h2>
            <Link href="/training-videos">
              <Button variant="ghost" size="sm" data-testid="link-training-details">
                View Details <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Training Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Videos</span>
                  <span className="text-2xl font-bold" data-testid="training-total-videos">{analytics.training.totalVideos}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Completions</span>
                  <span className="text-2xl font-bold" data-testid="training-total-completions">{analytics.training.totalCompletions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-2xl font-bold text-success" data-testid="training-completion-rate">{analytics.training.completionRate.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
