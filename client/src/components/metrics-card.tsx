import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparklineData?: number[];
}

export function MetricsCard({ title, value, icon: Icon, description, trend }: MetricsCardProps) {
  return (
    <Card className="hover-elevate transition-all" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {value}
              </p>
              {trend && (
                <span
                  className={`text-xs font-medium ${
                    trend.isPositive ? "text-chart-2" : "text-destructive"
                  }`}
                >
                  {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="rounded-full p-3 bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
