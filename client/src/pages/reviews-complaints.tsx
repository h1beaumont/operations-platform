import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ReviewComplaint, ActionItem, InsertReviewComplaint } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  MessageSquare,
  Star,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Plus,
  Filter,
  Send,
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Minus,
  ChevronRight,
  BarChart3,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ReviewTheme {
  id: string;
  reviewId: string;
  theme: string;
  confidence: number;
  createdAt: Date;
}

interface ExtendedReviewComplaint extends ReviewComplaint {
  categories?: any[];
  actionItems?: ActionItem[];
  themes?: ReviewTheme[];
}

const responseFormSchema = z.object({
  responseText: z.string().min(10, "Response must be at least 10 characters"),
});

const actionFormSchema = z.object({
  description: z.string().min(5, "Description must be at least 5 characters"),
  assignedTo: z.string().min(1, "Please assign to a staff member"),
  dueDate: z.string().min(1, "Please set a due date"),
});

const reviewFormSchema = z.object({
  propertyId: z.string().min(1, "Please select a property"),
  guestName: z.string().min(1, "Guest name is required"),
  guestEmail: z.string().email("Invalid email address"),
  source: z.string().min(1, "Please select a source"),
  type: z.string().min(1, "Please select type"),
  rating: z.number().min(1).max(5).nullable(),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  priority: z.string().optional(),
});

export default function ReviewsComplaints() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [selectedReview, setSelectedReview] = useState<ExtendedReviewComplaint | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showAddReviewDialog, setShowAddReviewDialog] = useState(false);
  const [filters, setFilters] = useState<any>({});
  const [showSendComplaintFormDialog, setShowSendComplaintFormDialog] = useState(false);
  const [selectedPropertyForLink, setSelectedPropertyForLink] = useState("");
  const [guestNameForLink, setGuestNameForLink] = useState("");
  const [guestContactForLink, setGuestContactForLink] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"link" | "sms">("link");
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedTokenId, setGeneratedTokenId] = useState("");

  // Queries
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<ExtendedReviewComplaint[]>({
    queryKey: ['/api/reviews', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/reviews?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    // Auto-refresh every 3 seconds if there are reviews without themes (AI analyzing)
    refetchInterval: (query) => {
      const data = query?.state?.data;
      if (!data || !Array.isArray(data)) return false;
      // Check if any reviews were created in last 30 seconds and don't have themes yet
      const now = Date.now();
      const hasRecentReviewsWithoutThemes = data.some((review) => {
        const createdAt = new Date(review.createdAt).getTime();
        const isRecent = now - createdAt < 30000; // Within last 30 seconds
        const hasNoThemes = !review.themes || review.themes.length === 0;
        return isRecent && hasNoThemes;
      });
      // Poll every 3 seconds if there are recent reviews without themes
      return hasRecentReviewsWithoutThemes ? 3000 : false;
    },
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<ReviewComplaint[]>({
    queryKey: ['/api/reviews/alerts'],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/reviews/analytics'],
  });

  const { data: complaintAnalytics, isLoading: complaintAnalyticsLoading } = useQuery({
    queryKey: ['/api/complaints/analytics'],
  });

  const { data: themes = [] } = useQuery({
    queryKey: ['/api/reviews/themes'],
  });
  
  const { data: themesSummary = [] } = useQuery({
    queryKey: ['/api/reviews/themes-summary'],
    // Auto-refresh every 5 seconds if there are reviews without themes
    refetchInterval: () => {
      if (!reviews || !Array.isArray(reviews) || reviews.length === 0) return false;
      const now = Date.now();
      const hasRecentReviewsWithoutThemes = reviews.some((review) => {
        const createdAt = new Date(review.createdAt).getTime();
        const isRecent = now - createdAt < 30000;
        const hasNoThemes = !review.themes || review.themes.length === 0;
        return isRecent && hasNoThemes;
      });
      return hasRecentReviewsWithoutThemes ? 5000 : false;
    },
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  const { data: actionItems = [] } = useQuery<ActionItem[]>({
    queryKey: ['/api/action-items'],
  });

  const { data: complaintTokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['/api/complaints/tokens'],
  });

  // Forms
  const responseForm = useForm({
    resolver: zodResolver(responseFormSchema),
    defaultValues: {
      responseText: "",
    },
  });

  const actionForm = useForm({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      description: "",
      assignedTo: "",
      dueDate: "",
    },
  });

  const reviewForm = useForm({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      propertyId: "",
      guestName: "",
      guestEmail: "",
      source: "Direct",
      type: "review",
      rating: null,
      title: "",
      content: "",
      priority: "medium",
    },
  });

  // Mutations
  const createReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/reviews', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/analytics'] });
      toast({
        title: "Success",
        description: "Review/complaint added successfully",
      });
      setShowAddReviewDialog(false);
      reviewForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add review/complaint",
        variant: "destructive",
      });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest('PATCH', `/api/reviews/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      toast({
        title: "Success",
        description: "Review updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      });
    },
  });

  const respondToReviewMutation = useMutation({
    mutationFn: async ({ id, responseText }: { id: string; responseText: string }) => {
      return await apiRequest('POST', `/api/reviews/${id}/respond`, { responseText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      toast({
        title: "Success",
        description: "Response sent successfully",
      });
      setShowResponseDialog(false);
      responseForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive",
      });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/reviews/${selectedReview?.id}/action`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      toast({
        title: "Success",
        description: "Action item created successfully",
      });
      setShowActionDialog(false);
      actionForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create action item",
        variant: "destructive",
      });
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('POST', `/api/action-items/${id}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
      toast({
        title: "Success",
        description: "Action item completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete action item",
        variant: "destructive",
      });
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (data: { propertyId: string; guestContact: string; guestName?: string }) => {
      const response = await apiRequest("POST", "/api/complaints/tokens", data);
      return await response.json();
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/complaint/${data.rawToken}`;
      setGeneratedLink(link);
      setGeneratedTokenId(data.id);
      toast({ title: "Link generated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      return apiRequest("POST", `/api/complaints/tokens/${tokenId}/send-sms`, {});
    },
    onSuccess: () => {
      toast({ title: "SMS sent successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateAiResponseMutation = useMutation({
    mutationFn: async (complaintId: string) => {
      return apiRequest("POST", `/api/complaints/${complaintId}/generate-response`, {});
    },
    onSuccess: () => {
      toast({ title: "AI response generated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate AI response",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeReviewThemesMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return apiRequest("POST", `/api/reviews/${reviewId}/analyze-themes`, {});
    },
    onSuccess: () => {
      toast({ title: "Themes analyzed successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/themes-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to analyze themes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const batchAnalyzeThemesMutation = useMutation({
    mutationFn: async (filters: any = {}) => {
      return apiRequest("POST", '/api/reviews/analyze-all-themes', { filters });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Batch analysis complete",
        description: `Analyzed ${data.analyzed} reviews with ${data.totalThemes} total themes detected`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/themes-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to analyze themes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    
    const variants: Record<string, "destructive" | "secondary" | "default"> = {
      critical: "destructive",
      high: "destructive",
      medium: "secondary",
      low: "default",
    };

    return (
      <Badge variant={variants[priority] || "default"}>
        {priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      new: "destructive",
      acknowledged: "secondary",
      resolved: "default",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status}
      </Badge>
    );
  };

  const onResponseSubmit = responseForm.handleSubmit((data) => {
    if (selectedReview) {
      respondToReviewMutation.mutate({
        id: selectedReview.id,
        responseText: data.responseText,
      });
    }
  });

  const onActionSubmit = actionForm.handleSubmit((data) => {
    createActionMutation.mutate(data);
  });

  const onReviewSubmit = reviewForm.handleSubmit((data) => {
    createReviewMutation.mutate(data);
  });

  const handleGenerateComplaintLink = () => {
    if (!selectedPropertyForLink || !guestContactForLink) return;
    
    generateLinkMutation.mutate({
      propertyId: selectedPropertyForLink,
      guestContact: guestContactForLink,
      guestName: guestNameForLink || undefined,
    });
  };

  const handleSendComplaintFormSMS = () => {
    if (!generatedTokenId) return;
    sendSmsMutation.mutate(generatedTokenId);
  };

  const handleGenerateAIResponse = (complaintId: string) => {
    generateAiResponseMutation.mutate(complaintId);
  };

  // Filter complaints
  const complaints = reviews.filter(r => r.type === 'complaint');
  const unresolvedComplaints = complaints.filter(c => c.status === 'new');

  // Prepare chart data
  const sentimentData = analytics ? [
    { name: 'Positive', value: analytics.sentimentDistribution.positive, fill: '#10b981' },
    { name: 'Neutral', value: analytics.sentimentDistribution.neutral, fill: '#f59e0b' },
    { name: 'Negative', value: analytics.sentimentDistribution.negative, fill: '#ef4444' },
  ] : [];

  const ratingData = reviews.reduce((acc, review) => {
    if (review.rating) {
      const existing = acc.find(item => item.rating === review.rating);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ rating: review.rating, count: 1 });
      }
    }
    return acc;
  }, [] as { rating: number; count: number }[]).sort((a, b) => a.rating - b.rating);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Reviews & Complaints</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage guest feedback, track sentiment, and respond to complaints
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowSendComplaintFormDialog(true)}
            className="gap-2"
            data-testid="button-send-complaint-form"
          >
            <Send className="h-4 w-4" />
            Send Complaint Form
          </Button>
          <Button 
            onClick={() => batchAnalyzeThemesMutation.mutate(filters)}
            className="gap-2"
            variant="outline"
            disabled={batchAnalyzeThemesMutation.isPending}
            data-testid="button-analyze-themes"
          >
            <BarChart3 className="h-4 w-4" />
            {batchAnalyzeThemesMutation.isPending ? "Analyzing..." : "Analyze Themes"}
          </Button>
          <Button 
            onClick={() => setShowAddReviewDialog(true)}
            className="gap-2"
            data-testid="button-add-review"
          >
            <Plus className="h-4 w-4" />
            Add Review/Complaint
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <Alert className="border-red-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle data-testid="text-critical-alerts">Critical Alerts</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between">
                  <span className="text-sm" data-testid={`text-alert-${alert.id}`}>
                    <strong>{alert.guestName}</strong> - {alert.title}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReview(alert as ExtendedReviewComplaint);
                      setShowResponseDialog(true);
                    }}
                    data-testid={`button-respond-alert-${alert.id}`}
                  >
                    Respond
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
          <TabsTrigger value="complaints" data-testid="tab-complaints">Complaints</TabsTrigger>
          <TabsTrigger value="tokens" data-testid="tab-tokens">Tokens</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="improvement" data-testid="tab-improvement">Improvement</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-total-reviews">Total Reviews</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-reviews">
                  {analytics?.totalReviews || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-avg-rating">Avg Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-rating">
                  {analytics?.averageRating?.toFixed(1) || '0.0'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-response-rate">Response Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-response-rate">
                  {analytics?.responseRate?.toFixed(0) || 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-critical-issues">Critical Issues</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-critical-issues">
                  {analytics?.criticalComplaints || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-recent-reviews">Recent Reviews</CardTitle>
              <CardDescription data-testid="card-desc-recent-reviews">Latest feedback from guests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="flex items-start space-x-4">
                    <div className={cn("mt-1", getSentimentColor(review.sentiment))} data-testid={`badge-sentiment-${review.id}`}>
                      {getSentimentIcon(review.sentiment)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium" data-testid={`text-review-guest-${review.id}`}>
                          {review.guestName}
                        </p>
                        {review.rating && (
                          <div className="flex items-center gap-1" data-testid={`rating-${review.id}`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs" data-testid={`badge-source-${review.id}`}>
                          {review.source}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium" data-testid={`text-review-title-${review.id}`}>
                        {review.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-review-content-${review.id}`}>
                        {review.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedReview(review);
                        setShowResponseDialog(true);
                      }}
                      disabled={!!review.responseText}
                      data-testid={`button-respond-${review.id}`}
                    >
                      {review.responseText ? "Responded" : "Respond"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card data-testid="card-sentiment-distribution">
              <CardHeader>
                <CardTitle data-testid="card-title-sentiment-dist">Sentiment Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <div className="space-y-2 mb-4">
                  {sentimentData.map((entry) => (
                    <div key={entry.name} className="flex justify-between text-sm">
                      <span data-testid={`text-sentiment-${entry.name.toLowerCase()}-label`}>{entry.name}</span>
                      <span data-testid={`text-sentiment-${entry.name.toLowerCase()}-count`} className="font-medium">{entry.value}</span>
                      <span data-testid={`text-sentiment-${entry.name.toLowerCase()}-percentage`} className="text-muted-foreground">
                        {analytics && analytics.totalReviews > 0 
                          ? ((entry.value / analytics.totalReviews) * 100).toFixed(1) 
                          : 0}%
                      </span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-rating-distribution">
              <CardHeader>
                <CardTitle data-testid="card-title-rating-dist">Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ratingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle data-testid="card-title-all-reviews">All Reviews</CardTitle>
                  <CardDescription data-testid="card-desc-all-reviews">Complete list of guest reviews and feedback</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={filters.sentiment || "all"}
                    onValueChange={(value) => setFilters({ ...filters, sentiment: value === "all" ? undefined : value })}
                  >
                    <SelectTrigger className="w-[150px]" data-testid="select-sentiment-filter">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? undefined : value })}
                  >
                    <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.theme || "all"}
                    onValueChange={(value) => setFilters({ ...filters, theme: value === "all" ? undefined : value })}
                  >
                    <SelectTrigger className="w-[180px]" data-testid="select-theme-filter">
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Themes</SelectItem>
                      <SelectItem value="Cleanliness">Cleanliness</SelectItem>
                      <SelectItem value="Location">Location</SelectItem>
                      <SelectItem value="Value for Money">Value for Money</SelectItem>
                      <SelectItem value="Communication">Communication</SelectItem>
                      <SelectItem value="Amenities">Amenities</SelectItem>
                      <SelectItem value="Accuracy">Accuracy</SelectItem>
                      <SelectItem value="Noise">Noise</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Check-in/Check-out">Check-in/Check-out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Themes</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id} data-testid={`row-review-${review.id}`}>
                      <TableCell>
                        {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-guest-name-${review.id}`}>{review.guestName}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-review-title-table-${review.id}`}>{review.title}</p>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-property-name-${review.id}`}>
                        {properties.find(p => p.id === review.propertyId)?.name || review.propertyId}
                      </TableCell>
                      <TableCell>
                        {review.rating && (
                          <div className="flex items-center gap-1" data-testid={`rating-stars-${review.id}`}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                )}
                                data-testid={`star-${i + 1}-${review.id}`}
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={cn("flex items-center gap-1", getSentimentColor(review.sentiment))} data-testid={`badge-sentiment-table-${review.id}`}>
                          {getSentimentIcon(review.sentiment)}
                          <span className="text-sm capitalize">{review.sentiment}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span data-testid={`badge-status-${review.id}`}>
                          {getStatusBadge(review.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-[200px]" data-testid={`themes-${review.id}`}>
                          {review.themes && review.themes.length > 0 ? (
                            review.themes.slice(0, 3).map((theme, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs" data-testid={`badge-theme-${theme.theme}-${review.id}`}>
                                {theme.theme}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No themes</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-source-table-${review.id}`}>{review.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-menu-${review.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedReview(review);
                                setShowResponseDialog(true);
                              }}
                              disabled={!!review.responseText}
                              data-testid={`menu-respond-${review.id}`}
                            >
                              {review.responseText ? "View Response" : "Send Response"}
                            </DropdownMenuItem>
                            {review.type === 'complaint' && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedReview(review);
                                  setShowActionDialog(true);
                                }}
                                data-testid={`menu-action-${review.id}`}
                              >
                                Create Action Item
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => updateReviewMutation.mutate({
                                id: review.id,
                                data: { status: 'resolved' }
                              })}
                              disabled={review.status === 'resolved'}
                              data-testid={`menu-resolve-${review.id}`}
                            >
                              Mark as Resolved
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complaints Tab */}
        <TabsContent value="complaints" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle data-testid="card-title-complaints-mgmt">Complaints Management</CardTitle>
                  <CardDescription data-testid="card-desc-complaints-mgmt">Track and resolve guest complaints</CardDescription>
                </div>
                <Badge variant="destructive" className="text-lg px-3 py-1" data-testid="badge-unresolved-count">
                  {unresolvedComplaints.length} Unresolved
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complaints.map((complaint) => (
                  <Card key={complaint.id} className={cn(
                    "border-l-4",
                    complaint.priority === 'critical' ? "border-l-red-600" :
                    complaint.priority === 'high' ? "border-l-orange-600" :
                    complaint.priority === 'medium' ? "border-l-yellow-600" :
                    "border-l-gray-400"
                  )} data-testid={`card-complaint-${complaint.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" data-testid={`text-complaint-title-${complaint.id}`}>
                              {complaint.title}
                            </h3>
                            <span data-testid={`badge-priority-${complaint.id}`}>
                              {getPriorityBadge(complaint.priority)}
                            </span>
                            <span data-testid={`badge-status-complaint-${complaint.id}`}>
                              {getStatusBadge(complaint.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span data-testid={`text-complaint-guest-${complaint.id}`}>{complaint.guestName}</span> • <span data-testid={`text-complaint-date-${complaint.id}`}>{format(new Date(complaint.createdAt), 'PPP')}</span>
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-complaint-property-${complaint.id}`}>
                            {properties.find(p => p.id === complaint.propertyId)?.name || complaint.propertyId}
                          </p>
                        </div>
                        <Badge variant="outline" data-testid={`badge-complaint-source-${complaint.id}`}>{complaint.source}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm" data-testid={`text-complaint-content-${complaint.id}`}>
                        {complaint.content}
                      </p>
                      
                      {complaint.responseText && (
                        <div className="bg-muted p-4 rounded-lg space-y-2" data-testid={`complaint-response-${complaint.id}`}>
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Response
                          </p>
                          <p className="text-sm" data-testid={`text-complaint-response-${complaint.id}`}>{complaint.responseText}</p>
                          {complaint.respondedAt && (
                            <p className="text-xs text-muted-foreground" data-testid={`text-response-date-${complaint.id}`}>
                              Responded {formatDistanceToNow(new Date(complaint.respondedAt), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {!complaint.responseText && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedReview(complaint);
                              setShowResponseDialog(true);
                            }}
                            data-testid={`button-respond-complaint-${complaint.id}`}
                          >
                            Send Response
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReview(complaint);
                            setShowActionDialog(true);
                          }}
                          data-testid={`button-action-complaint-${complaint.id}`}
                        >
                          Create Action Item
                        </Button>
                        {complaint.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReviewMutation.mutate({
                              id: complaint.id,
                              data: { status: 'resolved' }
                            })}
                            data-testid={`button-resolve-complaint-${complaint.id}`}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-action-items">Action Items</CardTitle>
              <CardDescription data-testid="card-desc-action-items">Follow-up tasks from complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-action-${item.id}`}>
                      <TableCell data-testid={`text-action-description-${item.id}`}>{item.description}</TableCell>
                      <TableCell data-testid={`text-action-assigned-${item.id}`}>
                        {staff.find(s => s.id === item.assignedTo)?.name || item.assignedTo}
                      </TableCell>
                      <TableCell data-testid={`text-action-due-date-${item.id}`}>
                        {item.dueDate && format(new Date(item.dueDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'} data-testid={`badge-action-status-${item.id}`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeActionMutation.mutate(item.id)}
                            data-testid={`button-complete-action-${item.id}`}
                          >
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6">
            <Card data-testid="card-review-themes">
              <CardHeader>
                <CardTitle data-testid="card-title-themes-analysis">Review Themes Analysis</CardTitle>
                <CardDescription data-testid="card-desc-themes-analysis">AI-detected themes from guest reviews and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {themesSummary && themesSummary.length > 0 ? (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={themesSummary} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="theme" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3b82f6" name="Total Reviews" />
                        <Bar dataKey="positiveCount" fill="#10b981" name="Positive" />
                        <Bar dataKey="negativeCount" fill="#ef4444" name="Negative" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-themes">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No theme data available yet</p>
                    <p className="text-xs mt-2">Click "Analyze Themes" to detect themes in your reviews</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle data-testid="card-title-response-performance">Response Performance</CardTitle>
                <CardDescription data-testid="card-desc-response-performance">Average response times and rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Response Time</p>
                      <p className="text-2xl font-bold" data-testid="text-avg-response-time">
                        {analytics?.avgResponseTime?.toFixed(1) || '0'} hours
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Response Rate</p>
                      <p className="text-2xl font-bold" data-testid="text-analytics-response-rate">
                        {analytics?.responseRate?.toFixed(0) || '0'}%
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Unresolved Complaints</p>
                      <p className="text-2xl font-bold" data-testid="text-unresolved-complaints">
                        {unresolvedComplaints.length}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-tokens">Complaint Submission Tokens</CardTitle>
              <CardDescription data-testid="card-desc-tokens">
                View all generated complaint form links and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <div className="text-center py-8" data-testid="loading-tokens">
                  <p className="text-muted-foreground">Loading tokens...</p>
                </div>
              ) : complaintTokens.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-tokens">
                  <p className="text-muted-foreground">No tokens generated yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest Name</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complaintTokens.map((token: any) => {
                      const property = properties.find(p => p.id === token.propertyId);
                      return (
                        <TableRow key={token.id}>
                          <TableCell data-testid={`text-token-guest-${token.id}`}>
                            {token.guestName || '-'}
                          </TableCell>
                          <TableCell data-testid={`text-token-property-${token.id}`}>
                            {property?.name || token.propertyId}
                          </TableCell>
                          <TableCell data-testid={`text-token-contact-${token.id}`}>
                            {token.guestContact}
                          </TableCell>
                          <TableCell data-testid={`text-token-status-${token.id}`}>
                            <Badge 
                              variant={
                                token.status === 'active' ? 'default' :
                                token.status === 'expired' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {token.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-token-expires-${token.id}`}>
                            {format(new Date(token.expiresAt), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell data-testid={`text-token-created-${token.id}`}>
                            {format(new Date(token.createdAt), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvement Analytics Tab */}
        <TabsContent value="improvement" className="space-y-6">
          {complaintAnalyticsLoading ? (
            <div className="text-center py-12" data-testid="loading-improvement">
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          ) : complaintAnalytics ? (
            <>
              {/* Overview Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" data-testid="card-title-total-complaints-improve">Total Complaints</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-complaints">
                      {complaintAnalytics.overview.totalComplaints}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-unresolved-critical-note">
                      {complaintAnalytics.overview.unresolvedCritical > 0 && (
                        <span className="text-destructive font-medium">
                          {complaintAnalytics.overview.unresolvedCritical} critical unresolved
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" data-testid="card-title-resolution-rate">Resolution Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-resolution-rate">
                      {complaintAnalytics.overview.resolutionRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-resolved-count">
                      {complaintAnalytics.overview.resolvedComplaints} of {complaintAnalytics.overview.totalComplaints} resolved
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium" data-testid="card-title-avg-resolution-time">Avg Resolution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-avg-resolution-time-improved">
                      {complaintAnalytics.overview.avgResolutionTimeHours.toFixed(1)}h
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-avg-resolution-desc">
                      Average time to resolve complaints
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Actionable Insights */}
              {complaintAnalytics.insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="card-title-insights">
                      <BarChart3 className="h-5 w-5" />
                      Actionable Insights
                    </CardTitle>
                    <CardDescription data-testid="card-desc-insights">Key recommendations for improvement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {complaintAnalytics.insights.map((insight: any, index: number) => (
                        <Alert 
                          key={index}
                          className={cn(
                            insight.type === 'warning' && 'border-yellow-600',
                            insight.type === 'success' && 'border-green-600',
                            insight.type === 'info' && 'border-blue-600'
                          )}
                          data-testid={`alert-insight-${index}`}
                        >
                          {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                          {insight.type === 'success' && <CheckCircle className="h-4 w-4" />}
                          {insight.type === 'info' && <AlertCircle className="h-4 w-4" />}
                          <AlertTitle className="flex items-center justify-between" data-testid={`text-insight-title-${index}`}>
                            {insight.title}
                            {insight.actionable && (
                              <Badge variant={insight.priority === 'high' ? 'destructive' : 'secondary'} data-testid={`badge-insight-priority-${index}`}>
                                {insight.priority} priority
                              </Badge>
                            )}
                          </AlertTitle>
                          <AlertDescription data-testid={`text-insight-description-${index}`}>{insight.description}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Category Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="card-title-categories">Complaint Categories</CardTitle>
                    <CardDescription data-testid="card-desc-categories">Breakdown by issue type with trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      <div className="space-y-4">
                        {complaintAnalytics.categories.map((category: any, index: number) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize" data-testid={`text-category-${category.category}`}>
                                  {category.category}
                                </span>
                                {category.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-600" />}
                                {category.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-600" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{category.count}</Badge>
                                <Badge variant={category.avgPriority === 'critical' ? 'destructive' : 'secondary'}>
                                  {category.avgPriority}
                                </Badge>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${category.percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {category.percentage.toFixed(1)}% of total complaints
                              {category.trend !== 'stable' && (
                                <span className={cn(
                                  "ml-2 font-medium",
                                  category.trend === 'up' && "text-red-600",
                                  category.trend === 'down' && "text-green-600"
                                )}>
                                  {category.trendPercentage > 0 ? '+' : ''}{category.trendPercentage.toFixed(0)}% vs prev period
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="card-title-trends">Weekly Trends</CardTitle>
                    <CardDescription data-testid="card-desc-trends">Complaint volume and resolution over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={complaintAnalytics.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="complaints" stroke="#ef4444" name="New Complaints" />
                        <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Property Performance */}
              {complaintAnalytics.propertyPerformance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="card-title-property-performance">Property Performance</CardTitle>
                    <CardDescription data-testid="card-desc-property-performance">Properties with highest complaint rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Complaints</TableHead>
                          <TableHead>Avg Resolution Time</TableHead>
                          <TableHead>Common Issues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaintAnalytics.propertyPerformance.slice(0, 10).map((prop: any) => (
                          <TableRow key={prop.propertyId} data-testid={`row-property-performance-${prop.propertyId}`}>
                            <TableCell className="font-medium" data-testid={`text-property-name-${prop.propertyId}`}>{prop.propertyName}</TableCell>
                            <TableCell>
                              <Badge variant={prop.complaintCount > 5 ? 'destructive' : 'secondary'} data-testid={`badge-complaint-count-${prop.propertyId}`}>
                                {prop.complaintCount}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-avg-resolution-${prop.propertyId}`}>{prop.avgResolutionTimeHours.toFixed(1)}h</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1" data-testid={`issues-${prop.propertyId}`}>
                                {prop.commonIssues.map((issue: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs capitalize" data-testid={`badge-issue-${issue}-${prop.propertyId}`}>
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Repeat Complaints */}
              {complaintAnalytics.repeatComplaints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="card-title-repeat-complaints">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Repeat Complaints
                    </CardTitle>
                    <CardDescription data-testid="card-desc-repeat-complaints">Properties with recurring issues - immediate action required</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Issue</TableHead>
                          <TableHead>Occurrences</TableHead>
                          <TableHead>Last Reported</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {complaintAnalytics.repeatComplaints.slice(0, 15).map((repeat: any, idx: number) => (
                          <TableRow key={idx} data-testid={`row-repeat-complaint-${idx}`}>
                            <TableCell className="font-medium" data-testid={`text-repeat-property-${idx}`}>{repeat.propertyName}</TableCell>
                            <TableCell className="capitalize" data-testid={`text-repeat-category-${idx}`}>{repeat.category}</TableCell>
                            <TableCell>
                              <Badge variant="destructive" data-testid={`badge-repeat-count-${idx}`}>{repeat.count}x</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-repeat-last-${idx}`}>
                              {formatDistanceToNow(new Date(repeat.lastOccurrence), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={repeat.status === 'resolved' ? 'default' : 'destructive'} data-testid={`badge-repeat-status-${idx}`}>
                                {repeat.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Staff Performance */}
                {complaintAnalytics.staffPerformance.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle data-testid="card-title-staff-performance">Staff Response Performance</CardTitle>
                      <CardDescription data-testid="card-desc-staff-performance">Response times and resolution rates</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-80">
                        <div className="space-y-4">
                          {complaintAnalytics.staffPerformance.map((staff: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`card-staff-performance-${index}`}>
                              <div className="space-y-1">
                                <p className="font-medium" data-testid={`text-staff-name-${index}`}>{staff.staffName}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  <span data-testid={`text-staff-responses-${index}`}>{staff.complaintsResponded} responses</span>
                                  <span>•</span>
                                  <span data-testid={`text-staff-avg-time-${index}`}>{staff.avgResponseTimeHours.toFixed(1)}h avg</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={staff.resolutionRate >= 80 ? 'default' : 'secondary'} data-testid={`badge-staff-resolution-${index}`}>
                                  {staff.resolutionRate.toFixed(0)}% resolved
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Compensation Tracking */}
                <Card>
                  <CardHeader>
                    <CardTitle data-testid="card-title-compensation">Compensation Impact</CardTitle>
                    <CardDescription data-testid="card-desc-compensation">Financial impact of complaints</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground" data-testid="label-total-compensation">Total Compensation</p>
                        <p className="text-2xl font-bold" data-testid="text-total-compensation">£{complaintAnalytics.compensation.totalCompensated.toFixed(2)}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground" data-testid="label-avg-compensation">Average per Complaint</p>
                        <p className="text-2xl font-bold" data-testid="text-avg-compensation">£{complaintAnalytics.compensation.avgCompensation.toFixed(2)}</p>
                      </div>
                      {complaintAnalytics.compensation.compensationByReason.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium" data-testid="label-compensation-by-reason">By Reason</p>
                          {complaintAnalytics.compensation.compensationByReason.map((comp: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm" data-testid={`compensation-reason-${idx}`}>
                              <span className="text-muted-foreground capitalize" data-testid={`text-compensation-reason-${idx}`}>{comp.reason}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" data-testid={`badge-compensation-count-${idx}`}>{comp.count}x</Badge>
                                <span className="font-medium" data-testid={`text-compensation-amount-${idx}`}>£{comp.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center" data-testid="empty-complaint-analytics">
                <p className="text-muted-foreground">No complaint data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.responseText ? 'View Response' : 'Send Response'}
            </DialogTitle>
            <DialogDescription>
              Responding to: {selectedReview?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2" data-testid="original-review-content">
                <p className="text-sm font-medium">Original Review/Complaint:</p>
                <p className="text-sm" data-testid="text-original-content">{selectedReview.content}</p>
              </div>
              
              {selectedReview.responseText ? (
                <div className="bg-muted p-4 rounded-lg space-y-2" data-testid="existing-response">
                  <p className="text-sm font-medium">Response:</p>
                  <p className="text-sm" data-testid="text-existing-response">{selectedReview.responseText}</p>
                  {selectedReview.respondedAt && (
                    <p className="text-xs text-muted-foreground" data-testid="text-response-sent-date">
                      Sent {format(new Date(selectedReview.respondedAt), 'PPP')}
                    </p>
                  )}
                </div>
              ) : (
                <Form {...responseForm}>
                  <form onSubmit={onResponseSubmit} className="space-y-4">
                    <FormField
                      control={responseForm.control}
                      name="responseText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={6}
                              placeholder="Type your response here..."
                              data-testid="input-response-text"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={respondToReviewMutation.isPending}
                        data-testid="button-send-response"
                      >
                        Send Response
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}

              {/* AI Response Draft Section */}
              {selectedReview.type === 'complaint' && (
                <div className="mt-6 space-y-4" data-testid="ai-response-section">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold" data-testid="text-ai-response-heading">AI Response Draft</h3>
                    {!selectedReview.aiResponseGenerated && (
                      <Button
                        onClick={() => handleGenerateAIResponse(selectedReview.id)}
                        disabled={generateAiResponseMutation.isPending}
                        size="sm"
                        data-testid="button-generate-ai-response"
                      >
                        {generateAiResponseMutation.isPending ? "Generating..." : "Generate AI Response"}
                      </Button>
                    )}
                  </div>

                  {selectedReview.responseDraftSubject && selectedReview.responseDraftBody && (
                    <div className="space-y-3">
                      <div>
                        <Label data-testid="label-ai-subject">Subject Line</Label>
                        <div className="flex gap-2">
                          <Input
                            value={selectedReview.responseDraftSubject}
                            readOnly
                            data-testid="text-ai-subject"
                          />
                          <Button
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedReview.responseDraftSubject!);
                              toast({ title: "Subject copied" });
                            }}
                            data-testid="button-copy-ai-subject"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label data-testid="label-ai-body">Response Body</Label>
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={selectedReview.responseDraftBody}
                            readOnly
                            rows={12}
                            data-testid="text-ai-body"
                          />
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedReview.responseDraftBody!);
                              toast({ title: "Response copied to clipboard" });
                            }}
                            data-testid="button-copy-ai-body"
                            className="w-full"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Full Response
                          </Button>
                        </div>
                      </div>

                      {selectedReview.compensationAdvice && (
                        <Alert data-testid="alert-compensation-advice">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle data-testid="text-compensation-advice-title">Compensation Advice</AlertTitle>
                          <AlertDescription data-testid="text-compensation-advice-content">
                            {selectedReview.compensationAdvice.recommended}: {selectedReview.compensationAdvice.reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Item Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Action Item</DialogTitle>
            <DialogDescription>
              Create a follow-up task for this complaint
            </DialogDescription>
          </DialogHeader>
          
          <Form {...actionForm}>
            <form onSubmit={onActionSubmit} className="space-y-4">
              <FormField
                control={actionForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the action to be taken..."
                        data-testid="input-action-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={actionForm.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assign-to">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={actionForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-due-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createActionMutation.isPending}
                  data-testid="button-create-action"
                >
                  Create Action Item
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Send Complaint Form Dialog */}
      <Dialog open={showSendComplaintFormDialog} onOpenChange={setShowSendComplaintFormDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Complaint Form to Guest</DialogTitle>
            <DialogDescription>
              Generate a shareable complaint form link that can be sent via SMS or copied
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Property Selector */}
            <div>
              <Label data-testid="label-property-for-link">Property</Label>
              <Select value={selectedPropertyForLink} onValueChange={setSelectedPropertyForLink}>
                <SelectTrigger data-testid="select-property-for-link">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guest Name */}
            <div>
              <Label data-testid="label-guest-name">Guest Name</Label>
              <Input
                value={guestNameForLink}
                onChange={(e) => setGuestNameForLink(e.target.value)}
                placeholder="Guest name"
                data-testid="input-guest-name-for-link"
              />
            </div>

            {/* Guest Contact */}
            <div>
              <Label data-testid="label-guest-contact">Guest Contact (Phone or Email)</Label>
              <Input
                value={guestContactForLink}
                onChange={(e) => setGuestContactForLink(e.target.value)}
                placeholder="Phone or email"
                data-testid="input-guest-contact-for-link"
              />
            </div>

            {/* Delivery Method */}
            <div>
              <Label data-testid="label-delivery-method">Delivery Method</Label>
              <Select value={deliveryMethod} onValueChange={(v: "link" | "sms") => setDeliveryMethod(v)}>
                <SelectTrigger data-testid="select-delivery-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Copy Link</SelectItem>
                  <SelectItem value="sms">Send SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Link Button */}
            <Button
              onClick={handleGenerateComplaintLink}
              disabled={!selectedPropertyForLink || !guestContactForLink || generateLinkMutation.isPending}
              data-testid="button-generate-complaint-link"
            >
              {generateLinkMutation.isPending ? "Generating..." : "Generate Link"}
            </Button>

            {/* Display Generated Link */}
            {generatedLink && (
              <div className="p-4 bg-muted rounded-md space-y-2">
                <Label data-testid="label-generated-link">Generated Link</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly data-testid="input-generated-link" />
                  <Button
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast({ title: "Link copied to clipboard" });
                    }}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                
                {deliveryMethod === "sms" && (
                  <Button
                    onClick={handleSendComplaintFormSMS}
                    disabled={sendSmsMutation.isPending}
                    data-testid="button-send-complaint-sms"
                    className="w-full"
                  >
                    {sendSmsMutation.isPending ? "Sending..." : "Send SMS Now"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Review/Complaint Dialog */}
      <Dialog open={showAddReviewDialog} onOpenChange={setShowAddReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Review/Complaint</DialogTitle>
            <DialogDescription>
              Manually add a review or complaint received outside the platform
            </DialogDescription>
          </DialogHeader>
          
          <Form {...reviewForm}>
            <form onSubmit={onReviewSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={reviewForm.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={reviewForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={reviewForm.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-guest-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={reviewForm.control}
                  name="guestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guest Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-guest-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={reviewForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-source">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Airbnb">Airbnb</SelectItem>
                          <SelectItem value="Booking.com">Booking.com</SelectItem>
                          <SelectItem value="Direct">Direct</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {reviewForm.watch('type') === 'review' && (
                  <FormField
                    control={reviewForm.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-rating">
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <SelectItem key={rating} value={rating.toString()}>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={cn(
                                        "h-3 w-3",
                                        i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                      )}
                                    />
                                  ))}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {reviewForm.watch('type') === 'complaint' && (
                  <FormField
                    control={reviewForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <FormField
                control={reviewForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={reviewForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={6}
                        placeholder="Enter the review or complaint details..."
                        data-testid="input-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createReviewMutation.isPending}
                  data-testid="button-submit-review"
                >
                  Add {reviewForm.watch('type') === 'complaint' ? 'Complaint' : 'Review'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}