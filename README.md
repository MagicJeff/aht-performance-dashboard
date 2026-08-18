# AHT Performance Dashboard

A clean-room recreation of an operational dashboard originally built with AI coding tools to automate performance reporting and private feedback.

## What it demonstrates

- Automatic aggregation of synthetic daily AHT values into weekly workflow metrics
- Week-on-week AHT and IQR improvement
- Targets calculated as the previous week's Q3 reduced by 5%
- A shared management overview with no individual performance data
- Private, personalised DA report previews with quartile positioning

## Privacy and provenance

This repository contains no Amazon code, data, internal terminology, field names or design assets. All names, workflows and metrics are fictional. The interface is a from-scratch recreation informed by public AWS application-design conventions.

## Run locally

Open `index.html` in a modern browser, or serve the folder with any static file server.

## Publish with GitHub Pages

The project requires no build step. In the repository settings, configure GitHub Pages to publish from the `main` branch and repository root.

## Implementation

The dashboard is built with plain HTML, CSS and JavaScript. All calculations and chart rendering happen in the browser, with no backend, database or live AI call.
