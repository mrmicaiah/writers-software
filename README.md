# Writer's Dashboard

A writing management system with GitHub backend and web dashboard interface.

## Folder Structure

```
├── book-writing/       # Your book projects
│   └── [book-name]/
│       ├── _metadata.json    # Title, summary, status
│       ├── characters/       # Character bibles
│       ├── chapters/         # Chapter drafts
│       ├── research/         # Book-specific research
│       └── notes/            # General notes
│
├── research/           # Standalone research projects
│   └── [project-name]/
│       ├── _metadata.json
│       └── [topic files]
│
└── brainstorming/      # Ideas in development
    └── [idea-name]/
        ├── _metadata.json
        └── [brainstorm files]
```

## Metadata Format

Each project folder contains a `_metadata.json` file:

```json
{
  "title": "Project Title",
  "summary": "100 character summary for dashboard display",
  "created": "2026-03-07",
  "status": "active"
}
```

## Status Values

- `active` - Currently being worked on
- `nurturing` - Developing the idea
- `drafting` - Writing in progress
- `editing` - Revisions underway
- `complete` - Finished project
