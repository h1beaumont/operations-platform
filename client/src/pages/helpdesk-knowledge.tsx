import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKnowledgeBaseEntrySchema, type KnowledgeBaseEntry, type PendingKnowledgeUpload } from "@shared/schema";
import { Plus, Edit, Trash2, Database, RefreshCw, Search, Upload, FileText, Image, AlertCircle, Check, X, Eye, Upload as UploadCloud } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Papa from "papaparse";

const CATEGORIES = ["property", "staff", "maintenance", "procedures", "general", "manual"];
const CHATBOT_TYPE = "internal_staff";

export default function HelpdeskKnowledge() {
  const { toast } = useToast();
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [isClarificationDialogOpen, setIsClarificationDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<{ text: string; title: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, string>>({});
  const [selectedPendingUpload, setSelectedPendingUpload] = useState<PendingKnowledgeUpload | null>(null);
  const [clarificationForm, setClarificationForm] = useState<{ title: string; category: string; tags: string[] }>({ title: "", category: "general", tags: [] });

  // Fetch knowledge base entries
  const { data: entries = [], isLoading } = useQuery<KnowledgeBaseEntry[]>({
    queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base?chatbotType=${CHATBOT_TYPE}`);
      if (!response.ok) throw new Error("Failed to fetch knowledge base");
      return response.json();
    },
  });

  // Fetch pending uploads
  const { data: pendingUploads = [], isLoading: isPendingLoading } = useQuery<PendingKnowledgeUpload[]>({
    queryKey: ["/api/knowledge-base/pending", { chatbotType: CHATBOT_TYPE }],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base/pending?chatbotType=${CHATBOT_TYPE}`);
      if (!response.ok) throw new Error("Failed to fetch pending uploads");
      return response.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingEntry) {
        const response = await apiRequest("PATCH", `/api/knowledge-base/${editingEntry.id}`, data);
        return response.json();
      }
      const response = await apiRequest("POST", "/api/knowledge-base", { ...data, chatbotType: CHATBOT_TYPE });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: editingEntry ? "Knowledge Updated" : "Knowledge Added",
        description: editingEntry 
          ? "The knowledge entry has been updated successfully."
          : "New knowledge has been added to the internal staff assistant.",
      });
      setIsFormDialogOpen(false);
      setEditingEntry(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save knowledge entry",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/knowledge-base/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: "Knowledge Deleted",
        description: "The knowledge entry has been removed from the system.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete knowledge entry",
        variant: "destructive",
      });
    },
  });

  // CSV batch import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (entries: any[]) => {
      const promises = entries.map(async (entry) => {
        const response = await apiRequest("POST", "/api/knowledge-base", {
          ...entry,
          chatbotType: CHATBOT_TYPE,
          source: "csv_import",
          sourceType: "csv_file",
        });
        return response.json();
      });
      return await Promise.all(promises);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: "CSV Import Complete",
        description: `Successfully imported ${data.length} knowledge entries.`,
      });
      setIsCsvDialogOpen(false);
      setCsvPreview([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import CSV entries",
        variant: "destructive",
      });
    },
  });

  // Image OCR mutation
  const imageOcrMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/knowledge-base", { ...data, chatbotType: CHATBOT_TYPE });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: "Image Knowledge Added",
        description: "Text extracted from image and added to knowledge base.",
      });
      setIsImageDialogOpen(false);
      setImagePreview(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save extracted knowledge",
        variant: "destructive",
      });
    },
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('chatbotType', CHATBOT_TYPE);

      const response = await fetch('/api/knowledge-base/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data: { processed: number; failed: number; results: any[]; errors: any[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/pending", { chatbotType: CHATBOT_TYPE }] });
      
      const needsReview = data.results.filter(r => r.needsClarification).length;
      
      toast({
        title: "Bulk Upload Complete",
        description: `Processed ${data.processed} files. ${needsReview > 0 ? `${needsReview} need review.` : 'All uploads ready!'} ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
      });

      setBulkUploadFiles([]);
      setUploadProgress({});
      setIsBulkUploadDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  // Approve pending upload mutation
  const approvePendingMutation = useMutation({
    mutationFn: async ({ id, finalData }: { id: string; finalData: { title: string; category: string; tags: string[] } }) => {
      const response = await apiRequest("POST", `/api/knowledge-base/pending/${id}/approve`, finalData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/pending", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: "Upload Approved",
        description: "The upload has been approved and added to the knowledge base.",
      });
      setIsClarificationDialogOpen(false);
      setSelectedPendingUpload(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve upload",
        variant: "destructive",
      });
    },
  });

  // Reject pending upload mutation
  const rejectPendingMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/knowledge-base/pending/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/pending", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: "Upload Rejected",
        description: "The pending upload has been rejected and deleted.",
      });
      setIsClarificationDialogOpen(false);
      setSelectedPendingUpload(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject upload",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertKnowledgeBaseEntrySchema.omit({ chatbotType: true })),
    defaultValues: {
      title: "",
      content: "",
      category: "general" as const,
      source: "manual_upload" as const,
      sourceType: "user_upload",
      tags: [] as string[],
      isActive: true,
    },
  });

  // Get all unique tags from entries
  const allTags = Array.from(new Set(entries.flatMap(e => e.tags || [])));

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || entry.category === categoryFilter;
    const matchesSource = !sourceFilter || entry.source === sourceFilter;
    const matchesTag = !tagFilter || (entry.tags && entry.tags.includes(tagFilter));
    return matchesSearch && matchesCategory && matchesSource && matchesTag;
  });

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    form.reset({
      title: entry.title,
      content: entry.content,
      category: entry.category as any,
      source: entry.source as any,
      sourceType: entry.sourceType || "user_upload",
      tags: entry.tags || [],
      isActive: entry.isActive,
    });
    setIsFormDialogOpen(true);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "CSV file must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        // Smart column detection - map common column name variations
        const firstRow = results.data[0] as any;
        if (!firstRow) {
          toast({
            title: "Empty CSV",
            description: "The CSV file appears to be empty.",
            variant: "destructive",
          });
          return;
        }

        const columns = Object.keys(firstRow).map(k => k.toLowerCase().trim());
        
        // Find title column (name, title, person, contact name, etc.)
        const titleCol = Object.keys(firstRow).find(k => {
          const lower = k.toLowerCase().trim();
          return lower === 'title' || lower === 'name' || lower === 'person' || 
                 lower === 'contact' || lower === 'contact name' || lower === 'staff' ||
                 lower === 'staff name' || lower === 'full name' || lower === 'employee';
        });

        // Find content column - combine multiple columns if needed
        const contentCols = Object.keys(firstRow).filter(k => {
          const lower = k.toLowerCase().trim();
          return lower !== titleCol?.toLowerCase().trim() && 
                 (lower === 'content' || lower === 'description' || lower === 'notes' ||
                  lower === 'phone' || lower === 'email' || lower === 'mobile' ||
                  lower === 'telephone' || lower === 'contact number' || lower === 'role' ||
                  lower === 'position' || lower === 'department' || lower === 'address' ||
                  lower === 'information' || lower === 'details');
        });

        if (!titleCol) {
          toast({
            title: "No Title Column Found",
            description: `Detected columns: ${Object.keys(firstRow).join(', ')}. Please include a column like 'Name', 'Title', or 'Contact'.`,
            variant: "destructive",
          });
          return;
        }

        const validEntries = results.data.filter((row: any) => row[titleCol] && row[titleCol].toString().trim());
        
        if (validEntries.length === 0) {
          toast({
            title: "No Valid Entries",
            description: `No rows found with data in the '${titleCol}' column.`,
            variant: "destructive",
          });
          return;
        }

        const processedEntries = validEntries.map((row: any) => {
          // Combine content from multiple columns
          const contentParts: string[] = [];
          contentCols.forEach(col => {
            const value = row[col];
            if (value && value.toString().trim()) {
              contentParts.push(`${col}: ${value.toString().trim()}`);
            }
          });
          
          // If no content columns found, use all other columns
          if (contentParts.length === 0) {
            Object.keys(row).forEach(col => {
              if (col !== titleCol && row[col] && row[col].toString().trim()) {
                contentParts.push(`${col}: ${row[col].toString().trim()}`);
              }
            });
          }

          return {
            title: row[titleCol].toString().trim(),
            content: contentParts.join('\n') || row[titleCol].toString().trim(),
            category: row.category || row.Category || "general",
            tags: row.tags ? row.tags.split(",").map((t: string) => t.trim()) : 
                  row.Tags ? row.Tags.split(",").map((t: string) => t.trim()) : [],
            isActive: true,
          };
        });

        toast({
          title: "CSV Parsed Successfully",
          description: `Found ${processedEntries.length} entries using '${titleCol}' as title and ${contentCols.length > 0 ? contentCols.join(', ') : 'all columns'} for content.`,
        });

        setCsvPreview(processedEntries);
      },
      error: (error) => {
        toast({
          title: "CSV Parse Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only PNG and JPEG images are supported",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;

        const response = await apiRequest("POST", "/api/openai/vision", {
          image: base64Image,
          prompt: "Extract all text content from this image. Format it in a clear, structured way.",
        });

        const result = await response.json();
        const extractedText = result.text;
        const lines = extractedText.split('\n').filter((l: string) => l.trim());
        const title = lines[0]?.substring(0, 100) || "Extracted from Image";

        setImagePreview({ text: extractedText, title });
        setUploadingImage(false);
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        });
        setUploadingImage(false);
      };
    } catch (error) {
      toast({
        title: "OCR Failed",
        description: "Failed to extract text from image",
        variant: "destructive",
      });
      setUploadingImage(false);
    }
  };

  const handleSaveImageKnowledge = () => {
    if (!imagePreview) return;

    imageOcrMutation.mutate({
      title: imagePreview.title,
      content: imagePreview.text,
      category: "general",
      source: "image_upload",
      sourceType: "image_ocr",
      tags: ["ocr", "image"],
      isActive: true,
    });
  };

  // Bulk upload handlers
  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFilesAdded(files);
  };

  const handleFilesAdded = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "text/plain"].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024;
      
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: `${file.name}: Only PDF, PNG, JPG, and TXT files are allowed`,
          variant: "destructive",
        });
      }
      if (!isValidSize) {
        toast({
          title: "File Too Large",
          description: `${file.name}: File must be less than 10MB`,
          variant: "destructive",
        });
      }
      
      return isValidType && isValidSize;
    });

    setBulkUploadFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFilesAdded(files);
  }, []);

  const handleBulkUploadSubmit = () => {
    if (bulkUploadFiles.length === 0) return;
    bulkUploadMutation.mutate(bulkUploadFiles);
  };

  const removeFile = (index: number) => {
    setBulkUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openClarificationDialog = (pending: PendingKnowledgeUpload) => {
    setSelectedPendingUpload(pending);
    setClarificationForm({
      title: pending.suggestedTitle || '',
      category: pending.suggestedCategory || 'general',
      tags: pending.suggestedTags || [],
    });
    setIsClarificationDialogOpen(true);
  };

  const handleApprovePending = () => {
    if (!selectedPendingUpload) return;
    
    approvePendingMutation.mutate({
      id: selectedPendingUpload.id,
      finalData: clarificationForm,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Database className="w-8 h-8" />
            Management Chatbot - Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage knowledge entries for the management chatbot assistant
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entries">{entries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Check className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-entries">
              {entries.filter(e => e.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual</CardTitle>
            <Edit className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-manual-entries">
              {entries.filter(e => e.source === "manual_upload").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Generated</CardTitle>
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-auto-entries">
              {entries.filter(e => e.source === "auto_generated").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-entries">
              {pendingUploads.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[300px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
                className="max-w-md"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-manual" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Manual Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEntry ? "Edit Knowledge Entry" : "Add Manual Knowledge Entry"}</DialogTitle>
                    <DialogDescription>
                      Create a new knowledge entry for the internal staff assistant
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-title" placeholder="Enter a concise title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="input-content"
                                placeholder="Enter detailed knowledge content"
                                rows={8}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags (comma-separated)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-tags"
                                value={field.value?.join(", ") || ""}
                                onChange={(e) => field.onChange(e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                                placeholder="operations, procedures, support"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-md border p-4">
                            <div>
                              <FormLabel>Active</FormLabel>
                              <FormDescription>
                                Active entries are visible to the chatbot
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsFormDialogOpen(false);
                            setEditingEntry(null);
                            form.reset();
                          }}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save">
                          {saveMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                          {editingEntry ? "Update" : "Create"} Entry
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" data-testid="button-bulk-upload" className="gap-2">
                    <UploadCloud className="w-4 h-4" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Bulk Upload Files with AI Extraction</DialogTitle>
                    <DialogDescription>
                      Upload multiple PDFs, images, or text files. AI will extract content and suggest metadata for review.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <UploadCloud className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium mb-2">
                        {isDragging ? 'Drop files here' : 'Drag and drop files here'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to browse (PDF, PNG, JPG, TXT - max 10MB each)
                      </p>
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        onChange={handleBulkFileSelect}
                        data-testid="input-bulk-files"
                        className="hidden"
                        id="bulk-upload-input"
                      />
                      <label htmlFor="bulk-upload-input">
                        <Button type="button" variant="outline" asChild>
                          <span>Browse Files</span>
                        </Button>
                      </label>
                    </div>

                    {bulkUploadFiles.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Selected Files ({bulkUploadFiles.length})</h3>
                        <div className="border rounded-md max-h-[300px] overflow-auto p-2 space-y-2">
                          {bulkUploadFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2 flex-1">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm truncate">{file.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {(file.size / 1024).toFixed(1)} KB
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(index)}
                                data-testid={`button-remove-file-${index}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsBulkUploadDialogOpen(false);
                        setBulkUploadFiles([]);
                        setUploadProgress({});
                      }}
                      data-testid="button-cancel-bulk"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkUploadSubmit}
                      disabled={bulkUploadFiles.length === 0 || bulkUploadMutation.isPending}
                      data-testid="button-upload-bulk"
                    >
                      {bulkUploadMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                      Upload {bulkUploadFiles.length} Files
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-upload-csv" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Upload CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import Knowledge from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with columns: title, content, category (optional), tags (optional, comma-separated)
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      data-testid="input-csv-file"
                    />

                    {csvPreview.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold">Preview ({csvPreview.length} entries)</h3>
                        <div className="border rounded-md max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Content Preview</TableHead>
                                <TableHead>Category</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvPreview.slice(0, 10).map((entry, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{entry.title}</TableCell>
                                  <TableCell className="max-w-md truncate">{entry.content}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{entry.category}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {csvPreview.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            Showing first 10 of {csvPreview.length} entries
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCsvDialogOpen(false);
                        setCsvPreview([]);
                      }}
                      data-testid="button-cancel-csv"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => csvImportMutation.mutate(csvPreview)}
                      disabled={csvPreview.length === 0 || csvImportMutation.isPending}
                      data-testid="button-import-csv"
                    >
                      {csvImportMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                      Import {csvPreview.length} Entries
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-upload-image" className="gap-2">
                    <Image className="w-4 h-4" />
                    Upload Image
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Extract Text from Image</DialogTitle>
                    <DialogDescription>
                      Upload an image (PNG/JPEG) and we'll extract the text using AI
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      data-testid="input-image-file"
                    />

                    {uploadingImage && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Extracting text from image...</span>
                      </div>
                    )}

                    {imagePreview && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Suggested Title:</label>
                          <Input
                            value={imagePreview.title}
                            onChange={(e) => setImagePreview({ ...imagePreview, title: e.target.value })}
                            data-testid="input-image-title"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Extracted Text:</label>
                          <Textarea
                            value={imagePreview.text}
                            onChange={(e) => setImagePreview({ ...imagePreview, text: e.target.value })}
                            data-testid="input-image-content"
                            rows={12}
                            className="mt-1 font-mono text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsImageDialogOpen(false);
                        setImagePreview(null);
                      }}
                      data-testid="button-cancel-image"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveImageKnowledge}
                      disabled={!imagePreview || imageOcrMutation.isPending}
                      data-testid="button-save-image"
                    >
                      {imageOcrMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                      Save Knowledge
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val === "all" ? null : val)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter || "all"} onValueChange={(val) => setSourceFilter(val === "all" ? null : val)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-source">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual_upload">Manual</SelectItem>
                <SelectItem value="auto_generated">Auto-Generated</SelectItem>
                <SelectItem value="csv_import">CSV Import</SelectItem>
                <SelectItem value="image_upload">Image OCR</SelectItem>
                <SelectItem value="bulk_upload">Bulk Upload</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter || "all"} onValueChange={(val) => setTagFilter(val === "all" ? null : val)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-tag">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading knowledge base...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No knowledge entries found. Add some to get started!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                    <TableCell className="font-medium max-w-md">
                      <div className="truncate">{entry.title}</div>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.source.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {entry.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <X className="w-3 h-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.updatedAt || entry.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                          data-testid={`button-edit-${entry.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this entry?")) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          data-testid={`button-delete-${entry.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Uploads Section */}
      {pendingUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Pending Uploads ({pendingUploads.length})
            </CardTitle>
            <CardDescription>
              Review AI-extracted content and approve or reject uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Suggested Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUploads.map((pending) => (
                  <TableRow key={pending.id} data-testid={`row-pending-${pending.id}`}>
                    <TableCell className="font-medium">
                      {pending.originalFileName}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {pending.fileType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {pending.suggestedTitle}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pending.suggestedCategory}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pending.confidenceScore && pending.confidenceScore >= 0.6 ? "default" : "secondary"}>
                        {pending.confidenceScore ? `${Math.round(pending.confidenceScore * 100)}%` : 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pending.needsClarification ? (
                        <Badge variant="secondary" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Needs Review
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1">
                          <Check className="w-3 h-3" />
                          Ready
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openClarificationDialog(pending)}
                          data-testid={`button-review-${pending.id}`}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Review
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to reject this upload?")) {
                              rejectPendingMutation.mutate(pending.id);
                            }
                          }}
                          data-testid={`button-reject-${pending.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clarification Dialog */}
      <Dialog open={isClarificationDialogOpen} onOpenChange={setIsClarificationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Upload</DialogTitle>
            <DialogDescription>
              Review the AI-extracted content and metadata. Make any necessary adjustments before approving.
            </DialogDescription>
          </DialogHeader>

          {selectedPendingUpload && (
            <div className="space-y-4">
              {selectedPendingUpload.needsClarification && selectedPendingUpload.clarificationQuestion && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">AI Clarification Needed</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        {selectedPendingUpload.clarificationQuestion}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">File Name</label>
                  <p className="text-sm text-muted-foreground">{selectedPendingUpload.originalFileName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">AI Confidence</label>
                  <Badge variant={selectedPendingUpload.confidenceScore && selectedPendingUpload.confidenceScore >= 0.6 ? "default" : "secondary"}>
                    {selectedPendingUpload.confidenceScore ? `${Math.round(selectedPendingUpload.confidenceScore * 100)}%` : 'N/A'}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={clarificationForm.title}
                  onChange={(e) => setClarificationForm({ ...clarificationForm, title: e.target.value })}
                  data-testid="input-clarification-title"
                  placeholder="Enter title"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={clarificationForm.category}
                  onValueChange={(val) => setClarificationForm({ ...clarificationForm, category: val })}
                >
                  <SelectTrigger data-testid="select-clarification-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                <Input
                  value={clarificationForm.tags.join(", ")}
                  onChange={(e) => setClarificationForm({ 
                    ...clarificationForm, 
                    tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) 
                  })}
                  data-testid="input-clarification-tags"
                  placeholder="tag1, tag2, tag3"
                />
                {selectedPendingUpload.suggestedTags && selectedPendingUpload.suggestedTags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Suggested:</span>
                    {selectedPendingUpload.suggestedTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs cursor-pointer" onClick={() => {
                        if (!clarificationForm.tags.includes(tag)) {
                          setClarificationForm({ ...clarificationForm, tags: [...clarificationForm.tags, tag] });
                        }
                      }}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Extracted Content Preview</label>
                <Textarea
                  value={selectedPendingUpload.extractedContent || ''}
                  readOnly
                  rows={10}
                  className="font-mono text-sm bg-muted"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedPendingUpload && confirm("Are you sure you want to reject this upload?")) {
                  rejectPendingMutation.mutate(selectedPendingUpload.id);
                }
              }}
              disabled={rejectPendingMutation.isPending}
              data-testid="button-reject-clarification"
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Reject
            </Button>
            <Button
              onClick={handleApprovePending}
              disabled={!clarificationForm.title || approvePendingMutation.isPending}
              data-testid="button-approve-clarification"
              className="gap-2"
            >
              {approvePendingMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              <Check className="w-4 h-4" />
              Approve & Add to Knowledge Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
