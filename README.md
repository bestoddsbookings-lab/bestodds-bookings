# BestOddsGH MVP — Build Guide

Overview

This project implements a manual-payment, access-controlled booking code platform (MVP).

User flow:
Register → Verify Email → Submit Payment Proof → Admin Approval → Receive Booking Code

1. Environment Configuration
.env
```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/bestoddsgh
JWT_SECRET=supersecretkey
EMAIL_USER=bestoddsgh@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:3000
```

Requirements
- Use Gmail App Password (requires 2FA enabled)
- `CLIENT_URL` must match frontend origin (used for CORS + email links)

2. Database Setup

From `/server`:

```bash
npx prisma generate
npx prisma migrate dev --name init_mvp
```

Expected Tables
- User
- Payment
- BookingCode
- UserBookingCode
- Session

If any are missing, fix `prisma/schema.prisma` before proceeding.

3. Authentication Module (Priority)

POST /api/auth/register

Body

{ "email": "string", "password": "string", "name": "string?" }

Behavior

- Create user (isVerified=false)
- Generate verification token
- Send email

Responses

- 201 → { "message": "verification_sent" }
- 400 → duplicate email

GET /api/auth/verify?token=XYZ

Behavior

- Validate token
- Set isVerified=true

Responses

- 200 → { "message": "verified" }
- 400/404 → invalid/expired

POST /api/auth/login

Body

{ "email": "string", "password": "string", "deviceId": "string" }

Checks

- User exists
- Password valid (bcrypt)
- isVerified === true

Behavior

- Create session
- Invalidate previous sessions
- Return JWT

Response

{ "token": "JWT" }

Validation Rules
- Unique emails enforced
- Passwords hashed (bcrypt)
- Unverified users cannot log in

4. Payment Module

POST /api/payments/submit (Auth Required)

Body

{
  "amount": number,
  "transactionId": "string",
  "screenshotUrl": "string"
}

Logic

- Max 2 pending payments per user
- transactionId must be unique

Generate reference:

REF-{userId}-{timestamp}

Store as PENDING

Responses

- 201 → { "paymentId": id, "referenceCode": string }
- 400 → validation error

5. Admin Module

Protect with role middleware or hardcoded admin email (MVP acceptable)

GET /api/admin/payments
- Returns all PENDING payments

POST /api/admin/approve/:paymentId

Behavior

- Set payment.status = APPROVED
- Set user.accessStatus = ACTIVE
- Assign booking code
- Send emails

Response

{ "status": "approved" }

POST /api/admin/reject/:paymentId

Behavior

- Set payment.status = REJECTED

Response

{ "status": "rejected" }

6. Booking Code Module

Admin Endpoints
POST /api/booking/create
{
  "code": "string",
  "matchName": "string",
  "expiryDate": "ISOString"
}
POST /api/booking/assign

Behavior (MVP)

Assign code to all ACTIVE users
User Endpoint
GET /api/booking/my-code

Conditions

- isVerified === true
- accessStatus === ACTIVE
- Not expired

Response

{
  "code": "ABC123",
  "matchName": "Team A vs Team B",
  "expiryDate": "..."
}

Errors

- 403 → not eligible
- 404 → no code

7. Email System (Nodemailer)

Use Gmail SMTP via:

EMAIL_USER
EMAIL_PASS (App Password)

Required Emails

1. Verification

Subject: Verify your BestOddsGH account

Link:

http://localhost:5000/api/auth/verify?token=XYZ

2. Payment Approved

Subject: Payment confirmed

3. Booking Code

Include:
- Code
- Match name
- Expiry
- Usage instructions

8. Session Security (Strict)

On Login
Create session:
{ userId, deviceId, ipAddress, createdAt }
Delete all other sessions
Middleware

For every protected request:

- Validate JWT
- Verify active session exists

9. Client (React)

Pages
/register
Submit → /api/auth/register
Show: Check your email
/login
Store JWT (localStorage or secure cookie)
/verify
Handle email redirect
/dashboard (Protected)

Sections

A. Access Status

NOT PAID / PENDING / ACTIVE

B. Payment

Upload proof
Submit to /api/payments/submit

C. Booking Code

Visible only if ACTIVE
Fetch /api/booking/my-code
API Rule

All protected requests:

Authorization: Bearer <JWT>

10. UI Guidelines

Dark theme
Blurred stadium background
Overlay: rgba(0,0,0,0.7)
Accent: neon green

11. Testing Checklist

Auth
Register → email sent
Verify → login works
Unverified login → blocked
Payment
Submit → visible in admin
Duplicate transaction → blocked

2 pending → blocked

Admin
Approve → user ACTIVE + email sent
Reject → status updated
Booking Code
Only ACTIVE users access
Expired codes not returned

12. Common Failure Points

Gmail issues → App Password or 2FA missing
Upload failures → storage config incorrect
Account sharing → session enforcement missing

13. MVP Completion Criteria

The system is complete when a user can:

- Register
- Verify email
- Submit payment
- Get approved
- Receive booking code

Without manual intervention

Route Summary
POST   /api/auth/register
GET    /api/auth/verify
POST   /api/auth/login

POST   /api/payments/submit

GET    /api/admin/payments
POST   /api/admin/approve/:paymentId
POST   /api/admin/reject/:paymentId

POST   /api/booking/create
POST   /api/booking/assign
GET    /api/booking/my-code
