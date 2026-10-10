# Deploying ResQTag to Netlify 🚀

ResQTag is fully configured and ready for 1-click deployment on Netlify.

---

### Method 1: Instant Drag & Drop (Fastest — 30 Seconds, No Git Needed)

1. Log in to your [Netlify Dashboard](https://app.netlify.com/).
2. Navigate to **Sites** -> **Add new site** -> **Deploy manually** (or visit [app.netlify.com/drop](https://app.netlify.com/drop)).
3. Drag and drop the **`e:\ResQTag`** folder directly into the upload area on Netlify.
4. Netlify will publish your site in seconds and assign you a live HTTPS domain (e.g. `https://resqtag-safety.netlify.app`).
5. **Done!** Whenever you generate a QR code on your live Netlify site, it will automatically encode your permanent Netlify URL.

---

### Method 2: Git / GitHub Repository Deployment

1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for ResQTag"
   ```
2. Push your repository to GitHub or GitLab.
3. In Netlify, click **Add new site** -> **Import an existing project** -> Select your GitHub repository.
4. Netlify will automatically detect:
   - **Base directory**: `.` (Root)
   - **Build command**: *(leave blank / empty)*
   - **Publish directory**: `.`
5. Click **Deploy Site**.

---

### Configuration Files Added for Netlify
- [netlify.toml](file:///e:/ResQTag/netlify.toml): Configures zero-build deployment, root redirect `/` -> `/frontend/index.html`, and device security/camera/geolocation headers.
- [_redirects](file:///e:/ResQTag/_redirects): Standard Netlify rewrite rules for direct routing and deep links.
- [_headers](file:///e:/ResQTag/_headers): Security policies and device permissions for Camera and GPS location sharing.
- [index.html](file:///e:/ResQTag/index.html): Root entry point redirecting any visitor or scanner straight to the single-tab app.
- [.gitignore](file:///e:/ResQTag/.gitignore): Excludes local executable binaries (`.tools/`) and environment files.
