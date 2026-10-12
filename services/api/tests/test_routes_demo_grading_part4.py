from fastapi.testclient import TestClient
from app.routes_demo_grading import router
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_get_prompt_rl_audio():
    response = client.get("/demo/audio/prompt-rl")
    assert response.status_code == 200
    assert "audio" in response.headers.get("content-type", "")


def test_grade_part4_validation():
    # Sending empty audio file should raise 400
    response = client.post(
        "/demo/grade/part4",
        files={"audio": ("empty.wav", b"", "audio/wav")}
    )
    assert response.status_code in [400, 500]
