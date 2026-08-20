# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Fixed
- Restored tag creation functionality and payload formatting in `EditMetadataModal`.
- Fixed 422 Unprocessable Entity error when creating custom fields by mapping `type` to `field_type`.
- Resolved layout overlap between the version footer and the scrollable content list by transitioning to a flexible structural layout.
- Fixed backend document filtering endpoint ignoring `sort_by` and `order` parameters, restoring proper list sorting.
- Restored efficient PDF streaming for large documents by transitioning from full blob downloads to authenticated range requests

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