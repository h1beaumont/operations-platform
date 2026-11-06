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
import { Plus, Edit, Trash2, Database, RefreshCw, Search, Filter, CheckCircle2, XCircle, User, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = ["property", "staff", "maintenance", "procedures", "general", "manual"];

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // Fetch all knowledge base entries
  const { data: entries = [], isLoading } = useQuery<KnowledgeBaseEntry[]>({
    queryKey: ["/api/knowledge-base"],
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof insertKnowledgeBaseEntrySchema._type) => {
      if (editingEntry) {
        return await apiRequest("PATCH", `/api/knowledge-base/${editingEntry.id}`, data);
      }
      return await apiRequest("POST", "/api/knowledge-base", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      toast({
        title: editingEntry ? "Knowledge Updated" : "Knowledge Added",
        description: editingEntry 
          ? "The knowledge entry has been updated successfully."
          : "New knowledge has been added to the system.",
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
      return await apiRequest("DELETE", `/api/knowledge-base/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
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

  const form = useForm({
    resolver: zodResolver(insertKnowledgeBaseEntrySchema),
    defaultValues: {
      title: "",
      content: "",
      chatbotType: "internal_staff" as const,
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
      chatbotType: entry.chatbotType as any,
      category: entry.category as any,
      source: entry.source as any,
      sourceType: entry.sourceType || undefined,
      tags: entry.tags || [],
      isActive: entry.isActive,
    });
    setIsFormDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    form.reset({
      title: "",
      content: "",
      chatbotType: "internal_staff" as const,
      category: "general" as const,
      source: "manual_upload" as const,
      sourceType: "user_upload",
      tags: [] as string[],
      isActive: true,
    });
    setIsFormDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this knowledge entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      property: "default",
      staff: "secondary",
      maintenance: "outline",
      procedures: "default",
      general: "secondary",
      manual: "outline",
    };
    return variants[category] || "default";
  };

  const getSourceBadgeVariant = (source: string) => {
    return source === "auto_generated" ? "default" : "secondary";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-knowledge-base">Knowledge Base</h1>
          <p className="text-muted-foreground" data-testid="text-knowledge-base-description">
            Manage AI chatbot knowledge from portal data and manual uploads
          </p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew} data-testid="button-add-knowledge">
                <Plus className="w-4 h-4 mr-2" />
                Add Knowledge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Edit Knowledge" : "Add New Knowledge"}</DialogTitle>
                <DialogDescription>
                  {editingEntry 
                    ? "Update the knowledge entry details below."
                    : "Add new knowledge that will be available to AI chatbots."}
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
                          <Input 
                            placeholder="Short title or summary" 
                            {...field} 
                            data-testid="input-title"
                          />
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
                            placeholder="Full knowledge content that AI can reference..." 
                            className="min-h-[200px]"
                            {...field} 
                            data-testid="input-content"
                          />
                        </FormControl>
                        <FormDescription>
                          Provide detailed information that will help the AI answer questions
                        </FormDescription>
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
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
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription className="text-xs">
                              Enable for chatbots
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
                  </div>

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsFormDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={saveMutation.isPending}
                      data-testid="button-save"
                    >
                      {saveMutation.isPending ? "Saving..." : editingEntry ? "Update" : "Add"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Knowledge Entries
          </CardTitle>
          <CardDescription>
            {filteredEntries.length} of {entries.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter || "all"} onValueChange={(v) => setSourceFilter(v === "all" ? null : v)}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-source">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="auto_generated">Auto-Generated</SelectItem>
                <SelectItem value="manual_upload">Manual Upload</SelectItem>
                <SelectItem value="csv_import">CSV Import</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading knowledge...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No knowledge entries found. Try adding some manually or auto-generating from portal data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map(entry => (
                  <TableRow key={entry.id} data-testid={`row-knowledge-${entry.id}`}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{entry.title}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-md">
                          {entry.content.substring(0, 100)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryBadgeVariant(entry.category)} data-testid={`badge-category-${entry.id}`}>
                        {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSourceBadgeVariant(entry.source)} data-testid={`badge-source-${entry.id}`}>
                        {entry.source === "auto_generated" ? (
                          <>
                            <Database className="w-3 h-3 mr-1" />
                            Auto
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            Manual
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {entry.uploadedByName || entry.uploadedBy || "System"}
                      </div>
                      {entry.sourceType && (
                        <div className="text-xs text-muted-foreground">{entry.sourceType}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.isActive ? (
                        <Badge variant="default" data-testid={`badge-active-${entry.id}`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-inactive-${entry.id}`}>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                          data-testid={`button-edit-${entry.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
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
