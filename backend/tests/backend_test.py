"""Backend tests for Meeting Management App - Portuguese ATA system."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ata-auto-gen.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"
TS = int(time.time())
EMAIL = f"qa+{TS}@test.com"
PASSWORD = "senha12345"

state = {}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# Auth
def test_register(s):
    r = s.post(f"{API}/auth/register", json={"name": "QA User", "email": EMAIL, "password": PASSWORD, "institution": "QA"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "token" in d and "user" in d
    assert d["user"]["email"] == EMAIL
    state["token"] = d["token"]
    state["user_id"] = d["user"]["id"]


def test_login(s):
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    assert "token" in r.json()


def test_login_invalid(s):
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_no_token(s):
    r = requests.get(f"{API}/auth/me")
    assert r.status_code in (401, 403)


def test_me_invalid_token(s):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert r.status_code == 401


def test_me_valid(s):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {state['token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == EMAIL


# Dashboard
def test_dashboard_stats():
    r = requests.get(f"{API}/dashboard/stats", headers={"Authorization": f"Bearer {state['token']}"})
    assert r.status_code == 200
    d = r.json()
    for k in ["total_meetings", "upcoming_meetings", "completed_meetings", "pending_deliberations"]:
        assert k in d


# Templates
def test_templates():
    r = requests.get(f"{API}/templates", headers={"Authorization": f"Bearer {state['token']}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 4


# Meetings CRUD
def test_create_meeting():
    h = {"Authorization": f"Bearer {state['token']}"}
    payload = {
        "title": "Reunião Teste QA",
        "meeting_type": "Reunião Administrativa",
        "date": "2026-02-15",
        "start_time": "14:00",
        "end_time": "16:00",
        "location": "Sala Virtual",
        "responsible": "QA",
        "secretary": "Sec",
        "president": "Pres",
        "participants": [{"name": "Alice", "present": True}, {"name": "Bob", "present": False}],
        "agenda": [{"title": "Aprovação orçamento", "order": 1}, {"title": "Planejamento 2026", "order": 2}],
    }
    r = requests.post(f"{API}/meetings", json=payload, headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["title"] == payload["title"]
    assert d["number"] >= 1
    assert d["status"] == "scheduled"
    assert len(d["agenda"]) == 2
    state["meeting_id"] = d["id"]
    state["topic_id"] = d["agenda"][0]["id"]
    state["meeting_number"] = d["number"]


def test_list_meetings():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/meetings", headers=h)
    assert r.status_code == 200
    assert any(m["id"] == state["meeting_id"] for m in r.json())


def test_list_meetings_search():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/meetings?search=QA", headers=h)
    assert r.status_code == 200
    assert any(m["id"] == state["meeting_id"] for m in r.json())


def test_get_meeting():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/meetings/{state['meeting_id']}", headers=h)
    assert r.status_code == 200
    assert r.json()["id"] == state["meeting_id"]


def test_get_meeting_other_user_404():
    # Create another user
    e2 = f"qa+other{TS}@test.com"
    r = requests.post(f"{API}/auth/register", json={"name": "Other", "email": e2, "password": PASSWORD})
    assert r.status_code == 200
    t2 = r.json()["token"]
    r = requests.get(f"{API}/meetings/{state['meeting_id']}", headers={"Authorization": f"Bearer {t2}"})
    assert r.status_code == 404


def test_patch_meeting():
    h = {"Authorization": f"Bearer {state['token']}"}
    new_agenda = [{"id": state["topic_id"], "title": "Aprovação orçamento atualizado", "order": 1}]
    r = requests.patch(f"{API}/meetings/{state['meeting_id']}", json={"location": "Auditório", "agenda": new_agenda}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["location"] == "Auditório"
    # verify persisted
    r2 = requests.get(f"{API}/meetings/{state['meeting_id']}", headers=h)
    assert r2.json()["location"] == "Auditório"


def test_start_meeting():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.post(f"{API}/meetings/{state['meeting_id']}/start", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


# AI - Finalize topic (uses GPT-5.2)
def test_finalize_topic_without_transcription():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.post(
        f"{API}/meetings/{state['meeting_id']}/topics/{state['topic_id']}/finalize",
        headers=h, timeout=90,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["discussao", "deliberacao", "encaminhamento", "responsavel", "prazo"]:
        assert k in d
    # verify persisted to topic
    r2 = requests.get(f"{API}/meetings/{state['meeting_id']}", headers=h)
    topic = next(t for t in r2.json()["agenda"] if t["id"] == state["topic_id"])
    assert topic["status"] == "completed"


def test_deliberations_listed():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/deliberations", headers=h)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    state["deliberations"] = r.json()


def test_patch_deliberation():
    if not state.get("deliberations"):
        pytest.skip("No deliberations created")
    h = {"Authorization": f"Bearer {state['token']}"}
    d_id = state["deliberations"][0]["id"]
    r = requests.patch(f"{API}/deliberations/{d_id}", json={"status": "em_andamento"}, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "em_andamento"


# Generate ATA (WOW feature)
def test_generate_ata():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.post(f"{API}/meetings/{state['meeting_id']}/generate-ata", headers=h, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "ata_completa" in d and len(d["ata_completa"]) > 50
    assert "resumo_executivo" in d
    # verify meeting status=completed
    r2 = requests.get(f"{API}/meetings/{state['meeting_id']}", headers=h)
    assert r2.json()["status"] == "completed"


# Exports
def test_export_pdf():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/meetings/{state['meeting_id']}/export/pdf", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert r.content[:4] == b"%PDF"


def test_export_docx():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.get(f"{API}/meetings/{state['meeting_id']}/export/docx", headers=h)
    assert r.status_code == 200
    assert "wordprocessingml" in r.headers["content-type"]


# Cleanup - delete meeting also deletes deliberations
def test_delete_meeting():
    h = {"Authorization": f"Bearer {state['token']}"}
    r = requests.delete(f"{API}/meetings/{state['meeting_id']}", headers=h)
    assert r.status_code == 200
    r2 = requests.get(f"{API}/meetings/{state['meeting_id']}", headers=h)
    assert r2.status_code == 404
    # deliberations cleaned
    r3 = requests.get(f"{API}/deliberations", headers=h)
    assert all(d["meeting_id"] != state["meeting_id"] for d in r3.json())
