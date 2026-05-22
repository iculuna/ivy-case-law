# First-Time Setup

These are the one-time steps to get IMELD running on GitHub Pages.

## 1. Create the GitHub repo

```bash
# From within /path/to/imeld-repo
git init -b main
git add .
git commit -m "Initial commit — IMELD with 145 entries"

# Then on github.com, create a new repo named "imeld" (public).
# Don't initialize it with anything — keep it empty.

# Then back in the terminal:
git remote add origin https://github.com/YOUR-USERNAME/imeld.git
git push -u origin main
```

## 2. Enable GitHub Pages

1. Go to repo Settings → Pages
2. Under "Build and deployment," set Source to "GitHub Actions"
3. Save

The first push to `main` will trigger the workflow. After it completes (1-2 minutes), both views are live:

```
HR view:         https://YOUR-USERNAME.github.io/imeld/
Compliance view: https://YOUR-USERNAME.github.io/imeld/compliance.html
```

## 3. Update the README

Edit `README.md` and replace `[YOUR-USERNAME]` with your actual GitHub username in the live URL section. Commit and push.

## 4. Share with the team

Most teammates only need the HR URL — bookmark `https://YOUR-USERNAME.github.io/imeld/`. Isaac and anyone working on compliance also bookmark the Compliance URL. The toggle link at the top of each view lets users switch.

## 5. Optional — restrict who can push to main

Settings → Branches → Branch protection rules → Add rule for `main`:
- Require pull request reviews before merging
- Restrict who can push to matching branches (add yourself)

This makes sure team members open PRs instead of pushing directly. Optional for now; useful later.

## Local testing before the first push

Verify the build works locally first:

```bash
python3 scripts/build.py
```

If anything fails, fix before pushing. The GitHub Action runs the same build, so failures here will fail the deploy too.

## Adding more entries later

Two approaches:

**Direct edit (small additions):**
1. Edit `data/entries.json`
2. Run `python3 scripts/build.py` locally to verify
3. Commit and push — GitHub Action rebuilds and deploys

**Skill-based (larger batches):**
1. Use the `imeld-add-entries` Claude Skill to draft new entries
2. Have Claude output the new entries as JSON
3. Merge into `data/entries.json`
4. Build and push

## Troubleshooting

**GitHub Pages 404:** GitHub Pages can take a few minutes after the workflow finishes. Wait 5 minutes, then check Settings → Pages for the URL.

**Workflow fails:** Check the Actions tab. Most common failure is invalid JSON in `data/entries.json`. Run `python3 scripts/validate.py data/entries.json` locally to find the problem.

**Build runs but page is blank:** Browser cache. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or open in private/incognito.

**Team member sees old entry count:** localStorage cached from a previous version. They should hard-refresh, OR open DevTools Console and run `localStorage.clear()` then refresh.
