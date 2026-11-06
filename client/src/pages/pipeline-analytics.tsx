import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, Clock, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PipelineMetrics {
  totalCandidates: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
  byRoleType: Record<string, number>;
  conversionRates: {
    uploadedToScreened: number;
    screenedToScheduled: number;
    scheduledToAttended: number;
    attendedToHired: number;
    overallConversion: number;
  };
}

interface TimeToHireMetrics {
  averageDays: number;
  byStage: {
    uploadedToScreened: number;
    screenedToScheduled: number;
    scheduledToAttended: number;
    attendedToHired: number;
  };
  fastest: number;
  slowest: number;
}

interface Bottleneck {
  stage: string;
  avgDaysStuck: number;
  candidatesStuck: number;
}

export default function PipelineAnalytics() {
  const { data: metrics, isLoading: loadingMetrics } = useQuery<PipelineMetrics>({
    queryKey: ["/api/analytics/pipeline-metrics"],
  });
  
  const { data: timeToHire, isLoading: loadingTimeToHire } = useQuery<TimeToHireMetrics>({
    queryKey: ["/api/analytics/time-to-hire"],
  });
  
  const { data: bottlenecks = [], isLoading: loadingBottlenecks } = useQuery<Bottleneck[]>({
    queryKey: ["/api/analytics/bottlenecks"],
  });
  
  if (loadingMetrics || loadingTimeToHire || loadingBottlenecks) {
    return <div className="p-8">Loading analytics...</div>;
  }
  
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pipeline Analytics</h1>
        <p className="text-muted-foreground">Track hiring performance, conversion rates, and identify bottlenecks</p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="conversions" data-testid="tab-conversions">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="time" data-testid="tab-time">Time-to-Hire</TabsTrigger>
          <TabsTrigger value="bottlenecks" data-testid="tab-bottlenecks">Bottlenecks</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-candidates">
                  {metrics?.totalCandidates || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Overall Conversion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-conversion-rate">
                  {metrics?.conversionRates.overallConversion.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Uploaded to Hired</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg. Time to Hire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-avg-time-to-hire">
                  {timeToHire?.averageDays.toFixed(1)} days
                </div>
                <p className="text-xs text-muted-foreground">
                  Fastest: {timeToHire?.fastest.toFixed(1)}d | Slowest: {timeToHire?.slowest.toFixed(1)}d
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Bottlenecks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-bottlenecks">
                  {bottlenecks.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {bottlenecks.reduce((sum, b) => sum + b.candidatesStuck, 0)} candidates stuck
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* By Stage */}
          <Card>
            <CardHeader>
              <CardTitle>Candidates by Stage</CardTitle>
              <CardDescription>Current distribution across pipeline stages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(metrics?.byStage || {}).map(([stage, count]) => {
                const percentage = metrics ? (count / metrics.totalCandidates) * 100 : 0;
                
                return (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{stage}</span>
                      <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          
          {/* By Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidates by Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(metrics?.bySource || {}).map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{source}</span>
                    <Badge variant="secondary" data-testid={`source-${source}`}>{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Candidates by Role Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(metrics?.byRoleType || {}).map(([roleType, count]) => (
                  <div key={roleType} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{roleType}</span>
                    <Badge variant="secondary" data-testid={`role-${roleType}`}>{count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Conversion Funnel Tab */}
        <TabsContent value="conversions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Stage-by-stage conversion rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { name: "Uploaded → Screened", rate: metrics?.conversionRates.uploadedToScreened },
                { name: "Screened → Scheduled", rate: metrics?.conversionRates.screenedToScheduled },
                { name: "Scheduled → Attended", rate: metrics?.conversionRates.scheduledToAttended },
                { name: "Attended → Hired", rate: metrics?.conversionRates.attendedToHired },
              ].map((stage, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{stage.name}</span>
                    <span className="text-2xl font-bold">{stage.rate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={stage.rate || 0} className="h-3" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Time-to-Hire Tab */}
        <TabsContent value="time" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Spent in Each Stage</CardTitle>
              <CardDescription>Average days candidates spend in each stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Uploaded → Screened", days: timeToHire?.byStage.uploadedToScreened },
                { name: "Screened → Scheduled", days: timeToHire?.byStage.screenedToScheduled },
                { name: "Scheduled → Attended", days: timeToHire?.byStage.scheduledToAttended },
                { name: "Attended → Hired", days: timeToHire?.byStage.attendedToHired },
              ].map((stage, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="font-medium">{stage.name}</span>
                  <Badge variant="outline" className="text-lg">
                    {stage.days?.toFixed(1)} days
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Bottlenecks Tab */}
        <TabsContent value="bottlenecks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Bottlenecks</CardTitle>
              <CardDescription>Stages where candidates are getting stuck (&gt;7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {bottlenecks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bottlenecks detected!</p>
              ) : (
                <div className="space-y-4">
                  {bottlenecks.map((bottleneck, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 border-l-4 border-l-destructive bg-destructive/5 rounded"
                      data-testid={`bottleneck-${bottleneck.stage}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize text-lg">{bottleneck.stage}</span>
                        <Badge variant="destructive">{bottleneck.candidatesStuck} stuck</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Average time stuck: <strong>{bottleneck.avgDaysStuck.toFixed(1)} days</strong>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
