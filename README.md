# Recruitment Demo Portal — Render + Django

A compact, fictional Indian-style bank recruitment demo. The only public workflow is: open the demo form → submit fictional details → see confirmation → download a PDF receipt. Submissions are stored in Django's database and can be reviewed in Django Admin.

## Safety and scope

- This is **not an official bank, government, or recruitment website**.
- The institution and vacancy are fictional.
- Use invented test details only. Do not collect Aadhaar, PAN, bank/card details, passwords, OTPs, payment or real identity documents.
- No application is sent to a real employer. The PDF has a visible DEMO watermark and disclaimer.
- The app intentionally has no payment, OTP, verification, selection, or real recruitment functionality.

## One-click Render deployment

1. Push this folder to a GitHub repository.
2. Open https://render.com/blueprints and choose **New Blueprint Instance**.
3. Connect the repository and select its `render.yaml`.
4. Render creates the Django web service and PostgreSQL database. Set the three `DJANGO_SUPERUSER_*` values when prompted / in the service environment:
   - `DJANGO_SUPERUSER_USERNAME`
   - `DJANGO_SUPERUSER_EMAIL`
   - `DJANGO_SUPERUSER_PASSWORD` (use a long unique password)
5. Deploy. The build script installs packages, collects static files, migrates the database and creates the optional admin account.
6. Open `https://YOUR-SERVICE.onrender.com/`. Admin: `/admin/`.

The `render.yaml` uses Render's **Free** web and PostgreSQL plans for a demo. Render Free web services sleep when idle. Important: Render Free Postgres expires after 30 days and has no backups. Do not use this free database for long-term applicant records. Upgrade to a paid database or configure another persistent PostgreSQL provider before relying on stored submissions.

## Local Windows setup (PowerShell)

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

Open `http://127.0.0.1:8000/`.

Create a local admin account:

```powershell
python manage.py createsuperuser
```

## Backend records

Django Admin at `/admin/` lists submissions. Applicant data is stored in the database, not in browser local storage. The receipt uses a random UUID reference. Duplicate clicks with the same form token resolve to the original receipt.

## Files

- `render.yaml` — Render Blueprint
- `build.sh` — reproducible deployment build
- `config/settings.py` — production-aware Django settings
- `portal/` — form, database model, PDF receipt and admin
- `templates/` and `static/` — responsive interface
