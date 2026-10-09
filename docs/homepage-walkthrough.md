# Build and understand your homepage

This first version was scaffolded with AI assistance. Your next step is to read, modify, and explain it in your own words. Keep an accurate account of what you implement yourself as the project grows.

## 1. Get the files in VS Code and open the page

On GitHub, select **Code → Download ZIP**, extract the ZIP, and open `index.html` in your browser. Alternatively, clone the repository with Git. If you already cloned it and have no local edits, run `git pull --ff-only` to get this version. If you have local changes, review and commit them first.

Since you already have Git available in VS Code, you can use this workflow:

1. Open VS Code and choose **Terminal → New Terminal**.
2. In the terminal, move to the parent folder where you keep your projects.
3. If you do not already have a local copy, run:

   ```bash
   git clone https://github.com/MostafaMosabbir/mostafa-portfolio.git
   ```

4. Choose **File → Open Folder** and select the newly cloned `mostafa-portfolio` folder. If you already have a clone, open that folder instead of cloning again.
5. Open `index.html` and `styles/main.css` from the Explorer panel. Open `index.html` in your web browser to see the page; save edits in VS Code and refresh the browser to see updates.

The page needs no package installation, extension, or build command: its stylesheet is loaded from `styles/main.css`.

## 2. Read the HTML comments

HTML comments look like `<!-- explanation -->`. They are visible in source code, but not rendered as page text. They remain public, so never place secrets in comments.

Follow `index.html` from top to bottom:

1. `head` contains the browser title, page description, and stylesheet link.
2. The skip link helps keyboard users reach the content quickly.
3. `header` and `nav` contain the site identity and section links.
4. `main` contains the introduction, About, Projects, Cybersecurity, and Contact sections.
5. `article` groups the portfolio website's project card.
6. `footer` provides a closing identity and a link back to the top.

The `href="#projects"` link works because a section has `id="projects"`. If you rename an ID, update links pointing to it. Classes such as `project-card` connect HTML elements to CSS rules. IDs must be unique; classes can be reused.

## 3. Read the CSS comments

CSS comments look like `/* explanation */`. The stylesheet has ten numbered groups explaining the design tokens, base rules, layout, accessibility, header, introduction, projects, remaining sections, mobile layout, and reduced motion support.

Read a rule as **selector → property → value**. For example, `.button { padding: 13px 20px; }` gives elements with class `button` vertical and horizontal internal spacing. A margin creates space outside an element; padding creates space inside it.

The `:root` variables store reusable colors. Grid creates columns, Flexbox arranges smaller groups, and media queries change the layout when the viewport becomes narrow. No JavaScript is necessary for these links or layouts.

## 4. Your first hands-on edits

Complete these one at a time, saving and refreshing after each:

- [ ] Rewrite the introduction in your own voice using only accurate details.
- [ ] Adjust the About text to explain what interests you about software and cybersecurity.
- [ ] Change `--accent` in the stylesheet, then compare readability before and after.
- [ ] Change the main button label while keeping its destination working.
- [ ] Resize the browser and explain which rule stacks the project card.
- [ ] Press Tab through the links and check that focus is always visible.

Add a comment above a change when it explains a decision, for example:

```html
<!-- I link to the source because the project is still in progress. -->
```

```css
/* I stack these columns on narrow screens so the text stays readable. */
```

Comments should explain purpose and reasoning. Keep them accurate when code changes. You do not need to narrate every closing tag or repeat what a simple property already says.

## 5. Keep a learning log

Use `docs/learning-log.md` after each session. Record what you changed, why, what you checked, and anything you still cannot explain. This gives you concrete material for interviews and helps distinguish guided work from independent work.

## 6. Add a real project later

Write its case study in `projects/<project-name>/README.md` using the existing project template. Then copy the existing project `article`, change the title and description, and add real repository or demo links. Use a distinct case study for each project. Cybersecurity labs belong in their separate section and folder. Keep the Rowan fishing capstone outside this portfolio.

## 7. Review and commit your changes

In VS Code, open **Source Control** to see changed files. Select a file to review its changes, stage the intended files with the **+** control, enter a descriptive commit message, and commit. Then push to GitHub. You can also use the built-in terminal with the commands below. Either approach records the same Git history.

```bash
git status
git diff
git add index.html styles/main.css docs/learning-log.md
git diff --cached
git commit -m "Personalize introduction and document learning"
git push origin main
```

`git diff` shows your edits; `git add` selects them; `git diff --cached` lets you inspect the selected changes; `git commit` records a named checkpoint; `git push` sends it to GitHub. Use a message describing what you actually changed. Only commit files you intended to edit.

## 8. Check before publishing

- Open the page at desktop and phone widths and look for sideways scrolling.
- Follow each navigation and GitHub link.
- Navigate with Tab and Shift+Tab; press Enter to activate links.
- Check text at 200% zoom.
- Verify project descriptions and personal information.
- Make sure source comments still match the code.

The first homepage exists as source files. Public hosting is a separate next step; uploading HTML to GitHub alone does not enable a website.
