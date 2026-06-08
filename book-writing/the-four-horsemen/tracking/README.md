# Writing Session Tracking

This folder tracks the current state of the draft so any Claude session can pick up where you left off.

---

## How to Use

**When starting a writing session:**

1. Pull `current-status.md` to see what's drafted and what's next
2. Pull `scene-queue.md` for the full breakdown of scenes by chapter
3. Ask the user what they want to write, or offer choices from what's next

**When ending a writing session:**

1. Save the new material to the appropriate chapter file in `/chapters/`
2. Update `current-status.md` with what was completed
3. Update `scene-queue.md` — check off completed scenes
4. Log progress to the board if available

---

## Files in This Folder

- `current-status.md` — Quick snapshot: what's done, what's next, where we are
- `scene-queue.md` — Full scene-by-scene breakdown with checkboxes

---

## Workflow

1. User says "what's next" or "give me choices" or "I want to write X"
2. Claude checks `current-status.md` and `scene-queue.md`
3. User writes — dictates or types
4. Claude compiles into the chapter draft
5. Review together — user adjusts if needed
6. Claude saves to `/chapters/`, updates tracking files

---

## Goal

Get all scenes drafted. First pass. Depth over polish. We're building a complete draft of the book.
