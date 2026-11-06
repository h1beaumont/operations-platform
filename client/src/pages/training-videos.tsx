import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrainingVideoSchema, type TrainingVideo, type InsertTrainingVideo, type TrainingCompletion } from "@shared/schema";
import { Play, CheckCircle2, GraduationCap, Eye, Plus, Edit, Trash2, Video, FileText, BarChart3, Clock, Search, Filter, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";

type VideoWithCompletions = TrainingVideo & {
  completions?: TrainingCompletion[];
  userCompleted?: boolean;
};

const CATEGORIES = ["Cleaning", "Compliance", "Equipment", "Systems", "Safety", "Customer Service"];

// Helper function to extract YouTube video ID
function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  return null;
}

// Helper function to extract Vimeo video ID
function getVimeoEmbedUrl(url: string): string | null {
  const pattern = /vimeo\.com\/(\d+)/;
  const match = url.match(pattern);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}`;
  }
  return null;
}

// Get embeddable video URL
function getEmbedUrl(url: string): string {
  const youtubeUrl = getYouTubeEmbedUrl(url);
  if (youtubeUrl) return youtubeUrl;
  
  const vimeoUrl = getVimeoEmbedUrl(url);
  if (vimeoUrl) return vimeoUrl;
  
  // For direct video URLs
  return url;
}

// Format duration from seconds to MM:SS
function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function TrainingVideos() {
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<VideoWithCompletions | null>(null);
  const [editingVideo, setEditingVideo] = useState<TrainingVideo | null>(null);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Fetch current user's staff record to check admin status
  const { data: currentStaff } = useQuery<{ id: string; isAdmin: boolean }>({
    queryKey: ['/api/staff/me'],
  });

  const isAdmin = currentStaff?.isAdmin || false;

  // Fetch all videos
  const { data: videos = [], isLoading: videosLoading } = useQuery<TrainingVideo[]>({
    queryKey: ["/api/training/videos"],
  });

  // Fetch user's training history
  const { data: myHistory = [] } = useQuery<TrainingCompletion[]>({
    queryKey: ["/api/training/my-history"],
  });

  // Fetch analytics (only for admins)
  const { data: analytics } = useQuery<{
    totalVideos: number;
    totalCompletions: number;
    videoStats: Array<{
      video: TrainingVideo;
      completionCount: number;
      completionRate: number;
    }>;
  }>({
    queryKey: ["/api/training/analytics"],
    enabled: isAdmin,
  });

  // Mark video as complete mutation
  const completeVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      return await apiRequest("POST", `/api/training/videos/${videoId}/complete`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/my-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/analytics"] });
      toast({
        title: "Training completed",
        description: "Your completion has been recorded.",
      });
      setIsVideoDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark video as complete.",
        variant: "destructive",
      });
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      // Guard against non-admin attempts
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }
      return await apiRequest("DELETE", `/api/training/videos/${videoId}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/analytics"] });
      toast({
        title: "Video deleted",
        description: "Training video has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete video.",
        variant: "destructive",
      });
    },
  });

  // Enrich videos with completion data
  const enrichedVideos: VideoWithCompletions[] = videos.map(video => ({
    ...video,
    userCompleted: myHistory.some(h => h.videoId === video.id),
  }));

  // Filter videos
  const filteredVideos = enrichedVideos.filter(video => {
    const matchesSearch = searchQuery === "" || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || video.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-training-videos">
            <GraduationCap className="h-8 w-8" />
            Training Videos
          </h1>
          <p className="text-muted-foreground">Learn and track your training progress</p>
        </div>
      </div>

      <Tabs defaultValue="all-videos" className="space-y-6">
        <TabsList data-testid="tabs-training">
          <TabsTrigger value="all-videos" data-testid="tab-all-videos">
            <Video className="h-4 w-4 mr-2" />
            All Videos
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="manage" data-testid="tab-manage">
              <FileText className="h-4 w-4 mr-2" />
              Manage Videos
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Videos Tab */}
        <TabsContent value="all-videos" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-videos"
              />
            </div>
            <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? null : val)}>
              <SelectTrigger className="w-48" data-testid="select-category-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Button 
                onClick={() => {
                  setEditingVideo(null);
                  setIsFormDialogOpen(true);
                }}
                className="gap-2"
                data-testid="button-add-video-top"
              >
                <Plus className="h-4 w-4" />
                Add Video
              </Button>
            )}
          </div>

          {videosLoading ? (
            <div className="text-center py-12">Loading videos...</div>
          ) : filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No training videos found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover-elevate" data-testid={`card-video-${video.id}`}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                      {video.userCompleted && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" data-testid={`icon-completed-${video.id}`} />
                      )}
                    </div>
                    {video.category && (
                      <Badge variant="secondary" data-testid={`badge-category-${video.id}`}>
                        {video.category}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {video.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{video.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {video.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {video.viewCount || 0} views
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedVideo(video);
                        setIsVideoDialogOpen(true);
                      }}
                      data-testid={`button-watch-${video.id}`}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Watch Video
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manage Videos Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="manage" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingVideo(null);
                setIsFormDialogOpen(true);
              }}
              data-testid="button-add-video"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Video
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.id} data-testid={`row-video-${video.id}`}>
                    <TableCell className="font-medium">{video.title}</TableCell>
                    <TableCell>
                      {video.category && <Badge variant="outline">{video.category}</Badge>}
                    </TableCell>
                    <TableCell>{formatDuration(video.duration)}</TableCell>
                    <TableCell>{video.viewCount || 0}</TableCell>
                    <TableCell>
                      {video.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(video.uploadedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingVideo(video);
                            setIsFormDialogOpen(true);
                          }}
                          data-testid={`button-edit-${video.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this video?")) {
                              deleteVideoMutation.mutate(video.id);
                            }
                          }}
                          data-testid={`button-delete-${video.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        )}

        {/* Analytics Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-total-videos">
                  {analytics?.totalVideos || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-total-completions">
                  {analytics?.totalCompletions || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Average Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-avg-completion-rate">
                  {analytics?.videoStats && analytics.videoStats.length > 0
                    ? Math.round(
                        analytics.videoStats.reduce((sum, stat) => sum + stat.completionRate, 0) /
                          analytics.videoStats.length
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Video Performance</CardTitle>
              <CardDescription>Completion rates by video</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Completions</TableHead>
                    <TableHead>Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.videoStats.map((stat) => (
                    <TableRow key={stat.video.id} data-testid={`row-analytics-${stat.video.id}`}>
                      <TableCell className="font-medium">{stat.video.title}</TableCell>
                      <TableCell>
                        {stat.video.category && <Badge variant="outline">{stat.video.category}</Badge>}
                      </TableCell>
                      <TableCell>{stat.video.viewCount || 0}</TableCell>
                      <TableCell>{stat.completionCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full"
                              style={{ width: `${Math.min(stat.completionRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{Math.round(stat.completionRate)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Video Player Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="max-w-4xl" data-testid="dialog-video-player">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedVideo.title}
                  {selectedVideo.userCompleted && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </DialogTitle>
                {selectedVideo.description && (
                  <DialogDescription>{selectedVideo.description}</DialogDescription>
                )}
              </DialogHeader>
              <div className="aspect-video w-full bg-black rounded-md overflow-hidden">
                <iframe
                  src={getEmbedUrl(selectedVideo.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  data-testid="iframe-video-player"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => completeVideoMutation.mutate(selectedVideo.id)}
                  disabled={completeVideoMutation.isPending || selectedVideo.userCompleted}
                  data-testid="button-mark-complete"
                >
                  {selectedVideo.userCompleted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Form Dialog - Admin Only */}
      {isAdmin && (
        <VideoFormDialog
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          video={editingVideo}
          isAdmin={isAdmin}
          onSuccess={() => {
            setIsFormDialogOpen(false);
            setEditingVideo(null);
          }}
        />
      )}
    </div>
  );
}

// Extended form schema with visibility
const formSchema = insertTrainingVideoSchema.extend({
  visibleToStaffIds: z.array(z.string()).optional().default([]),
});

// Video Form Dialog Component
function VideoFormDialog({
  open,
  onOpenChange,
  video,
  isAdmin,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: TrainingVideo | null;
  isAdmin: boolean;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch all staff for visibility selector
  const { data: allStaff = [] } = useQuery<Array<{ id: string; fullName: string }>>({
    queryKey: ["/api/staff"],
    enabled: isAdmin,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: video?.title || "",
      description: video?.description || "",
      videoUrl: video?.videoUrl || "",
      thumbnailUrl: video?.thumbnailUrl || "",
      category: video?.category || "",
      duration: video?.duration || 0,
      isActive: video?.isActive ?? true,
      visibleToStaffIds: video?.visibleToStaffIds || [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTrainingVideo) => {
      // Guard against non-admin attempts
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }
      return await apiRequest("POST", "/api/training/videos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/analytics"] });
      toast({
        title: "Video created",
        description: "Training video has been added successfully.",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create video error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create video.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertTrainingVideo>) => {
      // Guard against non-admin attempts
      if (!isAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }
      return await apiRequest("PATCH", `/api/training/videos/${video?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/analytics"] });
      toast({
        title: "Video updated",
        description: "Training video has been updated successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Update video error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update video.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, WebM, OGG, or MOV)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Video file must be less than 500MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("video", file);

      // Upload to server
      const response = await fetch("/api/training/upload-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      
      // Set the video URL in the form
      form.setValue("videoUrl", data.url);
      
      toast({
        title: "Video uploaded",
        description: "Video has been uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validate required fields
    if (!data.title || !data.videoUrl || !data.category) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in Title, Video URL, and Category",
        variant: "destructive",
      });
      return;
    }

    console.log("Submitting video data:", data);

    if (video) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-video-form">
        <DialogHeader>
          <DialogTitle>{video ? "Edit Video" : "Add New Video"}</DialogTitle>
          <DialogDescription>
            {video ? "Update the training video details" : "Add a new training video for staff"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Equipment Safety Training" {...field} data-testid="input-video-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this training video covers..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-video-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Video Upload Method Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FormLabel>Video Source</FormLabel>
                  </div>
                  <Tabs value={uploadMethod} onValueChange={(val) => setUploadMethod(val as "url" | "file")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="url" data-testid="tab-video-url">
                        URL (Vimeo/YouTube)
                      </TabsTrigger>
                      <TabsTrigger value="file" data-testid="tab-video-file">
                        Upload File
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="url" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="videoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Video URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://vimeo.com/123456789 or https://youtube.com/watch?v=..."
                                {...field}
                                data-testid="input-video-url"
                              />
                            </FormControl>
                            <FormDescription>
                              ✨ <strong>Recommended:</strong> Vimeo for faster loading and better quality. Also supports YouTube URLs.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="file" className="space-y-4">
                      <div className="space-y-2">
                        <FormLabel>Upload Video File</FormLabel>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          {uploading ? (
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div 
                                  className="bg-primary h-full rounded-full transition-all"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : form.watch("videoUrl") && uploadMethod === "file" ? (
                            <div className="space-y-2">
                              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
                              <p className="text-sm text-muted-foreground">Video uploaded successfully</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => form.setValue("videoUrl", "")}
                              >
                                Upload Different File
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Video className="h-8 w-8 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Drop video file here or click to browse
                              </p>
                              <p className="text-xs text-muted-foreground">
                                MP4, WebM, OGG, or MOV (max 500MB)
                              </p>
                              <Input
                                type="file"
                                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(file);
                                }}
                                className="mt-2"
                                data-testid="input-video-file"
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          💡 <strong>Tip:</strong> For large videos, we recommend using Vimeo (URL option) for better performance and faster loading times.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-video-thumbnail"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-video-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="300"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            data-testid="input-video-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="visibleToStaffIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Visible To Staff
                      </FormLabel>
                      <FormDescription>
                        Choose which staff can see this video. Leave empty to make visible to all staff.
                      </FormDescription>
                      <FormControl>
                        <div className="rounded-lg border p-4">
                          {allStaff.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Loading staff...</p>
                          ) : (
                            <>
                              <div className="mb-3 flex items-center gap-2">
                                <Checkbox
                                  checked={!field.value || field.value.length === 0}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([]);
                                    }
                                  }}
                                  data-testid="checkbox-all-staff"
                                />
                                <label className="text-sm font-medium cursor-pointer">
                                  All Staff (visible to everyone)
                                </label>
                              </div>
                              <div className="border-t pt-3">
                                <p className="text-sm text-muted-foreground mb-2">Or select specific staff:</p>
                                <ScrollArea className="h-48">
                                  <div className="space-y-2">
                                    {allStaff.map((staff) => (
                                      <div key={staff.id} className="flex items-center gap-2">
                                        <Checkbox
                                          checked={field.value?.includes(staff.id) || false}
                                          onCheckedChange={(checked) => {
                                            const currentValue = field.value || [];
                                            if (checked) {
                                              field.onChange([...currentValue, staff.id]);
                                            } else {
                                              field.onChange(currentValue.filter((id) => id !== staff.id));
                                            }
                                          }}
                                          data-testid={`checkbox-staff-${staff.id}`}
                                        />
                                        <label className="text-sm cursor-pointer">
                                          {staff.fullName}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                                {field.value && field.value.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm font-medium">
                                      Selected: {field.value.length} staff member{field.value.length !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Make this video visible to staff members
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-video-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-form">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-form"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : (video ? "Update Video" : "Create Video")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
