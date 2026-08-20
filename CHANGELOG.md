# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Fixed
- Restored tag creation functionality and payload formatting in `EditMetadataModal`.
- Fixed 422 Unprocessable Entity error when creating custom fields by mapping `type` to `field_type`.

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