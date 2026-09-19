# Calorie Tracker Backend

FastAPI backend for the Calorie Tracker app.

## Setup

From the repository root:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
python -m pip install -r requirements.txt
```

The backend reads configuration from `backend/.env`.

Important variables include:

- `DATABASE_URL`
- `AUTH_SECRET_KEY`
- `AI_API_KEY`
- `GEMINI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_REGION`

AI and image features require their related API keys and storage settings. Manual food entry works without them.

## Start

Recommended from the repository root:

```powershell
.\start-local.ps1
```

Or start the backend manually from this folder:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: <http://localhost:8001>

Swagger docs: <http://localhost:8001/docs>

## Tests

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

## Stop

From the repository root:

```powershell
.\stop-local.ps1
```

Or press `Ctrl+C` in the backend terminal.
