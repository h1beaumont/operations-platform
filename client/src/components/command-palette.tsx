import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  Calendar,
  Settings,
  Trophy,
  CalendarDays,
  ClipboardCheck,
  CalendarClock,
  Building2,
  BookOpen,
  UserCog,
  BarChart3,
  GraduationCap,
  Wrench,
  DollarSign,
  MessageSquare,
  ShoppingCart,
  Calculator,
  TrendingUp,
  Home,
  FileText,
  CalendarCheck,
  CheckSquare,
  Trash2,
  ClipboardList,
  Package,
  KeyRound,
  Droplet,
  Zap,
  HardHat,
  Sparkles,
  Flame,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  section: string;
}

const navItems: NavItem[] = [
  { title: "Overview & Guide", url: "/", icon: BookOpen, section: "General" },
  
  // Hiring Pipeline
  { title: "Pipeline", url: "/pipeline", icon: Users, section: "Hiring Pipeline" },
  { title: "Meetings", url: "/meetings", icon: Calendar, section: "Hiring Pipeline" },
  { title: "Pipeline Analytics", url: "/analytics", icon: BarChart3, section: "Hiring Pipeline" },
  { title: "Settings", url: "/settings", icon: Settings, section: "Hiring Pipeline" },
  
  // Staff Management
  { title: "Staff Leaderboard", url: "/staff", icon: Trophy, section: "Staff Management" },
  { title: "Availability", url: "/availability", icon: CalendarDays, section: "Staff Management" },
  { title: "Admin Availability", url: "/admin-availability", icon: UserCog, section: "Staff Management" },
  { title: "Schedules", url: "/schedules", icon: CalendarClock, section: "Staff Management" },
  { title: "Submit Compliance", url: "/submit-compliance", icon: ClipboardCheck, section: "Staff Management" },
  { title: "Compliance Analytics", url: "/compliance-analytics", icon: GraduationCap, section: "Staff Management" },
  
  // Maintenance
  { title: "General Maintenance", url: "/maintenance", icon: Wrench, section: "Maintenance" },
  { title: "Plumbing", url: "/maintenance/plumbing", icon: Droplet, section: "Maintenance" },
  { title: "Electrical", url: "/maintenance/electrical", icon: Zap, section: "Maintenance" },
  
  // Operations Hub
  { title: "Properties", url: "/properties", icon: Building2, section: "Operations Hub" },
  { title: "Task Management", url: "/operations/weekly-rota", icon: CheckSquare, section: "Operations Hub" },
  { title: "Critical Info", url: "/operations/critical-info", icon: KeyRound, section: "Operations Hub" },
  { title: "Contractors", url: "/operations/contractors", icon: HardHat, section: "Operations Hub" },
  { title: "Inspection Reports", url: "/inspection-reports", icon: ClipboardCheck, section: "Operations Hub" },
  { title: "Reviews & Complaints", url: "/reviews-complaints", icon: MessageSquare, section: "Operations Hub" },
  { title: "Wage Reports", url: "/wage-reports", icon: Calculator, section: "Operations Hub" },
  { title: "Business Analytics", url: "/business-analytics", icon: TrendingUp, section: "Operations Hub" },
  
  // Management
  { title: "Landlords", url: "/landlords", icon: Users, section: "Management" },
  { title: "Client Statements", url: "/client-statements", icon: FileText, section: "Management" },
  
  // Specialized Services
  { title: "Waste Clearance", url: "/specialized-services/waste-clearance", icon: Trash2, section: "Specialized Services" },
  { title: "Carpet Cleaning", url: "/specialized-services/carpet-cleaning", icon: Sparkles, section: "Specialized Services" },
  { title: "Oven Cleaning", url: "/specialized-services/oven-cleaning", icon: Flame, section: "Specialized Services" },
  
  // Ordering
  { title: "Ordering System", url: "/ordering-system", icon: ShoppingCart, section: "Ordering" },
  { title: "Cleaning Supplies", url: "/operations/cleaning-supplies", icon: Package, section: "Ordering" },
  { title: "Linen Admin", url: "/operations/linen-admin", icon: ClipboardList, section: "Ordering" },
  { title: "Linen Packing", url: "/operations/linen-packing", icon: Package, section: "Ordering" },
  { title: "Hotel Linen Ordering", url: "/specialized-services/dwell-linen", icon: Package, section: "Ordering" },
  { title: "Order Tracking", url: "/operations/cleaning-order-tracking", icon: ClipboardCheck, section: "Ordering" },
  
  // AST Lettings
  { title: "AST Properties", url: "/ast/properties", icon: Home, section: "AST Lettings" },
  { title: "Rent Calendar", url: "/ast/rent-calendar", icon: CalendarCheck, section: "AST Lettings" },
  { title: "AST Maintenance", url: "/ast/maintenance", icon: Wrench, section: "AST Lettings" },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (url: string) => {
    setLocation(url);
    onOpenChange(false);
  };

  // Group items by section
  const sections = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages..." data-testid="input-command-search" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(sections).map(([section, items]) => (
          <CommandGroup key={section} heading={section}>
            {items.map((item) => (
              <CommandItem
                key={item.url}
                value={`${item.section} ${item.title}`}
                onSelect={() => handleSelect(item.url)}
                data-testid={`command-item-${item.url.replace(/\//g, '-')}`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
