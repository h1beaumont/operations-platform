import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Award,
  Building2,
  GraduationCap 
} from "lucide-react";

interface ComplianceOverview {
  totalEvents: number;
  averageScore: number;
  totalStaff: number;
  perfectScoreCount: number;
  failedEvents: number;
  complianceRate: number;
}

interface ComplianceIssue {
  criterion: string;
  failureCount: number;
  failureRate: number;
  impactPoints: number;
}

interface WeeklyTrend {
  weekStart: string;
  averageScore: number;
  totalEvents: number;
  complianceRate: number;
  perfectScoreCount: number;
}

interface PropertyStats {
  property: string;
  totalEvents: number;
  averageScore: number;
  complianceRate: number;
}

interface TrainingNeed {
  criterion: string;
  weight: number;
  staffNeedingTraining: Array<{
    staffId: string;
    staffName: string;
    failureRate: number;
  }>;
}

export default function ComplianceAnalytics() {
  const { data: overview, isLoading: loadingOverview } = useQuery<ComplianceOverview>({
    queryKey: ["/api/analytics/compliance-overview"],
  });
  
  const { data: issues = [], isLoading: loadingIssues } = useQuery<ComplianceIssue[]>({
    queryKey: ["/api/analytics/compliance-issues"],
  });
  
  const { data: trends = [], isLoading: loadingTrends } = useQuery<WeeklyTrend[]>({
    queryKey: ["/api/analytics/compliance-trends"],
  });
  
  const { data: propertyStats = [], isLoading: loadingProperties } = useQuery<PropertyStats[]>({
    queryKey: ["/api/analytics/property-compliance"],
  });
  
  const { data: trainingNeeds = [], isLoading: loadingTraining } = useQuery<TrainingNeed[]>({
    queryKey: ["/api/analytics/training-needs"],
  });
  
  if (loadingOverview || loadingIssues || loadingTrends || loadingProperties || loadingTraining) {
    return <div className="p-8">Loading compliance analytics...</div>;
  }
  
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance Analytics</h1>
        <p className="text-muted-foreground">Team-wide compliance insights, common issues, and training needs</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Avg. Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-avg-score">
              {overview?.averageScore ? overview.averageScore.toFixed(1) : '0.0'}/15.0
            </div>
            <p className="text-xs text-muted-foreground">{overview?.totalEvents} total events</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Compliance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-compliance-rate">
              {overview?.complianceRate && !isNaN(overview.complianceRate) ? overview.complianceRate.toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">Events scoring 10+/15</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Perfect Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-perfect-scores">
              {overview?.perfectScoreCount}
            </div>
            <p className="text-xs text-muted-foreground">15/15 scores achieved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Failed Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="metric-failed-events">
              {overview?.failedEvents}
            </div>
            <p className="text-xs text-muted-foreground">Scoring below 10/15</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="issues" className="space-y-6">
        <TabsList>
          <TabsTrigger value="issues" data-testid="tab-issues">Common Issues</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">Training Needs</TabsTrigger>
          <TabsTrigger value="properties" data-testid="tab-properties">By Property</TabsTrigger>
        </TabsList>
        
        <TabsContent value="issues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Most Common Compliance Issues</CardTitle>
              <CardDescription>Criteria that fail most frequently</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {issues.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No compliance issues detected! All criteria are being met consistently.
                </p>
              ) : (
                issues.slice(0, 10).map((issue, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 border rounded-lg"
                    data-testid={`issue-${idx}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{issue.criterion}</span>
                      <Badge variant="destructive">{issue.failureCount} failures</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Failure Rate</span>
                        <span className="font-medium">{issue.failureRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={issue.failureRate} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Total points lost: {issue.impactPoints.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Compliance Trends</CardTitle>
              <CardDescription>Last 12 weeks of compliance performance</CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No compliance trend data available yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {trends.slice().reverse().slice(0, 12).map((week, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{new Date(week.weekStart).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">{week.totalEvents} events</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{week.averageScore.toFixed(1)}/15.0</p>
                        <p className="text-xs text-muted-foreground">
                          {week.complianceRate.toFixed(0)}% compliance
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Staff Training Needs
              </CardTitle>
              <CardDescription>Staff with &gt;30% failure rate in specific criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {trainingNeeds.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No significant training needs identified!
                </p>
              ) : (
                trainingNeeds.map((need, idx) => (
                  <div key={idx} className="border-l-4 border-l-warning bg-warning/5 p-4 rounded">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-lg">{need.criterion}</span>
                      <Badge variant="outline">{need.weight} points</Badge>
                    </div>
                    <div className="space-y-2">
                      {need.staffNeedingTraining.map((staff, sIdx) => (
                        <div 
                          key={sIdx} 
                          className="flex items-center justify-between text-sm p-2 bg-background rounded"
                        >
                          <span>{staff.staffName}</span>
                          <Badge variant="destructive">
                            {staff.failureRate.toFixed(1)}% failure rate
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Compliance by Property
              </CardTitle>
              <CardDescription>Performance metrics for each property</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {propertyStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No property compliance data available yet.
                </p>
              ) : (
                propertyStats.slice(0, 20).map((prop, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 border rounded hover-elevate"
                    data-testid={`property-${idx}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{prop.property}</p>
                      <p className="text-xs text-muted-foreground">{prop.totalEvents} events</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">{prop.averageScore.toFixed(1)}/15.0</p>
                        <p className="text-xs text-muted-foreground">
                          {prop.complianceRate.toFixed(0)}% compliance
                        </p>
                      </div>
                      <Badge 
                        variant={prop.complianceRate >= 80 ? "default" : "destructive"}
                      >
                        {prop.complianceRate >= 80 ? "Good" : "Needs Attention"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
