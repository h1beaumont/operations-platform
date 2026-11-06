import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Calendar, MapPin, AlertTriangle, CheckCircle, Camera, Flag } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface RoomRating {
  id: string;
  roomName: string;
  rating: string;
  goodPercentage: number;
  fairPercentage: number;
  poorPercentage: number;
  imagesCount: number;
  flags: number;
  questions: string[];
  answers: string[];
  notes: string | null;
}

interface InspectionDetail {
  id: string;
  propertyAddress: string;
  inspectionDate: string;
  inspectorName?: string;
  inspectorEmail?: string;
  overallGoodPercentage: number;
  overallFairPercentage: number;
  overallPoorPercentage: number;
  totalIssuesCount: number;
  daysSinceLastCleaning?: number;
  lastCleaningDate?: string;
  lastCleanerInfo?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  rooms: RoomRating[];
}

export default function RentCheckInspectionDetail() {
  const [, params] = useRoute("/rentcheck-inspections/:id");
  const inspectionId = params?.id;

  const { data: inspection, isLoading } = useQuery<InspectionDetail>({
    queryKey: ['/api/rentcheck/inspections', inspectionId],
    queryFn: async () => {
      const response = await fetch(`/api/rentcheck/inspections/${inspectionId}`);
      if (!response.ok) throw new Error('Failed to fetch inspection');
      return response.json();
    },
    enabled: !!inspectionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">Loading inspection details...</p>
        </div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">Inspection not found</p>
        </div>
      </div>
    );
  }

  const getRatingBadgeVariant = (rating: string) => {
    if (rating === 'Good') return 'default';
    if (rating === 'Fair') return 'secondary';
    if (rating === 'Poor') return 'destructive';
    return 'outline';
  };

  const getRatingColor = (rating: string) => {
    if (rating === 'Good') return 'bg-green-500';
    if (rating === 'Fair') return 'bg-yellow-500';
    if (rating === 'Poor') return 'bg-red-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/rentcheck-inspections">
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Inspection Details</h1>
            <p className="text-muted-foreground">{inspection.propertyAddress}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {Math.round(inspection.overallGoodPercentage)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {Math.round(inspection.overallFairPercentage)}% Fair, {Math.round(inspection.overallPoorPercentage)}% Poor
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Issues Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${inspection.totalIssuesCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {inspection.totalIssuesCount}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {inspection.totalIssuesCount === 0 ? 'No issues detected' : 'Items rated Fair/Poor'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inspection Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {format(new Date(inspection.inspectionDate), 'MMM dd, yyyy')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {inspection.inspectorName || 'Unknown Inspector'}
              </div>
            </CardContent>
          </Card>
        </div>

        {inspection.lastCleanerInfo && (
          <Card className={inspection.totalIssuesCount > 0 ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Cleaner Accountability
              </CardTitle>
              <CardDescription>
                Last cleaning before inspection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">{inspection.lastCleanerInfo.name}</p>
                  {inspection.lastCleanerInfo.email && (
                    <p className="text-sm text-muted-foreground">{inspection.lastCleanerInfo.email}</p>
                  )}
                </div>
                {inspection.daysSinceLastCleaning !== null && inspection.daysSinceLastCleaning !== undefined && (
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {inspection.daysSinceLastCleaning} days ago
                  </Badge>
                )}
              </div>
              {inspection.lastCleaningDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Last cleaned: {format(new Date(inspection.lastCleaningDate), 'MMM dd, yyyy')}
                </div>
              )}
              {inspection.totalIssuesCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                  This cleaner is accountable for {inspection.totalIssuesCount} issue{inspection.totalIssuesCount !== 1 ? 's' : ''} found during inspection
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Room-by-Room Breakdown</CardTitle>
            <CardDescription>
              Detailed ratings for each inspected area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inspection.rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden" data-testid={`room-${room.id}`}>
                <div className={`h-1 ${getRatingColor(room.rating)}`} />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{room.roomName}</CardTitle>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant={getRatingBadgeVariant(room.rating)}>
                          {room.rating}
                        </Badge>
                        {room.imagesCount > 0 && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Camera className="w-4 h-4" />
                            {room.imagesCount} image{room.imagesCount !== 1 ? 's' : ''}
                          </div>
                        )}
                        {room.flags > 0 && (
                          <div className="flex items-center gap-1 text-sm text-orange-600">
                            <Flag className="w-4 h-4" />
                            {room.flags} flag{room.flags !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {Math.round(room.goodPercentage)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Good rating
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {room.questions && room.questions.length > 0 && (
                    <div className="space-y-2">
                      {room.questions.map((question, idx) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium text-muted-foreground">{question}</p>
                          {room.answers[idx] && (
                            <p className="mt-1">{room.answers[idx]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {room.notes && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm">{room.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
