# SouthGold School Portal - Setup Guide

This guide describes how to configure, migrate, and start the production-grade SouthGold School Portal.

---

## 1. Environment Configuration

Copy the template environment variables file to `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure the following parameters:

*   **`SUPABASE_SECRET_KEY`**: Provide your Supabase Service Role key (needed to securely administer user accounts bypasses RLS safely for administrative tasks like `supabase.auth.admin.createUser()`).
*   **SMTP Settings**: Ensure standard SMTP host and login keys are provided when you are ready to implement actual email delivery:
    *   `SMTP_HOST`: Host (e.g., `smtp.gmail.com`)
    *   `SMTP_PORT`: Port (e.g., `587` or `465`)
    *   `SMTP_USER`: SMTP user email
    *   `SMTP_PASSWORD`: SMTP app password
    *   `SMTP_FROM`: Address to show on outgoing emails

---

## 2. Supabase Migrations & Initial Setup

To set up the Postgres schema:

1.  Connect to your Supabase SQL editor or CLI.
2.  Apply the SQL statements inside `./supabase/migrations/0001_init.sql` to initialize all standard school portal tables, indexes, constraints, and sessions.
3.  *(Optional)* If you need to reset the database and clear all demo records, run the `/reset_database.sql` script. This deletes all mock activities, student profiles, and parent profiles while strictly preserving the `southgold@gmail.com` Super Admin profile.

---

## 3. Creating the Super Admin

The portal automatically checks and creates the default Super Admin account upon application startup:

*   **Email**: `southgold@gmail.com`
*   **Password**: `Southgold1234`

Alternatively, you can trigger this initialization manually at any time by making a POST request to:
`POST /api/auth/super-admin/init`

---

## 4. Onboarding and Password Flow

*   All newly onboarded roles (Staff Admin, Teacher, Parent, Student) are initially provisioned with a default password of **`1234`**.
*   All user accounts use production-grade **Supabase Auth** directly (with standard cryptographic hashing — passwords are never stored in plain text).
*   Upon their first login, users can securely change their password directly in the user profile menu.

---

## 5. Starting the Application

Follow these commands to install dependencies, compile, and run the development or production server:

### Installation
```bash
npm install
```

### Production Build
```bash
npm run build
```

### Production Start
```bash
npm run start
```

### Development Mode
```bash
npm run dev
```
