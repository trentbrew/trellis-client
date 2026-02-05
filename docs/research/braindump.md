# Paper

- Re-imagining Turtle in the image of Trellis.
- We should include a section about WinFS. Vista deserves its flowers.
- TQL (Turtle Query Language) was the original name, but I'm thinking `traversable query language` or `trellis query language` might be more appropriate.

# Codebase

- We need to rethink how we're handling markdown pasting & autoformatting
- The JSON-LD block editor from the Nuxt scaffold would be the perfect abstraction for handling rich text (notion-style). Lets explore that for Filegraph.
- When we leave the tab we're currently on we lose all of our changes without warning. That's a drag. Maybe it wouldn't hurt to auto-save everything.
- When files are saved, we lose cursor focus, and the document is scrolled back to the top immediately. This is disorienting. Lets investigate.
- Comments for `*.md` and \`\*.note\* files wouild be dope. Annotations especially. This would be really helpful for the writing process.
- We need mermaid diagram support for markdown & .note files.
- Let's double check the missing p-y for dividers in markdown + .note files.
- The vault architecture is a drag. It's fine for the file system to be the storage layer with the graph as the index, but the file explorer UI needs to pick a side. Currently the file explorer UI forces its scope to stay within the vault.
  - My instinct is to either make the file explorer itself a projection of a dedicated graph index for files instead of the literal files at their real locations... In order for us to pull that off we'll need to consider whether repos should be their own first-class type. They'd need symlinks and special metadata for git and code-hq.
    - But what about non-repo files?
      - Loose files will be indexed all the same. Maybe they are exclusively what we see in the file explorer projection.

    - What about media?
      - I'm considering a special projection for media files that separates everything by type: \[video, audio, images, 3d, etc\]
      - If the user is working with some 3rd party software like Adobe Suite or Davinci, we'll need to consider special projections for those projects as well–without re-inventing those programs. Adobe has web-based clones of their apps so maybe there's a way we can embed what we need? We can come back to this later.
