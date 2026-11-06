import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { Staff } from "@shared/schema";
import * as Icons from "lucide-react";

interface RankingData {
  staff: Staff;
  rank: number;
  avgScore: number;
  totalEvents: number;
  badges: Array<any>;
  ahead: Array<any>;
  behind: Array<any>;
  totalStaff: number;
}

export function MyRankingCard({ staffId }: { staffId: string }) {
  const { data: ranking, isLoading } = useQuery<RankingData>({
    queryKey: [`/api/staff/${staffId}/ranking`],
    enabled: !!staffId,
  });
  
  if (isLoading) return <div data-testid="text-loading-ranking">Loading ranking...</div>;
  if (!ranking) return null;
  
  const percentage = (ranking.avgScore / 15) * 100;
  const isTopThree = ranking.rank <= 3;
  
  return (
    <Card className="border-primary" data-testid="card-my-ranking">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Your Ranking</span>
          {isTopThree && <Trophy className="h-6 w-6 text-yellow-500" data-testid="icon-trophy" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rank Display */}
        <div className="text-center">
          <div className="text-5xl font-bold text-primary" data-testid="text-rank">
            #{ranking.rank}
          </div>
          <p className="text-muted-foreground" data-testid="text-total-staff">
            out of {ranking.totalStaff} staff
          </p>
        </div>
        
        {/* Score Display */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Average Score</span>
            <span className="text-sm font-bold" data-testid="text-avg-score">
              {ranking.avgScore.toFixed(1)}/15.0
            </span>
          </div>
          <Progress value={percentage} className="h-3" data-testid="progress-score" />
          <p className="text-xs text-muted-foreground mt-1" data-testid="text-percentage">
            {percentage.toFixed(0)}%
          </p>
        </div>
        
        {/* Badges */}
        {ranking.badges.length > 0 && (
          <div data-testid="section-badges">
            <p className="text-sm font-medium mb-2">Your Badges</p>
            <div className="flex flex-wrap gap-2">
              {ranking.badges.map((sb: any) => {
                const IconComponent = (Icons as any)[sb.badge.icon] || Icons.Award;
                
                return (
                  <Badge 
                    key={sb.id} 
                    variant="secondary" 
                    className="flex items-center gap-1"
                    data-testid={`badge-earned-${sb.badgeId}`}
                  >
                    <IconComponent className="h-4 w-4" />
                    {sb.badge.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Context: People Ahead */}
        {ranking.ahead.length > 0 && (
          <div data-testid="section-ahead">
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Ahead of you
            </p>
            <div className="space-y-2">
              {ranking.ahead.map((entry: any) => (
                <div 
                  key={entry.staff.id} 
                  className="flex items-center justify-between text-sm"
                  data-testid={`row-ahead-${entry.staff.id}`}
                >
                  <span>#{entry.rank} {entry.staff.fullName}</span>
                  <span className="font-medium">{entry.avgScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Context: People Behind */}
        {ranking.behind.length > 0 && (
          <div data-testid="section-behind">
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              Behind you
            </p>
            <div className="space-y-2">
              {ranking.behind.map((entry: any) => (
                <div 
                  key={entry.staff.id} 
                  className="flex items-center justify-between text-sm text-muted-foreground"
                  data-testid={`row-behind-${entry.staff.id}`}
                >
                  <span>#{entry.rank} {entry.staff.fullName}</span>
                  <span>{entry.avgScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
