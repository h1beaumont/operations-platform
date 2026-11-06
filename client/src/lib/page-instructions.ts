export const wasteClearanceInstructions = {
  title: "How to Submit Waste Clearance Requests",
  description: "Book waste clearance services with automated notifications and AI summaries",
  steps: [
    {
      step: 1,
      title: "Fill Out Request Form",
      description: "Enter all required property and client information.",
      tips: [
        "Property address must be complete and accurate",
        "Include client contact details (email or phone)",
        "Provide detailed waste description for AI summary",
      ],
    },
    {
      step: 2,
      title: "Add Optional Details",
      description: "Include availability, lockbox code, and contractor information if known.",
      tips: [
        "Availability date/time helps contractors schedule",
        "Lockbox code enables property access",
        "Pre-fill contractor info to skip manual assignment",
      ],
    },
    {
      step: 3,
      title: "Submit and Track",
      description: "Submit the request to trigger automated notifications.",
      tips: [
        "AI generates a professional waste summary",
        "Email and SMS sent to team and contractor",
        "Request appears in history with status tracking",
      ],
    },
    {
      step: 4,
      title: "Monitor Status",
      description: "Track request progress through pending, scheduled, completed, or cancelled.",
      tips: [
        "Filter by status to find specific requests",
        "Update status as work progresses",
        "View complete request history for auditing",
      ],
    },
  ],
};

export const equipmentTrackingInstructions = {
  title: "How to Track Trolleys and Caddies",
  description: "Sign out and sign in cleaning equipment with condition monitoring",
  steps: [
    {
      step: 1,
      title: "Select Equipment Type",
      description: "Choose between Trolleys (1-10) or Caddies (1-20) tabs.",
      tips: [
        "Trolleys: Heavy-duty equipment for property restocks",
        "Caddies: Daily cleaning supply carriers",
        "Each type has different tracking requirements",
      ],
    },
    {
      step: 2,
      title: "Sign Out Equipment",
      description: "Select staff member, equipment number, and upload condition photo.",
      tips: [
        "System checks if equipment is already out",
        "Photo documents initial condition",
        "Only available equipment can be signed out",
      ],
    },
    {
      step: 3,
      title: "Sign In Equipment",
      description: "Return equipment and confirm status/condition.",
      tips: [
        "Trolleys: Confirm all property items accounted for",
        "Caddies: Note if products were left behind",
        "Photo documents return condition",
      ],
    },
    {
      step: 4,
      title: "Monitor Status",
      description: "View current status and recent movement history.",
      tips: [
        "Current Status shows which items are out",
        "Recent Movements provides audit trail",
        "Identify equipment usage patterns",
      ],
    },
  ],
};

export const dwellLinenInstructions = {
  title: "How to Order Building A Building Linen",
  description: "Place linen orders with automated team notifications",
  steps: [
    {
      step: 1,
      title: "Fill Order Form",
      description: "Enter quantities for cages and all linen items needed.",
      tips: [
        "Cages to collect is required (minimum 1)",
        "All other items default to 0 if not needed",
        "Double-check quantities before submitting",
      ],
    },
    {
      step: 2,
      title: "Submit Order",
      description: "Click submit to place order and trigger automated notifications.",
      tips: [
        "Email and SMS sent to linen team automatically",
        "Order appears in history with 'pending' status",
        "No manual follow-up required",
      ],
    },
    {
      step: 3,
      title: "Track Order Status",
      description: "Monitor orders through pending, confirmed, and delivered stages.",
      tips: [
        "Filter by status to find specific orders",
        "Click 'Confirm' when linen team acknowledges",
        "Click 'Delivered' when items received",
      ],
    },
    {
      step: 4,
      title: "Review History",
      description: "View all past orders with dates, quantities, and status.",
      tips: [
        "Track linen usage over time",
        "Identify ordering patterns",
        "Audit order fulfillment",
      ],
    },
  ],
};

export const meetingsInstructions = {
  title: "How to Schedule Group Meetings",
  description: "Manage group interview meetings with Google Calendar integration",
  steps: [
    {
      step: 1,
      title: "Create a New Meeting",
      description: "Click 'Schedule Meeting' button to open the meeting creation dialog.",
      tips: [
        "Enter a descriptive title (e.g., 'Group Interview - Cleaners')",
        "Select date and time for the interview",
        "Add location details (office address, Zoom link, etc.)",
      ],
    },
    {
      step: 2,
      title: "Add Candidates to Meeting",
      description: "Go back to Pipeline page, select screened candidates, then assign them to your meeting.",
      tips: [
        "Only 'Screened' candidates can be assigned to meetings",
        "Candidates are automatically moved to 'Scheduled' status",
        "They receive Google Calendar invites automatically",
      ],
    },
    {
      step: 3,
      title: "View Meeting Details",
      description: "Click on any meeting card to see attendee list and meeting details.",
      tips: [
        "See all candidates assigned to the meeting",
        "View Google Calendar event link",
        "Check attendance status",
      ],
    },
    {
      step: 4,
      title: "After the Meeting",
      description: "Return to Pipeline page and update candidate statuses based on interview results.",
      tips: [
        "Move successful candidates to 'Attended' or 'Hired'",
        "Remove unsuccessful candidates or keep them in 'Scheduled'",
      ],
    },
  ],
};

export const availabilityInstructions = {
  title: "How to Manage Staff Availability",
  description: "Track and manage when your staff are available to work",
  steps: [
    {
      step: 1,
      title: "Understand the Availability Matrix",
      description: "The calendar shows each staff member's availability for the next 7 days.",
      tips: [
        "Green: All time slots available (10am-3pm)",
        "Yellow: Partially available (some slots)",
        "Red: Not available for that day",
        "Gray: Awaiting response (no submission yet)",
      ],
    },
    {
      step: 2,
      title: "Automated SMS Reminders",
      description: "The system automatically sends SMS reminders every Wednesday and Sunday at 4:30pm.",
      tips: [
        "Staff receive a unique link to submit their availability",
        "Reminders are sent to all active staff members",
        "Links are valid for 7 days and can be reused",
      ],
    },
    {
      step: 3,
      title: "Staff Submit Availability",
      description: "Staff click the SMS link and select their available time slots.",
      tips: [
        "They can select hourly slots from 10am to 3pm",
        "Submissions update the matrix in real-time",
        "Staff can update their availability multiple times",
      ],
    },
    {
      step: 4,
      title: "Use for Scheduling",
      description: "Reference this matrix when creating cleaning schedules.",
      tips: [
        "Check availability before assigning jobs",
        "Green days are best for scheduling",
        "Yellow days require checking specific time slots",
      ],
    },
  ],
};

export const schedulesInstructions = {
  title: "How to Create Cleaning Schedules",
  description: "Import Uplisting jobs and auto-assign to available staff",
  steps: [
    {
      step: 1,
      title: "Export Jobs from Uplisting",
      description: "Download your weekly cleaning jobs CSV from Uplisting.",
      tips: [
        "Log into Uplisting dashboard",
        "Go to Jobs/Cleaning section",
        "Export jobs for the desired week as CSV",
      ],
    },
    {
      step: 2,
      title: "Upload CSV to System",
      description: "Drag and drop the Uplisting CSV file or click to browse.",
      tips: [
        "System automatically matches properties by name",
        "Exact match → Fuzzy match → Alias lookup",
        "Unmatched properties are flagged for manual review",
      ],
    },
    {
      step: 3,
      title: "Review Matched Properties",
      description: "Check the property matching results and fix any unmatched items.",
      tips: [
        "Green check = matched successfully",
        "Yellow warning = fuzzy match (review needed)",
        "Red X = no match found (assign manually)",
      ],
    },
    {
      step: 4,
      title: "Auto-Generate Schedules",
      description: "Click 'Auto-Schedule' to assign jobs to staff based on availability and location.",
      tips: [
        "System groups jobs by location for efficiency",
        "Only assigns to staff who are available",
        "Respects max jobs per day limits",
      ],
    },
    {
      step: 5,
      title: "Send Schedules to Staff",
      description: "Review the assignments and click '1-Click Send' to notify all staff.",
      tips: [
        "Staff receive schedules via email and SMS",
        "Each cleaner gets only their assigned jobs",
        "Delivery status is tracked automatically",
      ],
    },
  ],
};

export const propertiesInstructions = {
  title: "How to Manage Properties",
  description: "Add, edit, and organize your property portfolio",
  steps: [
    {
      step: 1,
      title: "View All Properties",
      description: "See your complete property portfolio with location groups.",
      tips: [
        "Use search to find specific properties quickly",
        "Filter by location group to view by area",
        "Table shows name, address, group, and status",
      ],
    },
    {
      step: 2,
      title: "Add New Property",
      description: "Click 'Add Property' button to create a new property.",
      tips: [
        "Enter property name (must match Uplisting exactly)",
        "Add full address for cleaner reference",
        "Assign to a location group for scheduling",
        "Optionally add Uplisting ID for auto-matching",
      ],
    },
    {
      step: 3,
      title: "Edit Property Details",
      description: "Click the edit icon on any property to update information.",
      tips: [
        "Update name if Uplisting name changes",
        "Correct address details as needed",
        "Move to different location group if needed",
      ],
    },
    {
      step: 4,
      title: "Delete Properties",
      description: "Remove properties that are no longer active.",
      tips: [
        "Click trash icon next to property",
        "Confirm deletion in the dialog",
        "Cannot delete if jobs are assigned",
      ],
    },
  ],
};

export const leaderboardInstructions = {
  title: "How to Use the Staff Leaderboard",
  description: "Track compliance scores and performance rankings",
  steps: [
    {
      step: 1,
      title: "Understanding Compliance Scores",
      description: "Staff are ranked by weighted compliance scores (max 15.0 points).",
      tips: [
        "11 compliance criteria with different weights",
        "Higher weight = more important (e.g., finishing on time = 2.0 pts)",
        "Scores update after each compliance submission",
      ],
    },
    {
      step: 2,
      title: "View Rankings",
      description: "See who's performing best based on compliance checks.",
      tips: [
        "Top performers shown with rankings",
        "Color-coded for quick visual reference",
        "Click on staff to see detailed history",
      ],
    },
    {
      step: 3,
      title: "Manage Staff",
      description: "Add, edit, or deactivate staff members from the list.",
      tips: [
        "Use 'Add Staff' to create new team members",
        "Toggle 'Active' status to remove from scheduling",
        "Edit phone numbers and contact details",
      ],
    },
    {
      step: 4,
      title: "Display on TV (Linen Room)",
      description: "Show the leaderboard on your TV for staff motivation.",
      tips: [
        "On Fire Stick browser, open Silk Browser and navigate to your app URL + /tv",
        "Example: https://your-app-name.replit.app/tv",
        "Leaderboard auto-refreshes every 30 seconds",
        "Full-screen, TV-optimized display with large text",
        "No login required - direct access for public viewing",
      ],
    },
  ],
};

export const currentStaffInstructions = {
  title: "How to Manage Current Staff",
  description: "View and manage your active team members",
  steps: [
    {
      step: 1,
      title: "View Staff List",
      description: "See all your active team members with their performance metrics.",
      tips: [
        "Staff are listed with compliance scores and rankings",
        "Use search to find specific team members",
        "Filter by role type (Driver/Non-Driver)",
      ],
    },
    {
      step: 2,
      title: "View Staff Details",
      description: "Click on any staff member to see their detailed profile.",
      tips: [
        "See full compliance history",
        "View assigned properties and schedule",
        "Check contact information and hire date",
      ],
    },
    {
      step: 3,
      title: "Track Performance",
      description: "Monitor staff compliance scores and trends over time.",
      tips: [
        "Green scores (10+) = excellent performance",
        "Yellow scores (7-10) = acceptable performance",
        "Red scores (<7) = needs improvement",
      ],
    },
  ],
};

export const maintenanceInstructions = {
  title: "How to Manage Maintenance",
  description: "Track and resolve property maintenance issues",
  steps: [
    {
      step: 1,
      title: "Create Maintenance Request",
      description: "Report a new maintenance issue at any property.",
      tips: [
        "Select the property from dropdown",
        "Choose priority (Low, Medium, High, Urgent)",
        "Add photos to document the issue",
        "Assign to a contractor if known",
      ],
    },
    {
      step: 2,
      title: "Track Status",
      description: "Monitor maintenance requests through their lifecycle.",
      tips: [
        "Pending = awaiting contractor assignment",
        "In Progress = contractor is working on it",
        "Completed = issue resolved",
        "View all requests in Kanban board view",
      ],
    },
    {
      step: 3,
      title: "Assign Contractors",
      description: "Assign maintenance tasks to specific contractors.",
      tips: [
        "System can suggest contractors based on issue type",
        "Contractors receive SMS notifications automatically",
        "Track contractor response times and completion rates",
      ],
    },
    {
      step: 4,
      title: "Analyze Costs",
      description: "Review maintenance spending by property and category.",
      tips: [
        "See top spending properties",
        "Track costs by category (plumbing, electrical, etc.)",
        "Monthly and yearly breakdowns available",
      ],
    },
  ],
};

export const inspectionInstructions = {
  title: "How to Conduct Property Inspections",
  description: "Complete digital inspection checklists and track quality",
  steps: [
    {
      step: 1,
      title: "Start New Inspection",
      description: "Begin a property inspection using a template checklist.",
      tips: [
        "Select the property to inspect",
        "Choose appropriate template (Move-in, Move-out, Routine)",
        "All templates are customizable",
      ],
    },
    {
      step: 2,
      title: "Complete Checklist",
      description: "Work through each inspection item systematically.",
      tips: [
        "Mark items as Pass, Fail, or N/A",
        "Add photos for failed items",
        "Write notes for any concerns",
        "Score is calculated automatically",
      ],
    },
    {
      step: 3,
      title: "Review Results",
      description: "View inspection score and any issues found.",
      tips: [
        "Failed items automatically escalate to maintenance",
        "Inspection history tracked per property",
        "Compare scores over time to track quality",
      ],
    },
    {
      step: 4,
      title: "Generate Reports",
      description: "Create PDF reports for landlords or records.",
      tips: [
        "Include photos and notes in reports",
        "Email reports directly from system",
        "Archive for compliance and records",
      ],
    },
  ],
};

export const reviewsInstructions = {
  title: "How to Manage Reviews & Complaints",
  description: "Handle guest feedback and resolve complaints effectively",
  steps: [
    {
      step: 1,
      title: "View All Feedback",
      description: "See guest reviews and complaints in one dashboard.",
      tips: [
        "Sentiment analysis shows positive/negative/neutral",
        "Filter by property, date, or sentiment",
        "Priority flags for urgent complaints",
      ],
    },
    {
      step: 2,
      title: "Respond to Complaints",
      description: "Use response templates or write custom responses.",
      tips: [
        "Templates speed up common responses",
        "Track response time per complaint",
        "Mark as resolved when complete",
      ],
    },
    {
      step: 3,
      title: "Create Action Items",
      description: "Convert complaints into actionable tasks.",
      tips: [
        "Assign to team members",
        "Link to maintenance if needed",
        "Track completion status",
      ],
    },
    {
      step: 4,
      title: "Analyze Trends",
      description: "Identify common themes and areas for improvement.",
      tips: [
        "See most common complaint categories",
        "Track properties with most issues",
        "Monthly trends and patterns",
      ],
    },
  ],
};

export const orderingInstructions = {
  title: "How to Use the Ordering System",
  description: "Manage inventory, suppliers, and purchase orders",
  steps: [
    {
      step: 1,
      title: "Browse Product Catalog",
      description: "View all available products across categories.",
      tips: [
        "Categories: Cleaning, Linen, Hoopers, Amazon",
        "Search by product name or SKU",
        "See current stock levels and reorder points",
      ],
    },
    {
      step: 2,
      title: "Create Purchase Order",
      description: "Order products that are running low on stock.",
      tips: [
        "System suggests items below reorder point",
        "Add multiple items to one order",
        "Select supplier and delivery date",
      ],
    },
    {
      step: 3,
      title: "Manage Suppliers",
      description: "Track supplier information and performance.",
      tips: [
        "Add new suppliers with contact details",
        "Track delivery times and reliability",
        "Compare pricing across suppliers",
      ],
    },
    {
      step: 4,
      title: "Track Spending",
      description: "Monitor procurement costs and budgets.",
      tips: [
        "View spending by category",
        "Monthly spend analytics",
        "Compare actual vs budgeted amounts",
      ],
    },
  ],
};

export const wageReportsInstructions = {
  title: "How to Manage Wage Reports",
  description: "Calculate wages, track timesheets, and generate payroll",
  steps: [
    {
      step: 1,
      title: "View Monthly Reports",
      description: "See wage calculations for all staff for any month.",
      tips: [
        "Automatically calculates from compliance submissions",
        "Includes hourly rates and total hours",
        "Tax and NI calculations included",
      ],
    },
    {
      step: 2,
      title: "Review Timesheets",
      description: "Verify hours worked by each team member.",
      tips: [
        "Data pulled from compliance check-ins",
        "Edit hours if corrections needed",
        "Flag anomalies for review",
      ],
    },
    {
      step: 3,
      title: "Export to Payroll",
      description: "Download wage data for your payroll system.",
      tips: [
        "Export as CSV for accountants",
        "Includes all necessary payroll fields",
        "HMRC-compliant format",
      ],
    },
    {
      step: 4,
      title: "Analyze Labor Costs",
      description: "Track payroll trends and budget vs actual.",
      tips: [
        "Monthly labor cost comparisons",
        "Per-property labor allocation",
        "Overtime tracking and alerts",
      ],
    },
  ],
};


export const businessAnalyticsInstructions = {
  title: "How to Use Business Analytics",
  description: "Track key performance metrics across your business",
  steps: [
    {
      step: 1,
      title: "Revenue Metrics",
      description: "Monitor occupancy, ADR, and RevPAR.",
      tips: [
        "ADR = Average Daily Rate per booking",
        "RevPAR = Revenue Per Available Room",
        "Track trends month-over-month",
        "Compare to industry benchmarks",
      ],
    },
    {
      step: 2,
      title: "Operations Efficiency",
      description: "Measure cleaning efficiency and staff productivity.",
      tips: [
        "Average cleaning time per property",
        "Staff utilization rates",
        "Guest satisfaction scores",
      ],
    },
    {
      step: 3,
      title: "Property Performance",
      description: "Identify top-performing and underperforming properties.",
      tips: [
        "Revenue ranking by property",
        "Maintenance cost per property",
        "Guest review scores",
      ],
    },
    {
      step: 4,
      title: "Cost Analytics",
      description: "Break down expenses by category and property.",
      tips: [
        "Maintenance, cleaning, supplies costs",
        "Labor cost allocation",
        "Identify cost-saving opportunities",
      ],
    },
  ],
};

export const astPropertiesInstructions = {
  title: "How to Manage AST Properties & Tenancies",
  description: "Handle long-term rental properties and tenancy agreements",
  steps: [
    {
      step: 1,
      title: "Add New Property",
      description: "Create a record for a new AST property.",
      tips: [
        "Enter property name and full address",
        "Add bedrooms, bathrooms, property type",
        "Include notes about the property",
      ],
    },
    {
      step: 2,
      title: "Upload Tenancy Agreement PDF",
      description: "AI automatically extracts contract details from PDF.",
      tips: [
        "Click 'Add Tenancy' button",
        "Upload PDF contract (AST agreement)",
        "AI extracts: tenant name, rent, dates, deposit, contact info",
        "Review extracted data and make corrections if needed",
      ],
    },
    {
      step: 3,
      title: "Manage Active Tenancies",
      description: "Track all current rental agreements.",
      tips: [
        "View tenant contact information",
        "See rent amount and payment frequency",
        "Monitor contract start and end dates",
        "Filter by active, expired, or terminated",
      ],
    },
    {
      step: 4,
      title: "Access Contract Documents",
      description: "View or download stored tenancy agreement PDFs.",
      tips: [
        "PDFs stored securely with each tenancy",
        "Download for reference or legal needs",
        "All historical contracts preserved",
      ],
    },
  ],
};

export const astRentCalendarInstructions = {
  title: "How to Track AST Rent Payments",
  description: "Monitor rent due dates and payment status",
  steps: [
    {
      step: 1,
      title: "View Payment Calendar",
      description: "See all upcoming rent payments for the next 30 days.",
      tips: [
        "Green = paid on time",
        "Yellow = due soon",
        "Red = overdue",
        "Shows tenant name, property, amount, due date",
      ],
    },
    {
      step: 2,
      title: "Automatic Overdue Detection",
      description: "System automatically identifies overdue rent payments",
      tips: [
        "Overdue count displayed automatically in summary cards",
        "Payments marked red when overdue",
        "Days overdue calculated in real-time",
        "No manual check required - always up to date",
      ],
    },
    {
      step: 3,
      title: "Confirm Payment Receipt",
      description: "Check bank account and mark payments as received",
      tips: [
        "Check your bank account for incoming payments",
        "Click 'Mark as Paid' when payment confirmed",
        "Add payment date and method for records",
      ],
    },
    {
      step: 4,
      title: "Send Payment Reminders",
      description: "If payment not received, send automated reminder to tenant",
      tips: [
        "Click dropdown menu (⋮) on overdue payment",
        "Select 'Send Payment Reminder'",
        "Sends both email AND SMS automatically",
        "Polite reminder includes amount, due date, property details",
      ],
    },
  ],
};

export const astMaintenanceInstructions = {
  title: "How to Manage AST Maintenance",
  description: "Handle maintenance for long-term rental properties",
  steps: [
    {
      step: 1,
      title: "View AST Maintenance",
      description: "See all maintenance requests for AST properties only.",
      tips: [
        "Filtered view shows only AST properties",
        "Same interface as short-stay maintenance",
        "Track by status: pending, in progress, completed",
      ],
    },
    {
      step: 2,
      title: "Create Maintenance Request",
      description: "Report issues at AST properties.",
      tips: [
        "Select AST property from dropdown",
        "Add description and photos",
        "Set priority level",
        "Optionally assign to worker",
      ],
    },
    {
      step: 3,
      title: "Assign Workers",
      description: "Flexibly assign maintenance to any available worker.",
      tips: [
        "Choose from list of maintenance workers",
        "Not limited to default assignments",
        "Multiple workers can be assigned if needed",
      ],
    },
    {
      step: 4,
      title: "Access Full Dashboard",
      description: "Link to complete maintenance management system.",
      tips: [
        "Click to view all maintenance (AST + short-stay)",
        "Unified system for all property types",
        "Detailed analytics and reporting",
      ],
    },
  ],
};

export const dailyTasksInstructions = {
  title: "How to Use Daily Tasks Dashboard",
  description: "Manage your daily operational checklist and track task completion",
  steps: [
    {
      step: 1,
      title: "View Today's Tasks",
      description: "The dashboard shows all tasks scheduled for the selected date with completion progress.",
      tips: [
        "Progress bar shows completed vs total tasks",
        "Use date picker to view tasks for any date",
        "Filter by category, status, or view only your assigned tasks",
        "Tasks are grouped by category for better organization",
      ],
    },
    {
      step: 2,
      title: "Complete Tasks",
      description: "Check off tasks as you complete them throughout the day.",
      tips: [
        "Click checkbox to mark task as complete",
        "Add completion notes by clicking the notes icon",
        "Status automatically updates to 'Completed'",
        "Smooth animations confirm your action",
      ],
    },
    {
      step: 3,
      title: "Generate Daily Tasks",
      description: "If tasks haven't been auto-generated, click 'Generate Tasks' button.",
      tips: [
        "System auto-generates tasks at midnight daily",
        "Manual generation available if needed",
        "Only active task templates are used",
        "Templates respect day-of-week rules",
      ],
    },
    {
      step: 4,
      title: "Track Task History",
      description: "View completed tasks using the date range filters.",
      tips: [
        "Select date range to see historical tasks",
        "Filter by staff member to track individual performance",
        "Use for performance reviews and compliance audits",
        "Export data for reporting purposes",
      ],
    },
  ],
};

export const taskTemplatesInstructions = {
  title: "How to Manage Task Templates",
  description: "Create and configure recurring tasks that auto-generate daily",
  steps: [
    {
      step: 1,
      title: "Create a Task Template",
      description: "Define what task should be created and when it should recur.",
      tips: [
        "Click 'Add Task Template' to open creation dialog",
        "Choose descriptive name (e.g., 'Daily Cleaning Compliance Check')",
        "Add detailed instructions in description field",
        "Select appropriate category for organization",
      ],
    },
    {
      step: 2,
      title: "Configure Recurrence",
      description: "Set when this task should be created.",
      tips: [
        "Daily: Task created every single day",
        "Specific Days: Choose days of week (e.g., Monday & Friday only)",
        "One-Time: For special non-recurring tasks",
        "Use checkboxes to select multiple days for weekly patterns",
      ],
    },
    {
      step: 3,
      title: "Assign Responsibility",
      description: "Specify who should complete this task.",
      tips: [
        "Assign to specific staff member for dedicated tasks",
        "OR assign to role (admin, cleaner, manager) for flexible assignment",
        "System will assign to available staff matching the role",
        "Set estimated time to help with workload planning",
      ],
    },
    {
      step: 4,
      title: "Set Priority and Activate",
      description: "Configure task importance and enable auto-generation.",
      tips: [
        "Priority levels: High (red), Medium (yellow), Low (blue)",
        "High priority tasks appear at top of daily list",
        "Toggle 'Active' to enable/disable auto-generation",
        "Inactive templates won't create new tasks",
      ],
    },
  ],
};

export const landlordsInstructions = {
  title: "How to Manage Landlords",
  description: "Add and manage landlord details for AST lettings and statement distribution",
  steps: [
    {
      step: 1,
      title: "Add New Landlord",
      description: "Click 'Add Landlord' button to create a new landlord profile.",
      tips: [
        "Enter full legal name exactly as it appears on property documents",
        "Use a valid email address for automated statement delivery",
        "Phone number format: +44 or 07XXX XXXXXX",
        "All contact details should be current and monitored regularly",
      ],
    },
    {
      step: 2,
      title: "Enter Bank Details (Secure)",
      description: "Add landlord's bank account information for payment tracking.",
      tips: [
        "Bank Account Name must match the landlord's registered name",
        "UK Sort Code format: XX-XX-XX (6 digits)",
        "Account Number: 8 digits for UK bank accounts",
        "Double-check details - errors can delay payments",
        "🔒 SECURITY: Bank details are automatically masked (e.g., ****1234)",
        "Full details are only visible through secure admin endpoint",
        "All access to unmasked bank details is audit logged",
        "Never share full bank details via email or chat",
      ],
    },
    {
      step: 3,
      title: "Assign Properties to Landlord",
      description: "Link AST properties to this landlord from the Properties page.",
      tips: [
        "Go to AST Properties page to assign properties",
        "Each property can only have one landlord at a time",
        "Use property linking to track rent collection per landlord",
        "Bulk assign multiple properties if landlord owns portfolio",
      ],
    },
    {
      step: 4,
      title: "Configure Statement Day",
      description: "Set which day of the month to automatically send financial statements.",
      tips: [
        "Default is 7th of each month (recommended)",
        "Choose a day between 1-28 to avoid month-end issues",
        "Statements sent automatically via email",
        "Landlord receives previous month's financial summary",
        "Can manually send statements at any time from Statements page",
      ],
    },
  ],
};

export const clientStatementsInstructions = {
  title: "How to Manage Client Statements",
  description: "Upload, reconcile, and distribute monthly financial statements to landlords",
  steps: [
    {
      step: 1,
      title: "Upload Monthly Statement",
      description: "Select landlord, month/year, and upload their financial statement file.",
      tips: [
        "Accepted formats: PDF, Excel (.xlsx, .xls), CSV",
        "File should contain complete financial breakdown",
        "Optional: Enter Total Income, Expenses, Net Amount for quick reference",
        "Upload before the statement day (default 7th) for auto-sending",
        "Files stored securely in attached_assets/statements/",
      ],
    },
    {
      step: 2,
      title: "Review Maintenance Costs",
      description: "Click 'Reconcile' button to check maintenance expenses against statement.",
      tips: [
        "System automatically fetches maintenance requests for landlord's properties",
        "Only shows maintenance from the statement month",
        "Review actual costs vs statement to ensure accuracy",
        "Warning displays if total exceeds £500 threshold",
        "Use reconciliation to identify missing charges or overcharges",
      ],
    },
    {
      step: 3,
      title: "Send Statement to Landlord",
      description: "Manually send statement via email or wait for automated sending.",
      tips: [
        "Status 'Pending': Statement not yet sent - can send manually",
        "Status 'Sent': Statement delivered successfully with timestamp",
        "Status 'Failed': Email delivery issue - check landlord email address",
        "Auto-send occurs on landlord's configured statement day (default 7th)",
        "Email includes statement as PDF attachment",
      ],
    },
    {
      step: 4,
      title: "Track Statement History",
      description: "Use filters to find and review past statements.",
      tips: [
        "Filter by landlord to see all their historical statements",
        "Filter by month/year to review specific periods",
        "Filter by status to find pending or failed deliveries",
        "Click file name to download statement copy",
        "Track delivery dates for compliance and audit purposes",
      ],
    },
  ],
};

export const cleaningOrderAdminInstructions = {
  title: "How the Cleaning Supplies Ordering System Works",
  description: "Automated SMS reminders for cleaning supply orders",
  steps: [
    {
      step: 1,
      title: "Set Up Schedules",
      description: "Create reminder schedules for each property with recipient details.",
      tips: [
        "Specify property name, reminder day/time, and delivery day",
        "Add recipient name and phone number for SMS notifications",
        "Toggle active/inactive to control automated reminders",
      ],
    },
    {
      step: 2,
      title: "Automated Reminders",
      description: "System sends SMS automatically at scheduled time.",
      tips: [
        "SMS includes order submission link",
        "Link is valid for order completion",
        "Recipients can submit orders via mobile device",
      ],
    },
    {
      step: 3,
      title: "Test Manually",
      description: "Use 'Send Now' to test before relying on automation.",
      tips: [
        "Verify SMS delivery and link functionality",
        "Check order submission flow",
        "Ensure recipient can complete the form",
      ],
    },
    {
      step: 4,
      title: "Track Orders",
      description: "Monitor submissions in the Order Tracking page.",
      tips: [
        "View all sent reminders and order status",
        "Track which orders have been submitted",
        "Update order status as items are delivered",
      ],
    },
  ],
};

export const cleaningOrderTrackingInstructions = {
  title: "How to Track Cleaning Supply Orders",
  description: "Monitor reminders and submitted orders",
  steps: [
    {
      step: 1,
      title: "Monitor Reminders",
      description: "View all sent SMS reminders in the Reminders Sent tab.",
      tips: [
        "Check message delivery status",
        "See which reminders have orders submitted",
        "Track submission timestamps",
      ],
    },
    {
      step: 2,
      title: "Review Orders",
      description: "See all submitted orders in the Orders Received tab.",
      tips: [
        "Filter by property, status, or search term",
        "View detailed item lists for each order",
        "Update status as orders are processed",
      ],
    },
    {
      step: 3,
      title: "Update Status",
      description: "Change order status from pending → confirmed → delivered.",
      tips: [
        "Click status buttons to update",
        "Track order fulfillment progress",
        "Maintain accurate delivery records",
      ],
    },
    {
      step: 4,
      title: "Export Data",
      description: "Export orders to CSV for record-keeping.",
      tips: [
        "Download complete order history",
        "Use for invoicing or reporting",
        "Archive for future reference",
      ],
    },
  ],
};
