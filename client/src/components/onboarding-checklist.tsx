import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Circle, Clock, AlertTriangle, FileText, GraduationCap, Package, Users } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { OnboardingChecklistItem } from "@shared/schema";

interface EnrichedChecklistItem extends OnboardingChecklistItem {
  template: {
    title: string;
    description: string;
    category: string;
    required: boolean;
  };
}

export function OnboardingChecklist({ candidateId }: { candidateId: string }) {
  const { toast } = useToast();
  
  const { data: items = [], isLoading } = useQuery<EnrichedChecklistItem[]>({
    queryKey: [`/api/onboarding/checklist/${candidateId}`],
  });
  
  const markCompleteMutation = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/onboarding/checklist/${itemId}`, {
        status: "completed",
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/onboarding/checklist/${candidateId}`] });
      toast({ title: "Checklist Updated", description: "Item marked as complete" });
    },
  });
  
  const categoryIcons = {
    paperwork: FileText,
    training: GraduationCap,
    equipment: Package,
    introduction: Users,
  };
  
  const categoryGroups = items.reduce((acc, item) => {
    const category = item.template.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, EnrichedChecklistItem[]>);
  
  const completedCount = items.filter(i => i.status === "completed").length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  
  const getStatusIcon = (status: string, dueDate: Date) => {
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (new Date() > new Date(dueDate)) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (status === "in_progress") return <Clock className="h-4 w-4 text-primary" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };
  
  if (isLoading) return <div>Loading checklist...</div>;
  
  return (
    <Card data-testid="card-onboarding-checklist">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Onboarding Checklist</CardTitle>
          <Badge variant="secondary" data-testid="badge-checklist-completion">
            {completedCount}/{items.length} Complete
          </Badge>
        </div>
        <Progress value={progress} className="mt-2" data-testid="progress-onboarding" />
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={Object.keys(categoryGroups)} className="w-full">
          {Object.entries(categoryGroups).map(([category, categoryItems]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons] || FileText;
            const categoryCompleted = categoryItems.filter(i => i.status === "completed").length;
            
            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{category}</span>
                    <Badge variant="outline" className="ml-2">
                      {categoryCompleted}/{categoryItems.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  {categoryItems.map((item) => {
                    const isOverdue = new Date() > new Date(item.dueDate) && item.status !== "completed";
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <div className="mt-0.5">
                          {getStatusIcon(item.status, item.dueDate)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{item.template.title}</h4>
                            {item.template.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          {item.template.description && (
                            <p className="text-sm text-muted-foreground">{item.template.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                              {isOverdue && <span className="text-destructive ml-1">(Overdue)</span>}
                            </span>
                            {item.completedAt && (
                              <span className="text-green-600">
                                ✓ Completed {format(new Date(item.completedAt), "MMM d")}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs bg-muted p-2 rounded mt-2">{item.notes}</p>
                          )}
                        </div>
                        {item.status !== "completed" && (
                          <Button
                            size="sm"
                            onClick={() => markCompleteMutation.mutate({ itemId: item.id })}
                            disabled={markCompleteMutation.isPending}
                            data-testid={`button-complete-${item.id}`}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
