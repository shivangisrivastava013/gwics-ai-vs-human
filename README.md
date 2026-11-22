# GWiCS: AI vs Human Showdown Website

Official event website for the **AI vs. Human: The Ultimate Showdown** flagship collegiate event hosted by **Graduate Women in Computing Sciences (GWiCS)** at the New Jersey Institute of Technology (NJIT).

---

## 🚀 Free Hosting Guide (100% Free Forever)

This website is a modern, pure client-side static web application (HTML5, CSS3, vanilla JavaScript, audio, and media). It requires **no paid servers, no monthly subscriptions, and no database management**.

Here are the top free ways to host it:

### Option 1: GitHub Pages (Recommended for Student Clubs & GWiCS)
* **Cost:** 100% Free forever
* **Features:** Free SSL (HTTPS), custom domain support (`gwics.njit.edu` or `username.github.io/ai-vs-human`), automatic updates on `git push`.
* **Steps:**
  1. Create a new repository on [GitHub](https://github.com/new) (e.g. `gwics-ai-vs-human`).
  2. Push this folder to GitHub:
     ```bash
     git init
     git add .
     git commit -m "Initial commit for GWiCS AI vs Human Showdown"
     git branch -M main
     git remote add origin https://github.com/<YOUR-USERNAME>/gwics-ai-vs-human.git
     git push -u origin main
     ```
  3. Go to **Repository Settings** > **Pages**.
  4. Under **Branch**, select `main` and `/ (root)` and click **Save**.
  5. Your site will be live within 60 seconds at `https://<YOUR-USERNAME>.github.io/gwics-ai-vs-human/`!

---

### Option 2: Netlify (Fastest 10-Second Drag & Drop, No Code Needed)
* **Cost:** 100% Free forever
* **Steps:**
  1. Open [app.netlify.com/drop](https://app.netlify.com/drop) in your browser.
  2. Drag and drop this whole `gwics-ai-vs-human-website` folder directly into the upload circle on the webpage.
  3. Netlify will instantly deploy it and give you a live HTTPS link (e.g. `https://gwics-ai-vs-human.netlify.app`).

---

### Option 3: Vercel
* **Cost:** 100% Free on the Hobby tier
* **Steps:**
  1. Go to [vercel.com](https://vercel.com) and log in.
  2. Click **Add New** > **Project** and import your GitHub repository (or use the Vercel CLI).
  3. Click **Deploy**; it goes live on global edge CDN with a `.vercel.app` URL.

---

### Option 4: Cloudflare Pages
* **Cost:** 100% Free with unlimited bandwidth
* **Steps:**
  1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages**.
  2. Select **Create Application** > **Pages** > **Direct Upload**.
  3. Upload the project folder and click **Deploy**.

---

## 🛠️ Local Testing
To test the website locally on your computer:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.
