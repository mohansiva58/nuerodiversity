# Deploy Stream Chat Token Backend on Render Free Plan

This moves `getStreamChatToken` away from Firebase Cloud Functions so Firebase can stay on the Spark/free plan.

## What You Will Deploy

- Backend route: `POST /api/stream/token`
- Source folder on Render: `backend`
- Runtime: Node.js
- Firebase stays on Spark/free plan
- Stream API secret stays only on Render, never in frontend code

## Important Free Plan Note

Render Free Web Services can run this backend for free, but they spin down after about 15 minutes without traffic. The first chat request after idle can take around a minute while Render wakes the service.

## Step 1: Push Code to GitHub

Commit and push these backend/frontend changes to the GitHub repo connected to Render.

## Step 2: Create a Firebase Service Account JSON

1. Open Firebase Console.
2. Select project `nueroempowerment`.
3. Go to Project settings.
4. Open the Service accounts tab.
5. Click Generate new private key.
6. Download the JSON file.
7. Open it in a text editor.
8. Copy the entire JSON content. You will paste it into Render as `FIREBASE_SERVICE_ACCOUNT_JSON`.

Keep this JSON private. Do not commit it to GitHub.

## Step 3: Create Render Web Service

1. Open https://dashboard.render.com
2. Click New.
3. Choose Web Service.
4. Connect your GitHub repo.
5. Use these settings:

```text
Name: neurohub-stream-backend
Runtime: Node
Root Directory: backend
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

6. Add environment variables before deploying:

```env
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Optional, only if you still want email/cache endpoints on this same backend:

```env
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
REDIS_URL=host:port
REDIS_PASSWORD=your_redis_password
```

## Step 4: Deploy

Click Create Web Service and wait for the deploy to finish.

After deploy, Render gives you a URL like:

```text
https://neurohub-stream-backend.onrender.com
```

Test the health endpoint:

```text
https://neurohub-stream-backend.onrender.com/api/health
```

It should return JSON with `"status":"OK"`.

## Step 5: Point Frontend to Render

Set this frontend env var wherever you build/deploy the Vite app:

```env
VITE_STREAM_TOKEN_FUNCTION_URL=https://neurohub-stream-backend.onrender.com/api/stream/token
```

For local development, add it to `.env.local` or `.env`.

For Firebase Hosting or Render Static Site, add it in that platform's environment settings before building.

## Step 6: Rebuild Frontend

Run:

```bash
npm run build
```

Then redeploy the frontend.

## Local Test

From the backend folder:

```bash
npm install
npm start
```

The local endpoint is:

```text
http://localhost:5001/api/stream/token
```

The frontend automatically uses this local endpoint during `npm run dev` if `VITE_STREAM_TOKEN_FUNCTION_URL` is not set.
