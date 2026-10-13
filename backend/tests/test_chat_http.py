"""Проверка полного HTTP-обмена с API копилота без подмены транспорта."""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from fastapi.testclient import TestClient

from app.main import create_app
from tests.test_catalog import MutableSource, deployment
from tests.test_chat import completion


def test_real_http_round_trip_preserves_long_reply_in_follow_up() -> None:
    received: list[tuple[str, object]] = []
    answer = ("Ответ " * 1000).rstrip()

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            raw: object = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            received.append((self.path, raw))
            body = json.dumps(completion(answer)).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    source = MutableSource(
        [{**deployment(), "base_url": f"http://127.0.0.1:{server.server_port}/dev/test"}]
    )
    messages = [{"role": "user", "content": "Вопрос"}]
    try:
        with TestClient(create_app(source=source)) as client:
            response = client.post("/api/copilots/test/chat", json={"messages": messages})
            assert response.status_code == 200
            assert response.json() == {"reply": answer}
            messages.extend(
                [{"role": "assistant", "content": answer}, {"role": "user", "content": "Ещё"}]
            )
            response = client.post("/api/copilots/test/chat", json={"messages": messages})
            assert response.status_code == 200
            assert response.json() == {"reply": answer}
        assert len(received) == 2
        assert received[-1] == (
            "/dev/test/api/v1/chat/completions",
            {"model": "test", "messages": messages, "stream": False},
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
