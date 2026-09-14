# CAM Production Deployment Guide

This guide walks you through deploying **CAM (Club Accounting & Management)** to production using:
- **Database**: [Supabase](https://supabase.com) (Free Cloud PostgreSQL 16)
- **Backend API**: [Render](https://render.com) (Containerized Spring Boot 3 on Docker)
- **Frontend App**: [Vercel](https://vercel.com) (Global Edge CDN for React Vite)

---

## Prerequisites
- A [GitHub](https://github.com) account with your clean `CAM` repository.
- Your Google App Password for Gmail SMTP: `ndanmlicmxymtfam`.

---

## Step 1: Set Up Cloud PostgreSQL on Supabase

1. Go to [supabase.com](https://supabase.com) and click **Start your project** (log in with your GitHub account).
2. Click **New Project**:
   - **Organization**: Choose your default org.
   - **Name**: `cams-db`
   - **Database Password**: Enter a strong password and **copy it somewhere safe**.
   - **Region**: Choose the region closest to you (e.g., *South Asia (Mumbai)* or *Southeast Asia (Singapore)*).
   - **Pricing Plan**: Free.
3. Click **Create new project** and wait ~1-2 minutes for provisioning.
4. Once created, go to **Project Settings** (gear icon on bottom left) → **Database**.
5. Scroll down to **Connection parameters** and copy your database details:
   - **Host**: `db.<project-ref>.supabase.co`
   - **Port**: `5432`
   - **Database name**: `postgres`
   - **User**: `postgres`
   - **Password**: *(The database password you set in step 2)*
6. Your Spring Boot JDBC Connection URL will be:
   ```text
   jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
   ```

---

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and click **Get Started** (log in with your GitHub account).
2. On your Render Dashboard, click **New +** (top right) → **Web Service**.
3. Select **Build and deploy from a Git repository** and click **Next**.
4. Connect your GitHub repository: `Jaishnav30/CAM`.
5. Configure the Web Service:
   - **Name**: `cams-backend`
   - **Region**: Choose a region close to your database (e.g., *Oregon (US West)* or *Singapore*).
   - **Language / Runtime**: Choose **Docker**.
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Build Context**: `backend`
   - **Instance Type**: **Free** ($0/month).
6. Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Activates production configuration |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://db.<ref>.supabase.co:5432/postgres?sslmode=require` | From Supabase (Step 1) |
| `POSTGRES_USER` | `postgres` | Default Supabase user |
| `POSTGRES_PASSWORD` | `<your-supabase-db-password>` | Your Supabase password |
| `CAMS_JWT_SECRET` | `4a72d3f9e8b1c5a6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0` | Random 64-char hex secret |
| `CAMS_ADMIN_EMAIL` | `admin@cams.local` | Initial administrator login |
| `CAMS_ADMIN_PASSWORD` | `AdminProduction2026!` | Choose a strong admin password |
| `SPRING_MAIL_USERNAME` | `jaishnavkalmangi@gmail.com` | Your Gmail address |
| `SPRING_MAIL_PASSWORD` | `ndanmlicmxymtfam` | Your Google App Password |
| `CAMS_ALLOWED_ORIGINS` | `https://*.vercel.app` | Allows requests from your Vercel frontend |

7. Click **Create Web Service**.
8. Render will start building the Docker container and compile the Spring Boot application.
9. Watch the logs: Flyway will automatically execute migrations `V1` through `V17` on your Supabase database!
10. Once it says `Your service is live 🎉`, copy your public Render URL:
    ```text
    https://cams-backend-xxxx.onrender.com
    ```

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** → **Project**.
3. Locate `Jaishnav30/CAM` and click **Import**.
4. Configure Project:
   - **Framework Preset**: `Vite` (auto-detected).
   - **Root Directory**: Click **Edit** and select **`frontend`**.
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: `dist` (default).
5. Expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://cams-backend-xxxx.onrender.com` *(your live Render backend URL from Step 2, no trailing slash)* |

6. Click **Deploy**.
7. In ~30-45 seconds, Vercel will build and assign you a global HTTPS domain:
   ```text
   https://cam-xxxx.vercel.app
   ```

---

## Step 4: Final Verification

1. Open your live Vercel URL in your browser.
2. Sign In using:
   - **Username/Email**: `admin@cams.local`
   - **Password**: `<The CAMS_ADMIN_PASSWORD you configured on Render>`
3. Test Registration & OTP:
   - Open an incognito tab and click **Register**.
   - Enter your email and click **Continue to Email Verification**.
   - Check your Gmail inbox for the 6-digit OTP code dispatched by your live Render backend!
