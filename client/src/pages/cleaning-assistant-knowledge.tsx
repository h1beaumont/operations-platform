import { useState } from "react";
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
import { insertKnowledgeBaseEntrySchema, type KnowledgeBaseEntry } from "@shared/schema";
import { Plus, Edit, Trash2, Database, RefreshCw, Search, Filter, CheckCircle2, XCircle, User, Upload, FileText, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Papa from "papaparse";

const CATEGORIES = ["property", "staff", "maintenance", "procedures", "general", "manual"];
const CHATBOT_TYPE = "cleaning_staff";

export default function CleaningAssistantKnowledge() {
  const { toast } = useToast();
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<{ text: string; title: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch knowledge base entries filtered by chatbot type
  const { data: entries = [], isLoading } = useQuery<KnowledgeBaseEntry[]>({
    queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }],
    queryFn: async () => {
      const response = await fetch(`/api/knowledge-base?chatbotType=${CHATBOT_TYPE}`);
      if (!response.ok) throw new Error("Failed to fetch knowledge base");
      return response.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof insertKnowledgeBaseEntrySchema._type) => {
      if (editingEntry) {
        return await apiRequest(`/api/knowledge-base/${editingEntry.id}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      }
      return await apiRequest("/api/knowledge-base", {
        method: "POST",
        body: JSON.stringify({ ...data, chatbotType: CHATBOT_TYPE }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base", { chatbotType: CHATBOT_TYPE }] });
      toast({
        title: editingEntry ? "Knowledge Updated" : "Knowledge Added",
        description: editingEntry 
          ? "The knowledge entry has been updated successfully."
          : "New knowledge has been added to the cleaning staff assistant.",
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
      return await apiRequest(`/api/knowledge-base/${id}`, {
        method: "DELETE",
      });
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
      const promises = entries.map(entry =>
        apiRequest("/api/knowledge-base", {
          method: "POST",
          body: JSON.stringify({
            ...entry,
            chatbotType: CHATBOT_TYPE,
            source: "csv_import",
            sourceType: "csv_file",
          }),
        })
      );
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
    mutationFn: async (data: typeof insertKnowledgeBaseEntrySchema._type) => {
      return await apiRequest("/api/knowledge-base", {
        method: "POST",
        body: JSON.stringify({ ...data, chatbotType: CHATBOT_TYPE }),
      });
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

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || entry.category === categoryFilter;
    const matchesSource = !sourceFilter || entry.source === sourceFilter;
    return matchesSearch && matchesCategory && matchesSource;
  });

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    form.reset({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      source: entry.source,
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
        const validEntries = results.data.filter((row: any) => row.title && row.content);
        
        if (validEntries.length === 0) {
          toast({
            title: "Invalid CSV",
            description: "No valid entries found. Ensure your CSV has 'title' and 'content' columns.",
            variant: "destructive",
          });
          return;
        }

        const processedEntries = validEntries.map((row: any) => ({
          title: row.title,
          content: row.content,
          category: row.category || "general",
          tags: row.tags ? row.tags.split(",").map((t: string) => t.trim()) : [],
          isActive: true,
        }));

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
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result as string;

        // Call OpenAI Vision API
        const response = await apiRequest("/api/openai/vision", {
          method: "POST",
          body: JSON.stringify({
            image: base64Image,
            prompt: "Extract all text content from this image. Format it in a clear, structured way.",
          }),
        });

        const extractedText = response.text;
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

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Database className="w-8 h-8" />
            Cleaning Staff Assistant - Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage knowledge entries for the cleaning staff chatbot assistant
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entries">{entries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Entries</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-entries">
              {entries.filter(e => e.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Entries</CardTitle>
            <User className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-manual-entries">
              {entries.filter(e => e.source === "manual_upload").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Generated</CardTitle>
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-auto-entries">
              {entries.filter(e => e.source === "auto_generated").length}
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
                      Create a new knowledge entry for the cleaning staff assistant
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
                                placeholder="cleaning, procedures, safety"
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
                    Upload Image/Screenshot
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
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="w-3 h-3" />
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
    </div>
  );
}
