import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Users, Phone, Mail, Search, Filter, MessageSquare,
  User, Calendar, Building2, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Staff } from "@shared/schema";

// Metric card component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  testId 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  testId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default function StaffDirectory() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "driver" | "non-driver">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Fetch staff
  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Filter staff
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.roleType === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate metrics
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === "active").length;
  const drivers = staff.filter(s => s.roleType === "driver").length;
  const nonDrivers = staff.filter(s => s.roleType === "non-driver").length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatPhone = (phone: string) => {
    // Format UK phone number for display
    if (phone.startsWith("+44")) {
      return phone;
    }
    return phone;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSMS = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground mt-1">
            Contact information and quick actions for all staff members
          </p>
        </div>
        <Button 
          onClick={() => navigate("/staff/leaderboard")}
          variant="outline"
          data-testid="button-view-leaderboard"
        >
          <Star className="w-4 h-4 mr-2" />
          View Leaderboard
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Total Staff" 
          value={totalStaff} 
          icon={Users} 
          testId="metric-total-staff"
        />
        <MetricCard 
          title="Active Staff" 
          value={activeStaff} 
          icon={User} 
          testId="metric-active-staff"
        />
        <MetricCard 
          title="Drivers" 
          value={drivers} 
          icon={Building2} 
          testId="metric-drivers"
        />
        <MetricCard 
          title="Non-Drivers" 
          value={nonDrivers} 
          icon={Calendar} 
          testId="metric-non-drivers"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-staff"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={roleFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("all")}
            data-testid="filter-all-roles"
          >
            All Roles
          </Button>
          <Button
            variant={roleFilter === "driver" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("driver")}
            data-testid="filter-drivers"
          >
            Drivers
          </Button>
          <Button
            variant={roleFilter === "non-driver" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("non-driver")}
            data-testid="filter-non-drivers"
          >
            Non-Drivers
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all-status"
          >
            All Status
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            data-testid="filter-active"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            data-testid="filter-inactive"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No staff members found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <Card 
              key={member.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => navigate(`/staff/${member.id}`)}
              data-testid={`staff-card-${member.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Name and Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate" data-testid={`staff-name-${member.id}`}>
                          {member.fullName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={member.roleType === "driver" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {member.roleType === "driver" ? "Driver" : "Non-Driver"}
                          </Badge>
                          <Badge 
                            variant={member.status === "active" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        <span className="truncate">{formatPhone(member.phone)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCall(member.phone);
                        }}
                        data-testid={`button-call-${member.id}`}
                        className="flex-1"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSMS(member.phone);
                        }}
                        data-testid={`button-sms-${member.id}`}
                        className="flex-1"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        SMS
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmail(member.email);
                        }}
                        data-testid={`button-email-${member.id}`}
                        className="flex-1"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
