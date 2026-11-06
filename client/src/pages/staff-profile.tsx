import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, Calendar, Award, Edit, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { BadgeGallery } from "@/components/badge-gallery";

const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuedBy: z.string().min(1, "Issuer is required"),
  issuedDate: z.string(),
  expiryDate: z.string().optional(),
});

const editProfileSchema = z.object({
  // Basic
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  roleType: z.enum(["driver", "non-driver"]),
  hireDate: z.string().optional(),
  status: z.enum(["active", "inactive", "on-leave"]),
  notes: z.string().optional(),
  
  // Personal
  niNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  photoUrl: z.string().optional(),
  
  // Emergency
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  
  // Employment
  contractType: z.enum(["full-time", "part-time", "zero-hours"]).optional(),
  hourlyRate: z.string().optional(),
  
  // Banking
  accountName: z.string().optional(),
  sortCode: z.string().optional(),
  accountNumber: z.string().optional(),
  
  // Preferences
  timezone: z.string().optional(),
  weekStartsOn: z.string().optional(),
  preferredNotificationTime: z.string().optional(),
  contactOptIn: z.boolean().optional(),
});

// Helper function to format sort code
const formatSortCode = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
};

export default function StaffProfile() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [addingCertification, setAddingCertification] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");
  
  const { data: profile, isLoading } = useQuery({
    queryKey: [`/api/staff/${id}/profile`],
    enabled: !!id,
  });
  
  const { data: trends = [] } = useQuery({
    queryKey: [`/api/staff/${id}/compliance-trends`],
    enabled: !!id,
  });
  
  const certForm = useForm({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      name: "",
      issuedBy: "",
      issuedDate: "",
      expiryDate: "",
    },
  });
  
  const editForm = useForm({
    resolver: zodResolver(editProfileSchema),
    values: profile ? {
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      roleType: profile.roleType as "driver" | "non-driver",
      hireDate: profile.hireDate || "",
      status: (profile.status as "active" | "inactive" | "on-leave") || "active",
      notes: profile.notes || "",
      niNumber: profile.niNumber || "",
      dateOfBirth: profile.dateOfBirth || "",
      address: profile.address || "",
      photoUrl: profile.photoUrl || "",
      emergencyContactName: profile.emergencyContactName || "",
      emergencyContactPhone: profile.emergencyContactPhone || "",
      emergencyContactRelationship: profile.emergencyContactRelationship || "",
      contractType: profile.contractType as any || undefined,
      hourlyRate: profile.hourlyRate ? profile.hourlyRate.toString() : "",
      accountName: (profile.bankDetails as any)?.accountName || "",
      sortCode: (profile.bankDetails as any)?.sortCode || "",
      accountNumber: (profile.bankDetails as any)?.accountNumber || "",
      timezone: (profile.calendarPreferences as any)?.timezone || "Europe/London",
      weekStartsOn: (profile.calendarPreferences as any)?.weekStartsOn?.toString() || "1",
      preferredNotificationTime: (profile.calendarPreferences as any)?.preferredNotificationTime || "",
      contactOptIn: profile.contactOptIn !== false,
    } : undefined,
  });
  
  const [currentSkills, setCurrentSkills] = useState<string[]>(profile?.skills || []);
  const [currentLanguages, setCurrentLanguages] = useState<string[]>(profile?.languages || []);
  
  // Sync skills and languages when profile loads or changes
  useEffect(() => {
    if (profile && editProfileOpen) {
      setCurrentSkills(profile.skills || []);
      setCurrentLanguages(profile.languages || []);
    }
  }, [profile, editProfileOpen]);
  
  // Reset form with current profile data when dialog opens
  useEffect(() => {
    if (profile && editProfileOpen) {
      editForm.reset({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone || "",
        roleType: profile.roleType as "driver" | "non-driver",
        hireDate: profile.hireDate || "",
        status: (profile.status as "active" | "inactive" | "on-leave") || "active",
        notes: profile.notes || "",
        niNumber: profile.niNumber || "",
        dateOfBirth: profile.dateOfBirth || "",
        address: profile.address || "",
        photoUrl: profile.photoUrl || "",
        emergencyContactName: profile.emergencyContactName || "",
        emergencyContactPhone: profile.emergencyContactPhone || "",
        emergencyContactRelationship: profile.emergencyContactRelationship || "",
        contractType: profile.contractType as any || undefined,
        hourlyRate: profile.hourlyRate ? profile.hourlyRate.toString() : "",
        accountName: (profile.bankDetails as any)?.accountName || "",
        sortCode: (profile.bankDetails as any)?.sortCode || "",
        accountNumber: (profile.bankDetails as any)?.accountNumber || "",
        timezone: (profile.calendarPreferences as any)?.timezone || "Europe/London",
        weekStartsOn: (profile.calendarPreferences as any)?.weekStartsOn?.toString() || "1",
        preferredNotificationTime: (profile.calendarPreferences as any)?.preferredNotificationTime || "",
        contactOptIn: profile.contactOptIn !== false,
      });
    }
  }, [profile, editProfileOpen, editForm]);
  
  const addCertificationMutation = useMutation({
    mutationFn: async (cert: any) => {
      const existingCerts = profile?.certifications || [];
      return apiRequest("PATCH", `/api/staff/${id}/profile`, {
        certifications: [
          ...existingCerts,
          { id: crypto.randomUUID(), ...cert }
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/profile`] });
      toast({ title: "Certification Added" });
      setAddingCertification(false);
      certForm.reset();
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        roleType: data.roleType,
        hireDate: data.hireDate || null,
        status: data.status,
        notes: data.notes || null,
        niNumber: data.niNumber || null,
        dateOfBirth: data.dateOfBirth || null,
        address: data.address || null,
        photoUrl: data.photoUrl || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        emergencyContactRelationship: data.emergencyContactRelationship || null,
        contractType: data.contractType || null,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
        bankDetails: {
          accountName: data.accountName || null,
          sortCode: data.sortCode || null,
          accountNumber: data.accountNumber || null,
        },
        calendarPreferences: {
          timezone: data.timezone || "Europe/London",
          weekStartsOn: data.weekStartsOn ? parseInt(data.weekStartsOn) : 1,
          preferredNotificationTime: data.preferredNotificationTime || null,
        },
        contactOptIn: data.contactOptIn !== false,
        skills: currentSkills,
        languages: currentLanguages,
      };
      
      return apiRequest("PATCH", `/api/staff/${id}/profile`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${id}/profile`] });
      toast({ title: "Profile updated successfully" });
      setEditProfileOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update profile", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
  
  const addSkill = () => {
    if (skillsInput.trim() && !currentSkills.includes(skillsInput.trim())) {
      setCurrentSkills([...currentSkills, skillsInput.trim()]);
      setSkillsInput("");
    }
  };
  
  const removeSkill = (skill: string) => {
    setCurrentSkills(currentSkills.filter(s => s !== skill));
  };
  
  const addLanguage = () => {
    if (languagesInput.trim() && !currentLanguages.includes(languagesInput.trim())) {
      setCurrentLanguages([...currentLanguages, languagesInput.trim()]);
      setLanguagesInput("");
    }
  };
  
  const removeLanguage = (lang: string) => {
    setCurrentLanguages(currentLanguages.filter(l => l !== lang));
  };
  
  if (isLoading) return <div className="p-6">Loading profile...</div>;
  if (!profile) return <div className="p-6">Staff member not found</div>;
  
  const initials = profile.fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();
  
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-staff-profile">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.photoUrl} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold" data-testid="text-staff-name">{profile.fullName}</h1>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditProfileOpen(true)} data-testid="button-edit-profile">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/staff")} data-testid="button-back">
                    Back to Staff
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant={profile.status === "active" ? "default" : "secondary"}>
                  {profile.status}
                </Badge>
                <Badge variant="outline">{profile.roleType}</Badge>
                {profile.contractType && <Badge variant="outline">{profile.contractType}</Badge>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Hired: {profile.hireDate ? format(new Date(profile.hireDate), "MMM d, yyyy") : "Unknown"}</span>
                </div>
                {profile.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.metrics.avgComplianceScore.toFixed(1)}/15.0</div>
            <Progress 
              value={(profile.metrics.avgComplianceScore / 15) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.metrics.totalShiftsCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Availability Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.metrics.availabilitySubmissionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">On-time submissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.metrics.totalComplianceEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">Compliance checks</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="badges" data-testid="tab-badges">Badges</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">National Insurance Number</label>
                <p className="mt-1">{profile.niNumber || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="mt-1">{profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM d, yyyy") : "Not provided"}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <p className="mt-1">{profile.address || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Skills & Languages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Skills</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.skills?.length > 0 ? (
                    profile.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills listed</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Languages</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.languages?.length > 0 ? (
                    profile.languages.map((lang: string) => (
                      <Badge key={lang} variant="secondary">{lang}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No languages listed</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Banking Details</CardTitle>
              <CardDescription>Payment information for wage processing</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Name</label>
                <p className="mt-1">{(profile.bankDetails as any)?.accountName || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sort Code</label>
                <p className="mt-1">{(profile.bankDetails as any)?.sortCode || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                <p className="mt-1">{(profile.bankDetails as any)?.accountNumber ? `****${(profile.bankDetails as any).accountNumber.slice(-4)}` : "Not provided"}</p>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              ⚠️ Development environment - In production, this data would be encrypted
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trend (Last 12 Weeks)</CardTitle>
              <CardDescription>Average weekly compliance scores</CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="weekStart" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                    />
                    <YAxis domain={[0, 15]} />
                    <RechartsTooltip 
                      labelFormatter={(value) => format(new Date(value), "MMM d, yyyy")}
                      formatter={(value: number) => [`${value.toFixed(1)}/15.0`, "Avg Score"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgScore" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No compliance data available</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Compliance Events</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.complianceHistory?.length > 0 ? (
                <div className="space-y-3">
                  {profile.complianceHistory.map((event: any) => (
                    <div key={event.eventId} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{event.property || "General"}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.eventDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{event.points.toFixed(1)}/15.0</p>
                        <Progress 
                          value={(event.points / 15) * 100} 
                          className="w-24 mt-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No compliance events recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Certifications & Qualifications</CardTitle>
                <Button size="sm" onClick={() => setAddingCertification(true)} data-testid="button-add-certification">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile.certifications?.length > 0 ? (
                <div className="space-y-3">
                  {profile.certifications.map((cert: any) => (
                    <div key={cert.id} className="flex items-start justify-between p-4 border rounded">
                      <div className="flex gap-3">
                        <Award className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">Issued by: {cert.issuedBy}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Issued: {format(new Date(cert.issuedDate), "MMM yyyy")}
                            {cert.expiryDate && ` • Expires: ${format(new Date(cert.expiryDate), "MMM yyyy")}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No certifications added yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="badges" className="space-y-4" data-testid="content-badges">
          <BadgeGallery staffId={id!} />
        </TabsContent>
        
        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Name</label>
                <p className="mt-1">{profile.emergencyContactName || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                <p className="mt-1">{profile.emergencyContactPhone || "Not provided"}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                <p className="mt-1">{profile.emergencyContactRelationship || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={addingCertification} onOpenChange={setAddingCertification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Certification</DialogTitle>
          </DialogHeader>
          <Form {...certForm}>
            <form onSubmit={certForm.handleSubmit((data) => addCertificationMutation.mutate(data))} className="space-y-4">
              <FormField
                control={certForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Food Safety Level 2" data-testid="input-cert-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={certForm.control}
                name="issuedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued By *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., CIEH" data-testid="input-cert-issuer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={certForm.control}
                name="issuedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-cert-issued" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={certForm.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-cert-expiry" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setAddingCertification(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCertificationMutation.isPending} data-testid="button-save-certification">
                  Save Certification
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Comprehensive Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-edit-profile">
          <DialogHeader>
            <DialogTitle>Edit Staff Profile</DialogTitle>
            <DialogDescription>
              Update all staff member information including banking details
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-8" data-testid="tabs-edit-profile">
                  <TabsTrigger value="basic" data-testid="tab-basic">Basic</TabsTrigger>
                  <TabsTrigger value="personal" data-testid="tab-personal">Personal</TabsTrigger>
                  <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency</TabsTrigger>
                  <TabsTrigger value="employment" data-testid="tab-employment">Employment</TabsTrigger>
                  <TabsTrigger value="banking" data-testid="tab-banking">Banking</TabsTrigger>
                  <TabsTrigger value="skills" data-testid="tab-skills">Skills</TabsTrigger>
                  <TabsTrigger value="languages" data-testid="tab-languages">Languages</TabsTrigger>
                  <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto py-4">
                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4 mt-0" data-testid="content-basic">
                    <FormField
                      control={editForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" data-testid="input-edit-full-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" data-testid="input-edit-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+44 20 1234 5678" data-testid="input-edit-phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="roleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-role-type">
                                <SelectValue placeholder="Select role type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="driver">Driver</SelectItem>
                              <SelectItem value="non-driver">Non-Driver</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-edit-hire-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="on-leave">On Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Add any notes..." data-testid="input-edit-notes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Personal Details Tab */}
                  <TabsContent value="personal" className="space-y-4 mt-0" data-testid="content-personal">
                    <FormField
                      control={editForm.control}
                      name="niNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>National Insurance Number</FormLabel>
                          <FormControl>
                            <Input placeholder="AB123456C" data-testid="input-edit-ni-number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-edit-dob" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="123 Main St, City, Postcode" data-testid="input-edit-address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="photoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Photo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/photo.jpg" data-testid="input-edit-photo-url" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Emergency Contact Tab */}
                  <TabsContent value="emergency" className="space-y-4 mt-0" data-testid="content-emergency">
                    <FormField
                      control={editForm.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact name" data-testid="input-edit-emergency-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Phone</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+44 20 9876 5432" data-testid="input-edit-emergency-phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="emergencyContactRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship</FormLabel>
                          <FormControl>
                            <Input placeholder="Spouse, Parent, Sibling, etc." data-testid="input-edit-emergency-relationship" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Employment Tab */}
                  <TabsContent value="employment" className="space-y-4 mt-0" data-testid="content-employment">
                    <FormField
                      control={editForm.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-contract-type">
                                <SelectValue placeholder="Select contract type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="full-time">Full Time</SelectItem>
                              <SelectItem value="part-time">Part Time</SelectItem>
                              <SelectItem value="zero-hours">Zero Hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hourly Rate (£)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="12.50" data-testid="input-edit-hourly-rate" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Banking Tab */}
                  <TabsContent value="banking" className="space-y-4 mt-0" data-testid="content-banking">
                    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 mb-4">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        ⚠️ <strong>Development Environment:</strong> Bank details are stored unencrypted for development purposes. 
                        In production, this sensitive data would be encrypted at rest and in transit.
                      </p>
                    </div>
                    <FormField
                      control={editForm.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account name" data-testid="input-edit-account-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="sortCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sort Code (XX-XX-XX)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12-34-56" 
                              data-testid="input-edit-sort-code" 
                              {...field}
                              onChange={(e) => {
                                const formatted = formatSortCode(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={8}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number (8 digits)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12345678" 
                              data-testid="input-edit-account-number" 
                              {...field}
                              maxLength={8}
                              onChange={(e) => {
                                const cleaned = e.target.value.replace(/\D/g, '');
                                field.onChange(cleaned);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  {/* Skills Tab */}
                  <TabsContent value="skills" className="space-y-4 mt-0" data-testid="content-skills">
                    <div>
                      <FormLabel>Skills</FormLabel>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="Add a skill..." 
                          value={skillsInput}
                          onChange={(e) => setSkillsInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSkill();
                            }
                          }}
                          data-testid="input-edit-skill"
                        />
                        <Button type="button" onClick={addSkill} data-testid="button-add-skill">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentSkills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="gap-1">
                            {skill}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeSkill(skill)}
                              data-testid={`button-remove-skill-${skill}`}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Languages Tab */}
                  <TabsContent value="languages" className="space-y-4 mt-0" data-testid="content-languages">
                    <div>
                      <FormLabel>Languages</FormLabel>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          placeholder="Add a language..." 
                          value={languagesInput}
                          onChange={(e) => setLanguagesInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addLanguage();
                            }
                          }}
                          data-testid="input-edit-language"
                        />
                        <Button type="button" onClick={addLanguage} data-testid="button-add-language">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentLanguages.map((lang) => (
                          <Badge key={lang} variant="secondary" className="gap-1">
                            {lang}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => removeLanguage(lang)}
                              data-testid={`button-remove-language-${lang}`}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Preferences Tab */}
                  <TabsContent value="preferences" className="space-y-4 mt-0" data-testid="content-preferences">
                    <FormField
                      control={editForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-timezone">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Europe/London">Europe/London</SelectItem>
                              <SelectItem value="Europe/Dublin">Europe/Dublin</SelectItem>
                              <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="weekStartsOn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Week Starts On</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-week-starts">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Sunday</SelectItem>
                              <SelectItem value="1">Monday</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="preferredNotificationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Notification Time</FormLabel>
                          <FormControl>
                            <Input type="time" data-testid="input-edit-notification-time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="contactOptIn"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <input 
                              type="checkbox" 
                              checked={field.value} 
                              onChange={field.onChange}
                              data-testid="checkbox-edit-opt-in"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Opt-in for SMS/Email Notifications</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditProfileOpen(false)}
                  data-testid="button-cancel-edit-profile"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
