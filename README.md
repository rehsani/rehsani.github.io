# rehsani.github.io

Source for my personal website and blog, hosted on GitHub Pages at
**https://rehsani.github.io**.

A static site (hand-written HTML + CSS, no build step) with a landing page and a
small technical blog on hydrometeorology, machine learning, and personal
finance.

## Structure

| File | Page |
|------|------|
| `index.html` | Landing page — bio, work, and contact |
| `blog.html` | Blog index |
| `blog-urmia.html` | *An Open-Source Tool for Watching Lakes from Space* (see [lake-area-gee](https://github.com/rehsani/lake-area-gee)) |
| `blog-alphacamels.html` | *An open dataset of dynamic AlphaEarth embeddings for 671 US basins* (see [alphacamels](https://github.com/rehsani/alphacamels)) |
| `blog-timing.html` | *Does Market Timing Matter?* |
| `blog-401k.html` | *What If You Had Maxed Your 401(k) Every Year?* |
| `css/style.css` | Site styles |
| `images/` | Figures and assets |

## Local preview

It's plain static HTML — open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

Pushing to `main` publishes automatically via GitHub Pages.
