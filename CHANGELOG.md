# Changelog

All notable changes to this project will be documented in this file.

## [1.2.8] - 2026-08-27
### Added
- **Collection Metadata Batch (`ai_batch.py`):** Added a cancellation endpoint and background process handling to safely abort ongoing batch metadata extraction across parent collections and subcollections.
- **Frontend UI (`CollectionTreeItem`):** Added a cancel action button next to the active AI progress bar, allowing users to halt running batch processes, stop polling loops, and reset UI states cleanly.

## [1.2.7] - 2026-08-25
### Fixes
- **Collections API (`batch-status`):** Updated recursive query logic to aggregate total document counts, ready states, and errors across parent collections and subcollections.
- **Frontend UI (`CollectionTreeItem`):** Adjusted the real-time AI progress bar calculation to leverage the global recursive tree total instead of relying only on direct collection nodes.
- **Batch Completion Control:** Implemented a single-execution guard (`useRef`) on batch finish handlers to prevent duplicate update triggers and eliminate interface jitter.

## [1.2.6] - 2026-08-25
### Bug Fixes & Improvements
- **Documents API (`/filter`):** Enhanced faceted search architecture to fully support **multi-selection** for composers, tags, and custom fields without hiding unselected options.
- **JSONB Metadata Filtering:** Corrected tag lookups and custom metadata comparisons to query document JSONB structures accurately (`.astext` and array element extraction).
- **Independent Facet Counting:** Refactored facet computation to rely on the base collection and global search scope, ensuring stable and reliable multi-select filters.

## [1.2.5] - 2026-08-24
### Fixed
- **Container:** Renamed `Dockerfile` files to `Containerfile` to ensure full compatibility with `containerd`.

## [1.2.4] - 2026-08-24
### Fixed
- **DocumentCard:** Solucionado el problema de desbordamiento y corte de botones de acción en pantallas estrechas mediante la implementación de un flujo flexible (`flex-wrap`).
- **Faceted Filters:** Mejorada la adaptabilidad en pantallas reducidas convirtiendo el panel de filtros en un componente desplegable/overlay, evitando que interfiera con el layout principal del grid de documentos.

## [1.2.3] - 2026-08-23
### Fixed
- **AI Progress Bar Layout:** Fixed an overflow issue in the batch AI progress component that caused an unwanted horizontal scroll and a slight cutoff on the right side, ensuring clean and proper rendering.
- **Responsive Design & Laptop Optimization:** Improved overall layout responsiveness on standard laptop screens, introducing adaptive wrapping (`flex-wrap`) for document action buttons to prevent crowding and text overflow.
- **Batch AI Faceted Filters Synchronization:** Fixed an issue where faceted filter options did not update automatically after completing a *batch* AI metadata generation process for a collection. Filters now refresh in real-time alongside document lists and collection trees upon batch completion.

### Added
- **Page Size Selector:** Added a configurable items-per-page selector in the paginator (`10`, `25`, `50`, `100`), allowing users to easily customize how many documents are displayed at once.

## [1.2.2] - 2026-08-23
### Fixed
- Fixed faceted filters state synchronization: options now automatically refresh and update in real-time after generating metadata via AI, eliminating the need to manually reload the page.

### Added
- **Collection Renaming:** Added the ability to rename collections directly from the sidebar. Changes are now synchronized both in the database and physically on the file system for directory-backed collections.
- **Improved UI Experience:** Implemented seamless inline editing for collections and subcollections with real-time state updates, eliminating the need for full-page reloads.
- **Drag-and-Drop Organization**: Users can now drag document cards and drop them directly onto any root collection or nested subcollection in the sidebar to quickly reassign them.
- **Batch AI Metadata Generation:** Introduced asynchronous batch AI processing for collections, allowing users to trigger metadata extraction for entire batches with seamless background execution.
- **Real-Time Progress Tracking:** Implemented a dynamic progress bar and modal sequence that accurately tracks actual AI-processed documents based on generated metadata (`metadata_suggested`) rather than initial states, ensuring reliable progress feedback and preventing polling loops.
- **Automatic UI Synchronization:** Document lists and collection trees now automatically refresh upon batch completion, instantly rendering newly extracted metadata without requiring manual page reloads.

## [1.2.1] - 2026-08-20
### Fixed
- Resolved a critical OCR extraction crash (`FileNotFoundError`) inside the backend Docker container by making Poppler and Tesseract paths dynamic (environment-aware).
- Added `t

## [1.2.0] - 2026-08-20
### Added
- Support for Gemini AI integration, including environment variable configurations for the model and API key.
- Optimized the manual PDF normalization process: improved text sharpness by switching to 150 DPI and 85% JPEG quality, while enabling internal image compression (`deflate_images=True`).

### Fixed
- Restored tag creation functionality and payload formatting in `EditMetadataModal`.
- Fixed 422 Unprocessable Entity error when creating custom fields by mapping `type` to `field_type`.
- Resolved layout overlap between the version footer and the scrollable content list by transitioning to a flexible structural layout.
- Fixed backend document filtering endpoint ignoring `sort_by` and `order` parameters, restoring proper list sorting.
- Restored efficient PDF streaming for large documents by transitioning from full blob downloads to authenticated range requests
- Resolved a critical OCR extraction error ("Unable to get page count") by adding `poppler-utils` as a system dependency in the backend container.
- Resolved a browser caching issue that prevented newly normalized documents from displaying immediately by appending a timestamp query parameter to PDF view requests.
- **UI/Sidebar**: Fixed the synchronization of the "All documents" counter. The total file count now updates in real-time when uploading, importing, or deleting documents, eliminating the need to manually refresh the page.

### Changed
- Refactored Docker setup: both frontend and backend services now build locally using their respective Dockerfiles to ensure full control over system dependencies.

## [1.1.0] - 2026-08-19
### Added
- Manual PDF repair endpoint and custom success modal.
- Document list sorting (sort_by, order) with UI dropdown.
- Autocomplete search input in collection assignment dropdown.

### Changed
- Integrated search bar and sorting dropdown into a single horizontal layout.
- Enhanced document title visual hierarchy.
- Centralized UI text constants in `constants/texts.ts`.

### Fixed
- Resolved TypeScript argument count mismatch errors in filter logic.

## [1.0.1] - 2026-08-16
### Fixed
- Corrected requirement ID references (REQ-026).
- Fixed version string display issue (duplicate "v" prefix).