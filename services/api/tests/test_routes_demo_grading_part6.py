from fastapi.testclient import TestClient
from fastapi import FastAPI
from app.routes_demo_grading import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_grade_part6_validation():
    # Sending empty audio file should return 400 or 500
    response = client.post(
        "/demo/grade/part6",
        files={"audio": ("empty.wav", b"", "audio/wav")}
    )
    assert response.status_code in [400, 500]
