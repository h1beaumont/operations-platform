import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, MapPin, Plus, Edit, Trash2, Home, Car, Users } from "lucide-react";
import type { Property, LocationGroup } from "@shared/schema";

// Draggable Property Card
function PropertyCard({ property, isDragging }: { property: Property; isDragging?: boolean }) {
  const style = {
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      className="bg-card p-3 rounded-md border hover-elevate"
      style={style}
      data-testid={`property-card-${property.id}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-medium text-sm">{property.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{property.address}</p>
          {property.propertyType && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {property.propertyType}
              </Badge>
              {property.bedrooms !== null && (
                <span className="text-xs text-muted-foreground">
                  {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        {!property.active && (
          <Badge variant="destructive" className="text-xs">Inactive</Badge>
        )}
      </div>
    </div>
  );
}

// Droppable Group Column
function GroupColumn({
  group,
  properties,
  onDragStart,
  onEditGroup,
  onDeleteGroup,
  unassignedColumn = false,
}: {
  group: LocationGroup | null;
  properties: Property[];
  onDragStart: (event: DragStartEvent) => void;
  onEditGroup?: () => void;
  onDeleteGroup?: () => void;
  unassignedColumn?: boolean;
}) {
  return (
    <Card className="min-w-[300px] flex-1">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">
              {unassignedColumn ? "Unassigned Properties" : group?.displayName}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'}
              {group?.maxJobsPerDay && (
                <span className="ml-2">• Max {group.maxJobsPerDay} jobs/day</span>
              )}
            </CardDescription>
          </div>
          {!unassignedColumn && (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEditGroup}
                data-testid={`button-edit-group-${group?.id}`}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onDeleteGroup}
                data-testid={`button-delete-group-${group?.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {properties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No properties in this group</p>
                <p className="text-xs mt-1">Drag properties here to assign them</p>
              </div>
            ) : (
              properties.map((property) => (
                <div
                  key={property.id}
                  draggable
                  onDragStart={(e) => {
                    const event = {
                      active: { id: property.id, data: { current: property } }
                    } as DragStartEvent;
                    onDragStart(event);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <PropertyCard property={property} />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function PropertiesManagement() {
  const { toast } = useToast();
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [editingGroup, setEditingGroup] = useState<LocationGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<LocationGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state for group dialog
  const [groupForm, setGroupForm] = useState({
    displayName: "",
    slug: "",
    maxJobsPerDay: 10,
    travelTimeMinutes: 15,
    notes: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch properties and location groups
  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: locationGroups = [], isLoading: loadingGroups } = useQuery<LocationGroup[]>({
    queryKey: ["/api/location-groups"],
  });

  // Filter properties based on search
  const filteredProperties = properties.filter((p) =>
    searchQuery === "" ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group properties by location group
  const propertyGroups = locationGroups.map((group) => ({
    group,
    properties: filteredProperties.filter((p) => p.locationGroupId === group.id),
  }));

  const unassignedProperties = filteredProperties.filter((p) => !p.locationGroupId);

  // Update property location group
  const updatePropertyMutation = useMutation({
    mutationFn: async ({ propertyId, locationGroupId }: { propertyId: string; locationGroupId: string | null }) => {
      return apiRequest(`/api/properties/${propertyId}`, {
        method: "PUT",
        body: JSON.stringify({ locationGroupId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property Updated",
        description: "Property group assignment has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property.",
        variant: "destructive",
      });
    },
  });

  // Create location group
  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/location-groups", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location-groups"] });
      toast({
        title: "Group Created",
        description: "New location group has been created.",
      });
      setShowCreateGroup(false);
      resetGroupForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group.",
        variant: "destructive",
      });
    },
  });

  // Update location group
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/location-groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location-groups"] });
      toast({
        title: "Group Updated",
        description: "Location group has been updated.",
      });
      setEditingGroup(null);
      resetGroupForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update group.",
        variant: "destructive",
      });
    },
  });

  // Delete location group
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/location-groups/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location-groups"] });
      toast({
        title: "Group Deleted",
        description: "Location group has been deleted.",
      });
      setDeletingGroup(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete group.",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const property = properties.find((p) => p.id === event.active.id);
    if (property) {
      setActiveProperty(property);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveProperty(null);
      return;
    }

    const propertyId = active.id as string;
    const targetGroupId = over.id as string;
    
    // Find the property's current group
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;
    
    // Check if we're dropping on unassigned or a specific group
    const newGroupId = targetGroupId === "unassigned" ? null : targetGroupId;
    
    // Only update if the group has changed
    if (property.locationGroupId !== newGroupId) {
      updatePropertyMutation.mutate({
        propertyId,
        locationGroupId: newGroupId,
      });
    }
    
    setActiveProperty(null);
  };

  const resetGroupForm = () => {
    setGroupForm({
      displayName: "",
      slug: "",
      maxJobsPerDay: 10,
      travelTimeMinutes: 15,
      notes: "",
    });
  };

  const handleEditGroup = (group: LocationGroup) => {
    setGroupForm({
      displayName: group.displayName,
      slug: group.slug,
      maxJobsPerDay: group.maxJobsPerDay || 10,
      travelTimeMinutes: group.travelTimeMinutes || 15,
      notes: group.notes || "",
    });
    setEditingGroup(group);
  };

  const handleSubmitGroup = () => {
    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        data: groupForm,
      });
    } else {
      createGroupMutation.mutate(groupForm);
    }
  };

  if (loadingProperties || loadingGroups) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading properties and groups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Properties Management
        </h1>
        <p className="text-muted-foreground">
          Organize properties into location groups for better scheduling
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">
              {properties.filter(p => p.active).length} active, {properties.filter(p => !p.active).length} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Location Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locationGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              {unassignedProperties.length} unassigned properties
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Daily Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {locationGroups.reduce((sum, g) => sum + (g.maxJobsPerDay || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total jobs across all groups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Search properties..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
          data-testid="input-search-properties"
        />
        <Button
          onClick={() => setShowCreateGroup(true)}
          data-testid="button-create-group"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Properties Grid with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Unassigned Properties Column */}
          <div
            onDrop={(e) => {
              e.preventDefault();
              const propertyId = e.dataTransfer.getData('propertyId');
              if (propertyId) {
                updatePropertyMutation.mutate({
                  propertyId,
                  locationGroupId: null,
                });
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            data-drop-target="unassigned"
          >
            <GroupColumn
              group={null}
              properties={unassignedProperties}
              onDragStart={handleDragStart}
              unassignedColumn={true}
            />
          </div>

          {/* Location Group Columns */}
          {propertyGroups.map(({ group, properties }) => (
            <div
              key={group.id}
              onDrop={(e) => {
                e.preventDefault();
                const propertyId = e.dataTransfer.getData('propertyId');
                if (propertyId) {
                  updatePropertyMutation.mutate({
                    propertyId,
                    locationGroupId: group.id,
                  });
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              data-drop-target={group.id}
            >
              <GroupColumn
                group={group}
                properties={properties}
                onDragStart={handleDragStart}
                onEditGroup={() => handleEditGroup(group)}
                onDeleteGroup={() => setDeletingGroup(group)}
              />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeProperty && <PropertyCard property={activeProperty} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Create/Edit Group Dialog */}
      <Dialog open={showCreateGroup || !!editingGroup} onOpenChange={(open) => {
        if (!open) {
          setShowCreateGroup(false);
          setEditingGroup(null);
          resetGroupForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Location Group" : "Create Location Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the location group settings"
                : "Create a new location group to organize properties"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={groupForm.displayName}
                onChange={(e) => setGroupForm({ ...groupForm, displayName: e.target.value })}
                placeholder="e.g., City Centre"
                data-testid="input-group-name"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug (URL-friendly)</Label>
              <Input
                id="slug"
                value={groupForm.slug}
                onChange={(e) => setGroupForm({ ...groupForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="e.g., city-centre"
                data-testid="input-group-slug"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxJobs">Max Jobs/Day</Label>
                <Input
                  id="maxJobs"
                  type="number"
                  value={groupForm.maxJobsPerDay}
                  onChange={(e) => setGroupForm({ ...groupForm, maxJobsPerDay: parseInt(e.target.value) || 10 })}
                  data-testid="input-max-jobs"
                />
              </div>

              <div>
                <Label htmlFor="travelTime">Travel Time (mins)</Label>
                <Input
                  id="travelTime"
                  type="number"
                  value={groupForm.travelTimeMinutes}
                  onChange={(e) => setGroupForm({ ...groupForm, travelTimeMinutes: parseInt(e.target.value) || 15 })}
                  data-testid="input-travel-time"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={groupForm.notes}
                onChange={(e) => setGroupForm({ ...groupForm, notes: e.target.value })}
                placeholder="Any additional notes about this group"
                data-testid="input-group-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateGroup(false);
                setEditingGroup(null);
                resetGroupForm();
              }}
              data-testid="button-cancel-group"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitGroup}
              disabled={!groupForm.displayName || !groupForm.slug}
              data-testid="button-save-group"
            >
              {editingGroup ? "Update" : "Create"} Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingGroup?.displayName}"? 
              {deletingGroup && propertyGroups.find(g => g.group.id === deletingGroup.id)?.properties.length > 0 && (
                <span className="block mt-2 text-destructive">
                  This group still has properties assigned. Please move them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGroup && deleteGroupMutation.mutate(deletingGroup.id)}
              disabled={deletingGroup && propertyGroups.find(g => g.group.id === deletingGroup.id)?.properties.length > 0}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}