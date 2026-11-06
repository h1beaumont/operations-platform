import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Badge, StaffBadge } from "@shared/schema";
import * as Icons from "lucide-react";

export function BadgeGallery({ staffId }: { staffId: string }) {
  const { data: allBadges = [] } = useQuery<Badge[]>({
    queryKey: ["/api/badges"],
  });
  
  const { data: earnedBadges = [] } = useQuery<Array<StaffBadge & { badge: Badge }>>({
    queryKey: [`/api/staff/${staffId}/badges`],
    enabled: !!staffId,
  });
  
  const earnedBadgeIds = new Set(earnedBadges.map(sb => sb.badgeId));
  
  const rarityColors = {
    common: "bg-gray-200 dark:bg-gray-700",
    rare: "bg-blue-200 dark:bg-blue-700",
    epic: "bg-purple-200 dark:bg-purple-700",
    legendary: "bg-yellow-200 dark:bg-yellow-700",
  };
  
  return (
    <Card data-testid="card-badge-gallery">
      <CardHeader>
        <CardTitle>Badge Gallery</CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="text-badge-progress">
          {earnedBadges.length} / {allBadges.length} earned
        </p>
        <Progress 
          value={allBadges.length > 0 ? (earnedBadges.length / allBadges.length) * 100 : 0} 
          className="mt-2" 
          data-testid="progress-badge-completion"
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allBadges.map(badge => {
            const earned = earnedBadgeIds.has(badge.id);
            const IconComponent = (Icons as any)[badge.icon] || Icons.Award;
            
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-lg border-2 text-center ${
                  earned ? rarityColors[badge.rarity as keyof typeof rarityColors] : 'opacity-40 border-dashed'
                }`}
                data-testid={`badge-${badge.id}`}
              >
                <IconComponent className="h-12 w-12 mx-auto mb-2" data-testid={`icon-badge-${badge.id}`} />
                <h4 className="font-medium text-sm" data-testid={`name-badge-${badge.id}`}>
                  {badge.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1" data-testid={`desc-badge-${badge.id}`}>
                  {badge.description}
                </p>
                <BadgeUI variant="outline" className="mt-2 text-xs" data-testid={`rarity-badge-${badge.id}`}>
                  {badge.rarity}
                </BadgeUI>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
