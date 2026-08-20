# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
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