import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LinenPackingList, Property } from "@shared/schema";

export default function LinenPackingLists() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<LinenPackingList | null>(null);
  const [formData, setFormData] = useState({
    propertyId: "",
    propertyName: "",
    packingList: "",
  });

  // Fetch all linen packing lists
  const { data: lists, isLoading: listsLoading } = useQuery<LinenPackingList[]>({
    queryKey: ["/api/linen-packing-lists"],
  });

  // Fetch all properties for the dropdown
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/linen-packing-lists", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Linen Packing List Created",
        description: "The linen packing list has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/linen-packing-lists"] });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create linen packing list",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest(`/api/linen-packing-lists/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Linen Packing List Updated",
        description: "The linen packing list has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/linen-packing-lists"] });
      handleCloseDialog();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update linen packing list",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/linen-packing-lists/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Linen Packing List Deleted",
        description: "The linen packing list has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/linen-packing-lists"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete linen packing list",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (list?: LinenPackingList) => {
    if (list) {
      setEditingList(list);
      setFormData({
        propertyId: list.propertyId,
        propertyName: list.propertyName,
        packingList: list.packingList,
      });
    } else {
      setEditingList(null);
      setFormData({
        propertyId: "",
        propertyName: "",
        packingList: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingList(null);
    setFormData({
      propertyId: "",
      propertyName: "",
      packingList: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.propertyId || !formData.propertyName || !formData.packingList) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (editingList) {
      updateMutation.mutate({ id: editingList.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePropertySelect = (propertyId: string) => {
    const property = properties?.find((p) => p.id === propertyId);
    if (property) {
      setFormData({
        ...formData,
        propertyId: property.id,
        propertyName: property.name,
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this linen packing list?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Linen Packing Lists</h1>
          <p className="text-muted-foreground">
            Manage property-specific linen packing instructions for cleaners
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-list">
          <Plus className="w-4 h-4 mr-2" />
          Add Packing List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            All Linen Packing Lists
          </CardTitle>
          <CardDescription>
            These packing lists are available to the Cleaning Staff Assistant chatbot
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : lists && lists.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Packing List Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((list) => (
                  <TableRow key={list.id} data-testid={`row-list-${list.id}`}>
                    <TableCell className="font-medium">{list.propertyName}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {list.packingList}
                      </p>
                    </TableCell>
                    <TableCell>
                      {list.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(list)}
                          data-testid={`button-edit-${list.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(list.id)}
                          data-testid={`button-delete-${list.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No linen packing lists found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first packing list to help cleaners pack linen correctly
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingList ? "Edit Linen Packing List" : "Add Linen Packing List"}
            </DialogTitle>
            <DialogDescription>
              Create a detailed packing list for cleaners. This will be available in the chatbot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select
                value={formData.propertyId}
                onValueChange={handlePropertySelect}
                disabled={!!editingList}
              >
                <SelectTrigger id="property" data-testid="select-property">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingList && (
                <p className="text-sm text-muted-foreground">
                  Property cannot be changed for existing packing lists
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="packingList">Packing List Instructions</Label>
              <Textarea
                id="packingList"
                data-testid="input-packing-list"
                placeholder="Enter detailed linen packing instructions for this property...&#10;&#10;Example:&#10;- 2x King bed sheets&#10;- 4x Pillowcases&#10;- 2x Bath towels&#10;- 2x Hand towels&#10;- 1x Bath mat"
                value={formData.packingList}
                onChange={(e) =>
                  setFormData({ ...formData, packingList: e.target.value })
                }
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                Be specific and detailed. Cleaners will reference this when packing linen.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingList
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
