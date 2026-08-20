# AHT Performance Dashboard

A clean-room recreation of an operational dashboard originally built with AI coding tools to automate performance reporting and private feedback.

**[View the live dashboard](https://magicjeff.github.io/aht-performance-dashboard/)**

## What it demonstrates

- Automatic download and parsing of a synthetic Excel source workbook
- Aggregation of daily AHT values into weekly workflow metrics
- Week-on-week AHT and IQR improvement
- Targets calculated as the previous week's Q3 reduced by 5%
- A shared management overview with no individual performance data
- Private, personalised DA report previews with quartile positioning

## Privacy and provenance

This repository contains no Amazon code, data, internal terminology, field names or design assets. All names, workflows and metrics are fictional. The interface is a from-scratch recreation informed by public AWS application-design conventions.

In the original process, individual performance never appeared on the shared management dashboard. The system generated a separate HTML attachment for each DA and emailed it privately. This public recreation uses a synthetic DA selector solely to demonstrate that personalised output.

## Data flow

The [synthetic Excel source workbook](outputs/aht-performance-dashboard/synthetic-aht-source.xlsx) contains one row per synthetic DA per working day, with workflows in columns and blank cells where a DA did not work that workflow. When the dashboard opens, it automatically downloads that workbook over HTTPS, parses the `Daily AHT` worksheet, excludes blanks, and performs the weekly calculations in the browser.

In production, ingestion runs as a scheduled server-side job that authenticates to the private workbook's storage API and retrieves the latest file automatically. This public demo does not reproduce that authenticated connection; it loads a public synthetic workbook directly when the page opens.

## Publish with GitHub Pages

The project requires no build step. In the repository settings, configure GitHub Pages to publish from the `main` branch and repository root.

## Implementation

The dashboard is built with plain HTML, CSS and JavaScript. It uses the official SheetJS browser library to read the `.xlsx` file. All calculations and chart rendering happen in the browser, with no backend, database, credentials or live AI call.
