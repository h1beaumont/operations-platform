import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trophy, Medal, Award, TrendingUp, QrCode, Smartphone, Star, CheckCircle2, Clock } from "lucide-react";
import type { Staff } from "@shared/schema";
import logoPath from "@assets/Northstay logo black-01 (8)_1761129570743.png";

type LeaderboardEntry = {
  staff: Staff;
  avgScore: number;
  totalEvents: number;
};

type PrizeSettings = {
  id: string;
  firstPlacePrize: string;
  secondPlacePrize: string;
  thirdPlacePrize: string;
};

// Compliance scoring breakdown - must match COMPLIANCE_WEIGHTS in server/routes.ts
const COMPLIANCE_ACTIVITIES = [
  { activity: "Arrived on time", points: 1.5 },
  { activity: "Signed into property on time", points: 1.0 },
  { activity: "Taken all photos and completed all tasks on Properly", points: 2.0 },
  { activity: "Ensured all damage is reported on time", points: 2.0 },
  { activity: "Used correct staff entrance at Head Office", points: 0.5 },
  { activity: "Signed in/out trolley at start and end of shift", points: 1.0 },
  { activity: "Signed in/out cleaning caddy with all items", points: 1.0 },
  { activity: "Used the chatbot every time linen was packed", points: 1.5 },
  { activity: "Did not miss any special requests in the chatbot", points: 1.5 },
  { activity: "Placed used linen in hampers (not on floor)", points: 1.0 },
  { activity: "Finished cleans on time; told us if overran", points: 2.0 },
  { activity: "Submitted availability on time", points: 1.0 },
];

// Calculate max points from activities to ensure accuracy
const MAX_DAILY_POINTS = COMPLIANCE_ACTIVITIES.reduce((sum, item) => sum + item.points, 0);

export default function LeaderboardTV() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { data: leaderboard = [], refetch } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/staff/leaderboard/public"],
  });

  // Fetch QR code for cleaning assistant
  const { data: qrData } = useQuery<{ qrCode: string; url: string }>({
    queryKey: ["/api/cleaning-assistant/qr-code"],
  });

  // Fetch prize settings
  const { data: prizeSettings } = useQuery<PrizeSettings>({
    queryKey: ["/api/prize-settings"],
  });

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Filter out anyone with 0 points - only show staff with points
  const staffWithPoints = leaderboard.filter(entry => entry.avgScore > 0);
  
  // Already sorted by avgScore from API
  const topThree = staffWithPoints.slice(0, 3);
  const others = staffWithPoints.slice(3); // All others with points
  
  // Determine bottom 3 positions (people at risk)
  const totalWithPoints = staffWithPoints.length;
  const bottomThreeStartIndex = Math.max(0, totalWithPoints - 3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-20 h-20 text-yellow-500" />;
      case 2:
        return <Medal className="w-20 h-20 text-gray-400" />;
      case 3:
        return <Award className="w-20 h-20 text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number) => {
    const badges = {
      1: "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white",
      2: "bg-gradient-to-br from-gray-300 to-gray-500 text-white",
      3: "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
    };
    return badges[rank as keyof typeof badges] || "bg-card text-card-foreground";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Extract first name only for GDPR compliance
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-8 pb-24">
      {/* QR Code for Cleaning Chatbot - AT THE TOP, LARGE AND SCANNABLE */}
      {qrData && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-3xl shadow-2xl p-12 border-8 border-red-500">
            {/* Critical Warning */}
            <div className="bg-red-600 text-white rounded-2xl p-8 mb-8 text-center shadow-xl">
              <div className="flex items-center justify-center gap-4 mb-4">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-5xl font-black uppercase">IMPORTANT!</h3>
              </div>
              <p className="text-4xl font-bold leading-tight">
                MUST CHECK FOR SPECIAL REQUEST ITEMS
              </p>
              <p className="text-2xl mt-4 opacity-90">
                Replacement cutlery, glasses, lamps, duvets, and any items reported from previous cleans
              </p>
            </div>

            {/* Large QR Code - Centered and Prominent */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-12 rounded-3xl shadow-2xl mb-8" style={{ maxWidth: '600px', width: '100%' }}>
                <img 
                  src={qrData.qrCode} 
                  alt="Cleaning Assistant QR Code" 
                  className="w-full h-auto"
                  data-testid="img-tv-qr-code"
                />
              </div>

              {/* Instructions */}
              <div className="text-center space-y-6 max-w-3xl">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Smartphone className="w-16 h-16 text-primary" />
                  <h3 className="text-5xl font-bold">Scan QR Code</h3>
                </div>
                <p className="text-3xl text-muted-foreground font-semibold">Use AI Chatbot for Linen Packing</p>

                <div className="grid grid-cols-3 gap-6 mt-8">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold mb-2">Get Instant Answers</div>
                    <div className="text-lg text-muted-foreground">Ask about linen quantities and special requests</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold mb-2">Earn Points</div>
                    <div className="text-lg text-muted-foreground">+1.5 pts for using chatbot every time</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <div className="text-2xl font-bold mb-2">No Missed Requests</div>
                    <div className="text-lg text-muted-foreground">+1.5 pts bonus for accuracy</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Clock */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border-8 border-primary" data-testid="live-clock">
          <div className="flex items-center justify-center gap-6 mb-4">
            <Clock className="w-16 h-16 text-primary" />
            <h3 className="text-5xl font-bold">CURRENT TIME</h3>
          </div>
          <div className="text-center">
            <div className="text-9xl font-black text-primary mb-3 tracking-tight" data-testid="text-current-time">
              {formatTime(currentTime)}
            </div>
            <div className="text-3xl font-semibold text-muted-foreground" data-testid="text-current-date">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Office Number - ONLY this, NO Direct Booking Link */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border-4 border-gray-300 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <div className="text-lg text-muted-foreground mb-1">Office Number</div>
                <div className="text-4xl font-bold" data-testid="text-office-number">+44 7700 900000</div>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('+44 7700 900000');
              }}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl flex items-center gap-3 text-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              data-testid="button-copy-office"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <TrendingUp className="w-16 h-16 text-primary" />
          <h1 className="text-7xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Staff Leaderboard
          </h1>
        </div>
        <p className="text-3xl text-muted-foreground">Excellence in Cleaning Performance</p>
      </div>

      {/* Prize Banner */}
      {prizeSettings && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-center gap-8 text-white">
              <div className="text-center">
                <Trophy className="w-12 h-12 mx-auto mb-2" />
                <div className="text-2xl font-bold">1st Place</div>
                <div className="text-4xl font-black">{prizeSettings.firstPlacePrize}</div>
              </div>
              <div className="text-center">
                <Medal className="w-12 h-12 mx-auto mb-2" />
                <div className="text-2xl font-bold">2nd Place</div>
                <div className="text-4xl font-black">{prizeSettings.secondPlacePrize}</div>
              </div>
              <div className="text-center">
                <Award className="w-12 h-12 mx-auto mb-2" />
                <div className="text-2xl font-bold">3rd Place</div>
                <div className="text-4xl font-black">{prizeSettings.thirdPlacePrize}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-8 max-w-[1800px] mx-auto">
        {/* Left Column: Top 3 Podium + Rest of Top 10 */}
        <div className="col-span-2 space-y-8">
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-6">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center pt-12">
                <div className={`${getRankBadge(2)} rounded-3xl p-6 w-full text-center shadow-2xl transform hover:scale-105 transition-transform`}>
                  <div className="flex justify-center mb-3">
                    {getRankIcon(2)}
                  </div>
                  <div className="text-5xl font-bold mb-2">2nd</div>
                  <div className="text-2xl font-semibold mb-2">{getFirstName(topThree[1].staff.fullName)}</div>
                  <div className="text-4xl font-bold">{topThree[1].avgScore.toFixed(1)}</div>
                  <div className="text-lg opacity-90 mt-1">points</div>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center">
                <div className={`${getRankBadge(1)} rounded-3xl p-8 w-full text-center shadow-2xl transform scale-110 z-10`}>
                  <div className="flex justify-center mb-3">
                    {getRankIcon(1)}
                  </div>
                  <div className="text-6xl font-bold mb-2">1st</div>
                  <div className="text-3xl font-semibold mb-3">{getFirstName(topThree[0].staff.fullName)}</div>
                  <div className="text-5xl font-bold">{topThree[0].avgScore.toFixed(1)}</div>
                  <div className="text-xl opacity-90 mt-2">points</div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center pt-12">
                <div className={`${getRankBadge(3)} rounded-3xl p-6 w-full text-center shadow-2xl transform hover:scale-105 transition-transform`}>
                  <div className="flex justify-center mb-3">
                    {getRankIcon(3)}
                  </div>
                  <div className="text-5xl font-bold mb-2">3rd</div>
                  <div className="text-2xl font-semibold mb-2">{getFirstName(topThree[2].staff.fullName)}</div>
                  <div className="text-4xl font-bold">{topThree[2].avgScore.toFixed(1)}</div>
                  <div className="text-lg opacity-90 mt-1">points</div>
                </div>
              </div>
            )}
          </div>

          {/* Rest of Performers */}
          {others.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-center mb-4">All Performers</h2>
              <div className="space-y-3">
                {others.map((entry, index) => {
                  const actualRank = index + 4; // 4th place onwards
                  const globalIndex = actualRank - 1; // 0-indexed position in staffWithPoints array
                  const isBottomThree = globalIndex >= bottomThreeStartIndex;
                  
                  return (
                    <div
                      key={entry.staff.id}
                      className={`rounded-2xl p-4 shadow-lg flex items-center justify-between hover:shadow-xl transition-shadow ${
                        isBottomThree 
                          ? 'bg-red-100 dark:bg-red-900/40 border-4 border-red-500' 
                          : 'bg-card'
                      }`}
                      data-testid={`leaderboard-rank-${actualRank}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold w-16 text-center ${
                          isBottomThree ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                        }`}>
                          #{actualRank}
                        </div>
                        <div className={`text-2xl font-semibold ${
                          isBottomThree ? 'text-red-700 dark:text-red-300' : ''
                        }`}>
                          {getFirstName(entry.staff.fullName)}
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${
                        isBottomThree ? 'text-red-600 dark:text-red-400' : 'text-primary'
                      }`}>
                        {entry.avgScore.toFixed(1)}
                        <span className="text-xl ml-2 opacity-75">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Points Breakdown */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-10 h-10 text-yellow-500" />
              <h2 className="text-3xl font-bold">How to Earn Points</h2>
            </div>
            
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl text-white text-center">
              <div className="text-xl font-semibold mb-1">Maximum Daily Score</div>
              <div className="text-5xl font-black">{MAX_DAILY_POINTS}</div>
              <div className="text-lg">points per day</div>
            </div>

            <div className="space-y-2 max-h-[800px] overflow-y-auto">
              {COMPLIANCE_ACTIVITIES.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 bg-card rounded-xl hover:bg-accent/50 transition-colors"
                  data-testid={`points-activity-${index}`}
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-tight">{item.activity}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-primary">{item.points}</div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 space-y-6">
        <div className="text-2xl text-muted-foreground">
          Updated every 30 seconds • Keep up the great work!
        </div>
        
        {/* Northstay Logo */}
        <div className="flex justify-center">
          <img 
            src={logoPath} 
            alt="Northstay" 
            className="h-16 w-auto opacity-70"
            data-testid="img-company-logo"
          />
        </div>
      </div>
    </div>
  );
}
