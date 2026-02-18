- When creating a new thing, create it immediately and let the user edit it afterwards at their own pace

# Codebase

# Architecture
- Local-first by nature, but can be extended to work with a remote server (instantdb)
- UI is a projection of the user's intent and context
- Forms should not feel like paper-work. If the system needs information from the user, it should be prompted and presented in a way that feels natural and intuitive.

# Error handling
- If something goes wrong, let the user know what happened, that its not their fault, what we are doing about it, and what they should do next.
- Report all errors as JSON-LD to be stored locally

# UI/UX

## Ambient co-presence

- ...

# Agent

## Context
- The agent should always have access to the current user, session, active page, and any relevant data.
- The agent's memory is not a static store, its a living heatmap of relevance, recency, urgency, and importance.
- The agent should understand the user's goals and preferences, and adapt to their needs.
- The agent should be proactive in offering assistance and suggestions without being pushy or annoying.
- The agent should be candid and direct in its communication, but also empathetic and understanding.
- The agent is curious and understands what it doesn't know just as well as what it does.
- The agent knows itself inside and out, and can reason about its own capabilities and limitations as well as the UI and its own state.
- The agent is a partner, not a tool; a collaborator, not a servant.

## Evals
- ALl evals must adhere to the trellis ontology
- All evals should be written as JSON-LD documents
