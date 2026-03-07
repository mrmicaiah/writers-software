# Writer's Dashboard - Setup Guide

## What This Is

A beautiful writing management dashboard with:
- **Antique library UI** - Books displayed on elegant shelves
- **GitHub backend** - Your writing stored as markdown files
- **Claude assistant** - On-page AI help for writing, editing, brainstorming
- **Export options** - ZIP download and 6×9 PDF (coming soon)

## Quick Setup

### 1. Cloudflare Account

If you don't have one: https://dash.cloudflare.com/sign-up

### 2. Deploy with Wrangler

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login
wrangler login

# Set secrets
wrangler secret put GITHUB_TOKEN
# Enter a GitHub PAT with 'repo' scope

wrangler secret put ANTHROPIC_API_KEY
# Enter your Anthropic API key

# Deploy
wrangler deploy
```

### 3. Or Use Cloudflare Pages (Auto-deploy)

1. Go to Cloudflare Dashboard → Pages
2. Create project → Connect to Git
3. Select `writers-software` repo
4. Build settings:
   - Build command: (leave empty)
   - Output directory: `frontend`
5. Add environment variables:
   - `GITHUB_TOKEN` = your GitHub PAT
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `GITHUB_REPO` = `mrmicaiah/writers-software`

## Folder Structure

```
book-writing/
  └── [book-name]/
      ├── _metadata.json    ← Title, summary, status
      ├── characters/
      ├── chapters/
      ├── research/
      └── notes/

research/
  └── [project]/
      ├── _metadata.json
      └── [files]

brainstorming/
  └── [idea]/
      ├── _metadata.json
      └── [files]
```

## Metadata Format

```json
{
  "title": "The Four Horsemen",
  "summary": "Working on this apocalyptic tale—details still developing.",
  "status": "nurturing"
}
```

**Status options:** `nurturing`, `active`, `drafting`, `editing`, `complete`

## Using the Writing Assistant

The sidebar assistant can:
- Brainstorm plot ideas
- Develop characters
- Research topics
- Edit and improve passages
- Help with dialogue
- Suggest structural changes

Just type your request and it'll help based on the current file context.

## MCP Integration (Coming Soon)

For Claude.ai users: An MCP connector will let Claude directly create projects, save files, and manage your library from within conversations.

## Exports

- **ZIP** - Downloads all project files as markdown
- **6×9 PDF** - KDP-ready format (coming soon)