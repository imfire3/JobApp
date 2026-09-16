# Mes offres importées (Recherche IA)

## Goal

Add a research source card that searches the user’s entire imported jobs board, regardless of platform.

## Decision

- Virtual slug: `my-imported` (not a `job_sources` catalog row).
- When present in `source_slugs`, imported search skips platform source filtering.
- Live API slugs still run independently when selected and configured.
- UI: card first in Sources grid — title « Mes offres importées », badge Bibliothèque.

## Out of scope

- Table column resize / score column reorder (separate request).
- Bootstrapping `my-imported` into Supabase `job_sources`.
