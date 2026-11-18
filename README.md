# Recruitment Demo Portal

A responsive, browser-based reproduction of the supplied Django recruitment demo, built with TanStack Start, React, TypeScript, and Lovable Cloud.

## Included screens

- Fictional recruitment homepage and featured sample vacancy
- Searchable vacancy list with institution filters
- Five-step application form with optional private photo/PDF uploads
- Demo-only receipt and downloadable PDF
- Restricted manager area for fictional institutions, vacancies, and demo submissions

## Important safety note

This project is a software demonstration, not an official bank or recruitment website. Use invented details only. Never enter government IDs, payment or bank details, passwords, or one-time codes. Submissions are not sent to real employers.

## Run locally

Use Node.js and Bun, install dependencies, then start the development server:

```sh
bun install
bun run dev
```

Lovable Cloud must be connected for vacancy data, submissions, sign-in, and private uploads. The approved manager email is `chaudharystar051@gmail.com`. To activate the manager account, open **More → Users → Add user** and create the account for that email. Once its email is confirmed, the app automatically grants the separate manager permission; sign in at **Manager** with that account. Do not share passwords in chat or commit `.env` or credentials.