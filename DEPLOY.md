Deployment steps

Option A — Deploy with Docker (recommended for full-stack deploy)

1. Build the image locally:

```bash
# from repo root
docker build -t bestoddsg:latest .
```

2. Run locally:

```bash
docker run -p 5000:5000 --env PORT=5000 bestoddsg:latest
```

3. Visit http://localhost:5000 to see the app. The server serves both the API and the client build.

Option B — Deploy to Render / Railway / DigitalOcean App Platform

- Push repo to GitHub.
- Create a new Web Service on the platform and point it to your repo.
- If using Docker, select "Docker" and the root `Dockerfile` will be used.
- Set environment variables (e.g., `DATABASE_URL`, `JWT_SECRET`, etc.) in the platform UI.
- Ensure the service exposes port `5000`.

Notes

- The server now looks for the client build in two locations:
  - `client/build` (useful for local dev if you `npm run build` in `client`)
  - `server/build` (used by the Dockerfile where the client build is copied into the server folder)

- The server already serves `/uploads` and `/favicon.ico` from the `server/uploads` folder.

Render (one-click / CI deploy)
--------------------------------

1. Push your repo to GitHub (or ensure the repo is already on GitHub):

```bash
# from the repo root
git remote add origin git@github.com:<your-username>/<repo-name>.git
git push -u origin main
```

2. On Render.com, click **New +** → **Web Service**, connect your GitHub account and select this repository.

3. Choose **Docker** for the environment type (we included a `Dockerfile` at the repo root). Use the `main` branch (or your chosen branch). Render will run the Docker build using the provided `Dockerfile`.

4. IMPORTANT: set required environment variables in the Render service settings (Environment → Environment Variables / Secrets). At minimum set:

  - `DATABASE_URL` — connection string for PostgreSQL (you can create a managed DB in Render and copy the value)
  - `JWT_SECRET` — a long random secret for signing tokens
  - `ADMIN_USER` and `ADMIN_PASS` — admin console credentials
  - `EMAIL_USER` and `EMAIL_PASS` (and optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`) — if you want transactional email
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — optional; recommended if you want persistent uploads
  - `CLIENT_URL` — optional but useful for CORS

5. (Optional) Add a Managed PostgreSQL on Render: New + → PostgreSQL. After creation, copy the `DATABASE_URL` from the DB page and add it to your Web Service environment variables.

6. Deploy and monitor the build logs on Render. Once the build completes Render will run the container and expose your app on a public URL.

Notes and recommendations
- The `server/uploads` folder is inside the container and is ephemeral across deploys. For production, use Cloudinary (cloudinary env vars above) or another object storage provider. The app already supports Cloudinary when those env vars are present.
- If you prefer Render to manage the DB, use the Managed PostgreSQL service and paste its `DATABASE_URL` into your web service env vars.
- We added a `render.yaml` file that describes the web service (Docker). You can use this file when creating a service via Render's "Create from Render YAML" option.

If you'd like, I can:

- Create the GitHub repo and push the code for you (requires a GitHub token or local git credentials), or
- Walk you through the Render UI steps interactively while you're sharing the screen.
