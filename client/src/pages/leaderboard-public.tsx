import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import type { Staff } from "@shared/schema";
import logoPath from "@assets/Northstay logo black-01 (8)_1761129570743.png";

type LeaderboardEntry = {
  staff: Staff;
  avgScore: number;
  totalEvents: number;
};

export default function LeaderboardPublic() {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data: leaderboard = [], refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/staff/leaderboard/public"],
  });

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastUpdate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" data-testid="icon-rank-1" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" data-testid="icon-rank-2" />;
      case 3:
        return <Award className="w-8 h-8 text-amber-700" data-testid="icon-rank-3" />;
      default:
        return null;
    }
  };

  const getRankBgClass = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-300 dark:border-yellow-700";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/20 border-gray-300 dark:border-gray-600";
      case 3:
        return "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-300 dark:border-amber-700";
      default:
        return "bg-card border-border";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2"
          data-testid="heading-leaderboard"
        >
          Staff Leaderboard
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground" data-testid="text-subtitle">
          Performance Rankings
        </p>
      </div>

      {/* Leaderboard List */}
      <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
        {leaderboard.map((entry, index) => {
          const rank = index + 1;
          const isTopThree = rank <= 3;
          
          return (
            <div
              key={entry.staff.id}
              className={`
                rounded-xl border-2 p-4 sm:p-5
                ${getRankBgClass(rank)}
                ${isTopThree ? 'shadow-lg' : 'shadow-md'}
                transition-all hover:shadow-xl
              `}
              data-testid={`card-leaderboard-${rank}`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Rank */}
                <div className="flex items-center justify-center min-w-[60px] sm:min-w-[80px]">
                  {isTopThree ? (
                    <div className="flex flex-col items-center">
                      {getRankIcon(rank)}
                      <div className="text-xl sm:text-2xl font-bold mt-1" data-testid={`text-rank-${rank}`}>
                        #{rank}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="text-2xl sm:text-3xl font-bold text-muted-foreground"
                      data-testid={`text-rank-${rank}`}
                    >
                      #{rank}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-lg sm:text-xl md:text-2xl font-semibold truncate"
                    data-testid={`text-name-${rank}`}
                  >
                    {entry.staff.fullName}
                  </div>
                  <div 
                    className="text-sm text-muted-foreground"
                    data-testid={`text-events-${rank}`}
                  >
                    {entry.totalEvents} compliance {entry.totalEvents === 1 ? 'event' : 'events'}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div 
                    className={`
                      text-2xl sm:text-3xl md:text-4xl font-bold
                      ${isTopThree ? 'text-primary' : 'text-foreground'}
                    `}
                    data-testid={`text-score-${rank}`}
                  >
                    {entry.avgScore.toFixed(1)}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    points
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <div 
            className="text-center py-12 text-muted-foreground"
            data-testid="text-no-data"
          >
            <p className="text-lg">No leaderboard data available yet.</p>
            <p className="text-sm mt-2">Compliance events will appear here once submitted.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 sm:mt-12 space-y-4">
        <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-update-info">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Auto-refreshes every 60 seconds
        </p>
        
        {/* Northstay Logo */}
        <div className="flex justify-center mt-6">
          <img 
            src={logoPath} 
            alt="Northstay" 
            className="h-12 sm:h-16 w-auto opacity-60 hover:opacity-100 transition-opacity"
            data-testid="img-company-logo"
          />
        </div>
      </div>
    </div>
  );
}
