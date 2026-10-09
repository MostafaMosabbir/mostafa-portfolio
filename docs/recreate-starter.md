# Recreate this starter yourself

## 1. Open or clone the repository

Open https://github.com/MostafaMosabbir/mostafa-portfolio.

For local editing:

```bash
git clone https://github.com/MostafaMosabbir/mostafa-portfolio.git
cd mostafa-portfolio
```

Cloning gives you a local copy connected to GitHub. If recreating in a new empty repository, use that repository's clone URL instead.

## 2. Create the root README

Create README.md and include the purpose, current status, folder tree, project categories, contact link, and next steps. Keep claims accurate and mark unfinished work clearly.

On GitHub, use the repository's Add file > Create new file control; an empty repository may offer a creating a new file link. Enter README.md, paste the content, and commit the change.

## 3. Add folders by adding files

Git tracks files, so create these paths with their README content:
- projects/README.md
- cybersecurity/README.md
- assets/README.md

In GitHub's new-file form, typing a path such as projects/README.md creates the folder as part of the file path. Locally, create the folders in your editor or file manager.

These folders separate general project summaries, security work, and public media.

## 4. Add planning documents

Create docs/ and add:
- homepage-plan.md: sections, content, visual direction, and publishing criteria.
- project-template.md: a repeatable case study outline.
- scope-and-separation.md: rules that keep the capstone outside the portfolio.
- roadmap.md: October–December delivery milestones.
- recreate-starter.md: these instructions.

## 5. Add .gitignore

Add the starter .gitignore at the root. It excludes common local configuration, generated files, and private drafts from new Git additions. Always inspect the files you are about to publish.

## 6. Add actual projects

For each real general project, create projects/project-slug/README.md using the case study template. Keep substantial implementation code in its own repository and link to it.

For a security lab, create cybersecurity/lab-slug/README.md and include authorization scope, reproduction steps, and sanitized evidence.

Keep the Rowan fishing capstone in a separate repository or workspace. Do not copy it into either category.

## 7. Save local changes to GitHub

If you edited locally:

```bash
git status
git add README.md .gitignore docs projects cybersecurity assets
git diff --cached
git commit -m "Add personal portfolio starter structure"
git push origin main
```

git status shows changes; git add selects the starter files; git diff --cached lets you inspect the selected content; git commit records it; git push uploads the commit. Run these commands only after you have created or edited files. A freshly cloned copy of this completed starter will have nothing new to commit.

## 8. Build the homepage next

Follow homepage-plan.md to add index.html and styles/main.css. Preview locally, add only real project content, and complete the publishing checklist before choosing and configuring hosting.

The documentation starter itself is not a deployed website.
