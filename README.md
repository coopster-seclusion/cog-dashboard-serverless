# NZ Electricity Market Dashboard

FastAPI + React dashboard for live New Zealand electricity market data via the WITS API
(electricityinfo.co.nz). The FastAPI backend handles OAuth2 authentication and all WITS API
calls; the React frontend consumes clean JSON from FastAPI and never contacts WITS directly.
Credentials stay server-side, token refresh is invisible to the UI, and React can poll on a
timer without re-authenticating.

## Startup

**Terminal 1 — Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
copy .env.example .env         # then fill in WITS_CLIENT_ID + WITS_CLIENT_SECRET
# uvicorn main:app --reload
uvicorn main:app --port 8001
FastAPI: `http://localhost:8001` · Interactive docs: `http://localhost:8001/docs`
```
API: `http://localhost:8000` · Interactive docs: `http://localhost:8000/docs`

**Terminal 2 — Frontend** *(after Step 4 scaffold)*
```bash
cd frontend
npm install
npm run dev
```
React: `http://localhost:5173`
