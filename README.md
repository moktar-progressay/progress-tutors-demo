# Progressay Demo Hub

Build a complete interactive public demo website/app called “ProgressTutors” for an edtech platform named Progressay. This is NOT a production app and does NOT need authentication, real payments, or a backend. It is a clickable UX prototype for a development team to understand and rebuild inside the real Progressay platform.

CORE PRODUCT GOALS

The demo must solve these four role-specific problems:

1. SCHOOL / TUITION ADMIN
- Manage operations across multiple tuition sites: teachers, students, recurring classes, capacity, schedules, rooms/locations, and tutor gaps.
- Manage paying tutors through Payment Requests generated from completed verified lessons.
- Manage collecting payments from parents/clients, including subscriptions, invoices, outstanding balances, failed payments and credits.
- Track attendance and progress, with GoProgress shown as the linked learning/attendance platform.

2. TUTOR
- See when and where they teach.
- See who they teach, including both 1-to-1 students and group classes.
- Sign in to start a lesson and record tutor attendance.
- Submit a Lesson Review after the lesson.
- See earnings and submit Payment Requests.

3. PARENT
- One parent account may have multiple children.
- See all classes/lessons for each child.
- Switch between All Children and individual child profiles.
- See homework assigned through a mocked GoProgress integration.
- Manage payments and subscriptions.
- Search for and join additional classes.

4. STUDENT
- Make progress motivating and gamified.
- Show next lessons, homework, course progress, XP, level, streaks, badges and rewards.

VISUAL DIRECTION

Use the existing ProgressTutors visual identity:
- Main app colour is a bold pink / magenta similar to #EC2F73.
- White background, very light Google-like feel.
- Avoid dense boxy enterprise UI.
- Use generous whitespace, minimal borders, light dividers, subtle shadows only where necessary.
- Bold coloured KPI tiles can use soft pink, blue, green, amber, purple.
- Use a large curved pink welcome hero at the top of dashboards.
- Use a matching curved pink footer treatment.
- Rounded corners, strong typography, avatars and icons.
- Major dashboard sections should be collapsible with chevrons so users can hide sections.
- Desktop: left sidebar navigation.
- Mobile: compact top bar and bottom navigation.
- Fully responsive.

NO AUTHENTICATION

At the very top of the demo, include an obvious “Demo role” switcher with:
- Admin
- Tutor
- Parent
- Student

Switching role changes the entire app navigation and screens instantly.

USE REALISTIC SEEDED DEMO DATA

Organisation: Progressay Tutors
Sites:
- Lancaster Youth Hub
- Freston Road
- Chelsea Youth Hub

Use example classes such as:
- GCSE English @ Lancaster Youth Hub
- GCSE Maths @ Freston Road
- KS2 Maths @ Chelsea Youth Hub

Use example users:
- Tutor: Sarah Ahmed
- Tutor: James Wilson
- Parent: Sarah Khan
- Children: Aisha Khan, Adam Khan, Yasmin Khan

Do NOT hard-code logic around Progressay specifically. The UI should clearly look like generic tuition-management software that another tuition company could use. The demo data is only illustrative.

APP ARCHITECTURE / ROUTES

Create these routes and make all navigation functional.

ADMIN
/admin/dashboard
/admin/operations
/admin/classes
/admin/classes/:id
/admin/students
/admin/tutors
/admin/payments
/admin/payment-requests
/admin/reports

TUTOR
/tutor/dashboard
/tutor/lessons
/tutor/lesson/:id
/tutor/lesson/:id/review
/tutor/earnings
/tutor/payment-requests

PARENT
/parent/dashboard
/parent/children/:id
/parent/classes
/parent/classes/:id
/parent/payments

STUDENT
/student/dashboard
/student/lessons
/student/homework
/student/progress
/student/rewards

ADMIN DASHBOARD

Large curved pink hero:
“Welcome back, Moktar 👋”
“Here’s what’s happening across your tuition today.”

Score cards:
- 96 Students
- 12 Classes
- 8 Tutors
- 5 Lessons Today
- 82% Capacity
- 3 Actions Required

Upcoming Lessons panel:
Support both:
1-to-1 example:
Aisha Khan
GCSE Maths
Sarah Ahmed
Today 17:00
Online
GoProgress link

Group example:
GCSE English
Lancaster Youth Hub
Sarah Ahmed
18:00
9/10 students
GoProgress link

Calendar next to Upcoming Lessons on desktop.

Quick Actions:
- Add Class
- Add Lesson
- Add Tutor
- Add Student
- Open GoProgress
- Operations Planner

Operations Snapshot:
- Lancaster Youth Hub: 5 classes, 32 students, 86% capacity
- Freston Road: 5 classes, 28 students, 72% capacity
- Chelsea Youth Hub: 2 classes, 14 students, 78% capacity

Alerts:
- GCSE English full
- KS2 Maths has no tutor assigned
- 3 Payment Requests awaiting approval

Payments summary:
- Collected
- Owed
- Expected
- Processing

Tutor leaderboard:
- Tutor avatar
- Tutor name
- Attendance %
- Lesson Reviews completed
- Lessons delivered

Every major dashboard section should have a collapse chevron.

ADMIN OPERATIONS SCREEN

This is a major feature.
Top filters:
- Site
- Day
- View: Classes / Rooms / Students

Build a visual timetable / operations planner inspired by a weekly tuition timetable.
Time across the top.
Class cards in the grid.
IMPORTANT: tutor avatar must be INSIDE the lesson/class card, not a separate tutor row.

Each class card shows:
- Subject
- Level
- Time
- Tutor avatar + name
- Student count / capacity
- Room or Online
- Capacity status

Use capacity colours:
- Green Available
- Amber Nearly Full
- Red Full
- Purple Over Capacity

Right-side operational panel:
- Site opening hours
- Classes today
- Students today
- Tutors today
- Capacity
- Alerts
- Students without class
- Classes without tutor
- Tutor gaps

Quick actions:
- Add Class
- Add Tutor
- Add Student
- Assign Tutor
- Open GoProgress

ADMIN CLASSES SCREEN

Header:
Classes
12 active classes · 96 students

Actions:
- Add Class
- Operations Planner

Filters:
Site, Day, Subject, Level, Tutor, Status
Search classes, tutors or codes

Toggle:
Cards | List | Timetable

Example class card:
GCSE English
Group Class
Lancaster Youth Hub
Sunday 12:00–13:00
Tutor Sarah Ahmed
9/10 students
1 space left
GoProgress ✓ Connected
View Class

ADMIN CLASS DETAIL

Breadcrumb:
Operations › Classes › GCSE English

Header:
GCSE English
Group Class
Active
Code: SUNE4
Lancaster Youth Hub
Sunday 12:00–13:00
Room 2
Weekly

Summary:
- Students 9/10
- Tutor Sarah Ahmed
- GoProgress Connected
- Attendance 92%

Tabs:
- Students
- Schedule
- GoProgress
- Attendance
- Payments
- Notes

Students tab:
Student, Year, Parent, Attendance, Status
Actions:
View Student, View Parent, Move Class, Remove, Message Parent

Schedule tab:
Recurring schedule and upcoming sessions

GoProgress tab:
- course name
- student sync count
- teacher sync count
- lesson sync count
- Open GoProgress
- Sync Now

Attendance tab:
Class attendance and per-student attendance

Payments tab:
Expected, Collected, Outstanding for the class

ADMIN CLIENT PAYMENTS

Page title: Payments / Billing & Subscriptions

Summary:
- Total Collected £12,540
- Outstanding £1,845
- Expected £8,920
- Active Subscriptions 24
- Failed Payments 2

Tabs:
Clients, Subscriptions, Invoices, Payments, Refunds

Table:
Parent / client
Children
Plan
Next payment
Amount
Status
Actions

Client drawer or detail panel:
Parent name
Children
Subscriptions per child
Household total
Invoices
Payments
Credits

Actions:
Send reminder
Create invoice
Add credit
Refund
Pause subscription
Cancel subscription
Change plan

ADMIN PAYMENT REQUESTS

Call this feature “Payment Requests”, never “Payment Orders”.

Summary:
- Total Requested £4,280
- Pending Review £2,480
- Approved £1,600
- Paid
- On Hold £200

Tabs:
All, Pending Review, Approved, Paid, Rejected

Table:
Request ID
Tutor
Lessons
Hours
Amount
Status

Opening a request shows:
Payment Request PR-1042
Tutor Sarah Ahmed
12 verified lessons
12 hours
£300

Each lesson line shows:
- Date
- Student or Group Class
- Scheduled time
- Tutor sign-in time
- Lesson Review status
- GoProgress attendance status
- Tutor rate
- Amount

Buttons:
Approve
Query
Adjust
Reject
Message Tutor
Mark Paid

Approving should visibly change status in demo state.

TUTOR DASHBOARD

Hero:
“Good afternoon, Sarah 👋”
“Know where to teach, who to teach and what you’re owed.”

Score cards:
- 3 Today’s Lessons
- 2 Reviews Due
- £175 Ready to Request
- £420 Earned This Month

Main panel: Today’s Lessons

1-to-1 example:
GCSE Maths
Aisha Khan
17:00–18:00
Online
Buttons: Sign In, Open GoProgress

Group example:
GCSE English
Lancaster Youth Hub
18:30–19:30
9 students
Buttons: Sign In, Open GoProgress

Signing in should change the card to:
Signed in at 16:57
Timer / lesson active state
Button: End Lesson & Review

Action Required panel:
“Lesson Review required”
“Complete this review to make the lesson eligible for payment.”

Earnings panel:
- £420 earned
- £175 ready to request
- £120 awaiting Lesson Reviews
- £125 approved

TUTOR LESSON REVIEW

Pre-populate:
Tutor
Student or Class
Subject
Date
Scheduled time
Actual sign-in time

Tutor fills:
- What went well?
- Even better if?
- Topics covered
- Homework / next steps
- Additional notes

Button:
Submit Lesson Review

On submit show success:
“Review submitted. This lesson is now eligible for payment.”

TUTOR PAYMENT REQUESTS

Draft Payment Request should be built automatically from eligible lessons.

Example:
7 eligible lessons
7 hours
£175

Show individual lesson rows.
Allow “Submit Payment Request”.
On submit change to Submitted.

PARENT DASHBOARD

Hero:
“Welcome back, Sarah 👋”
“Everything happening across your children’s tuition.”

Child switcher:
- All Children
- Aisha
- Adam
- Yasmin
- + Add Child

Mobile uses “Viewing: All Children ▼”.

All Children view shows combined lessons:
Aisha – GCSE Maths – Today 17:00 – Online
Adam – KS3 English – Saturday 11:00 – Lancaster Youth Hub
Yasmin – KS2 Maths – Sunday

Homework from GoProgress:
Aisha – Quadratic equations – due tomorrow
Adam – English essay plan – due Friday

Payments:
£140 due this month
Aisha £80
Adam £60

Actions:
Manage Payments
Find Classes
Find Tutor
Open GoProgress

PARENT FIND CLASSES

Search/filter:
- Which child
- Subject
- Level
- Online / In Person
- Location
- Day
- Time

Example result:
GCSE Maths Booster
Sunday 11:00
Lancaster Youth Hub
8/10 places
£20/session
View Class

Click Join Class:
Choose child
Confirm class
Select demo payment option
Confirm enrolment
Success message:
“Class added for Aisha and linked to GoProgress.”

PARENT PAYMENTS

Show:
Due this month
Paid this term
Active subscriptions

Subscriptions by child.
Invoices and payment history.

STUDENT DASHBOARD

Hero:
“Welcome back, Aisha 🔥”
“Keep your streak going and level up.”

Show:
Level 7
1,250 XP
12-day streak

Score cards:
- 2 Upcoming Lessons
- 3 Homework Due
- 12 Day Streak
- 24 Tasks Completed
- 4 Active Courses

Next Lesson:
GCSE Maths
Sarah Ahmed
Today 17:00
Join Lesson
Open GoProgress

Homework:
Quadratic equations
Due tomorrow

Progress:
72% GCSE Maths progress
12/16 lessons complete

Gamification:
Badges such as:
- Perfect Attendance
- Homework Hero
- Grade Up
- 10 Week Streak
- Course Complete

Include a demo button such as “Complete task +50 XP” that visibly increases XP and triggers a small celebratory success state.

INTERACTIONS REQUIRED

This must feel like a working prototype, not static screenshots.

Implement local demo state for:
- Role switching
- Collapse / expand dashboard modules
- Admin navigation
- Opening class detail
- Switching class tabs
- Filtering classes
- Tutor Sign In
- Lesson active state
- Lesson Review submission
- Tutor Payment Request submission
- Admin Payment Request approval
- Parent child switching
- Joining a class
- Student XP increase
- Responsive mobile navigation

Use no authentication and no external APIs. GoProgress actions should be simulated as links/buttons and sync statuses.

Add a subtle top banner somewhere saying:
“Interactive ProgressTutors product demo · Sample data only”

Make the final site visually polished enough to share directly with a software development team and stakeholders.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://progress-tutors-demo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9dbee889-074b-415e-932b-54588a255387).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
