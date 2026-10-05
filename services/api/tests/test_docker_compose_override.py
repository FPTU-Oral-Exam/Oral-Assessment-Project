"""Regression test for BUG-008.

BUG-008 root cause: docker-compose.override.yml set
    NEXT_PUBLIC_API_URL=http://api:8000
This value is inlined into the browser bundle at Next.js build time.
The hostname `api` only resolves inside Docker's internal network — NOT
from the user's browser. Result: every client-side fetch() call hangs on
DNS lookup, browser shows "Failed to fetch" after timeout.

Fix: remove NEXT_PUBLIC_API_URL from docker-compose.override.yml so the
source code fallback `http://localhost:8000` is used. Docker port
mapping `127.0.0.1:8000:8000` exposes FastAPI on the host's localhost,
which the browser CAN resolve.

This test is a simple invariant check. Run after every change to
docker-compose.override.yml to ensure no one re-introduces the bug.
"""
import re
import sys
from pathlib import Path

_parents = Path(__file__).resolve().parents
REPO_ROOT = _parents[3] if len(_parents) > 3 else _parents[-1]
OVERRIDE_FILE = REPO_ROOT / "docker-compose.override.yml"


def test_no_client_api_url_points_to_docker_internal_hostname():
    """NEXT_PUBLIC_API_URL must NOT use 'api' as hostname — that's an internal Docker DNS name, unreachable from the browser."""
    if not OVERRIDE_FILE.exists():
        # File is optional in some deploys
        return

    content = OVERRIDE_FILE.read_text(encoding="utf-8")

    # Look for env var assignments under the 'web' service
    # Pattern: NEXT_PUBLIC_API_URL=http(s)://api(:port)
    pattern = re.compile(
        r"NEXT_PUBLIC_API_URL\s*[:=]\s*[\"']?https?://api(?::\d+)?/?[\"']?",
        re.MULTILINE,
    )
    matches = pattern.findall(content)

    assert not matches, (
        f"BUG-008 regression: docker-compose.override.yml sets "
        f"NEXT_PUBLIC_API_URL to an internal Docker hostname ('api'). "
        f"This hostname is unreachable from the user's browser. "
        f"Found: {matches}. "
        f"Remove the NEXT_PUBLIC_API_URL line from the 'web' service so "
        f"the source-code fallback 'http://localhost:8000' is used instead."
    )


if __name__ == "__main__":
    try:
        test_no_client_api_url_points_to_docker_internal_hostname()
        print("PASS: docker-compose.override.yml does not bake Docker internal hostname into client bundle")
    except AssertionError as e:
        print(f"FAIL: {e}")
        sys.exit(1)