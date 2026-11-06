# StaffFlow

The operations platform I built to run a short-let business that grew to 170 properties, with a team of 35 across the UK and the Philippines. The aim was for the whole business to run through one system: hiring, daily cleaning, maintenance, linen and supplies, lettings and finance, with AI handling the routine questions and a live leaderboard keeping the cleaning team motivated.

Names, contact details and property data have been removed or replaced. Company and staff names in the code are placeholders.

## What it did

- **Hiring and staff:** applications, interview scheduling through Google Calendar, trial shifts matched to mentors, onboarding, compliance scoring and availability.
- **Daily operations:** recurring and one-off tasks generated automatically each day, and a cleaner allocation engine with per-building rules.
- **Cleaner scoring and incentives:** every shift scored out of 15 against twelve weighted checks, such as arriving on time, completing every task and photo, reporting damage, handling linen properly and finishing on time. Scores fed a live leaderboard on a TV screen, a monthly email showing each cleaner their rank and who was just ahead and behind, badges for streaks and perfect scores, and cash prizes for the top three each month.
- **Maintenance:** a five-category workflow, with damage reports from inspection emails parsed by AI and turned into jobs automatically.
- **Linen and supplies:** stock levels, scheduled linen and cleaning-supply orders, and supplier invoices read from uploaded PDFs.
- **Lettings:** property onboarding, tenancy agreements extracted from documents, rent checks and automated payment reminders, and a separate landlord portal.
- **Finance:** QuickBooks sync, wage reports, owner statements by email.
- **AI assistants:** helpdesks for cleaning staff, guests and tenants, each using function calling to look up live data from the platform before answering, plus email and SMS drafting for the office team.

## Scale

- 87 pages, 39 backend services, over 600 API routes
- 143 database tables

## Stack

- React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query
- Node.js and Express, PostgreSQL (Neon) with Drizzle ORM
- OpenAI for document extraction and the assistants
- Twilio and JustCall for SMS and calls, Gmail, Google Calendar, Sheets and Cloud Storage, QuickBooks Online
- Role-based access for staff, JWT login for landlords

Built with the Replit AI agent, which I directed through the build, then ran in production.

Harry Beaumont · [github.com/h1beaumont](https://github.com/h1beaumont)
