def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json["status"] == "ok"

def test_ready(client):
    response = client.get("/api/ready")
    assert response.status_code == 200

def test_create_and_list_task(client):
    created = client.post("/api/tasks", json={
        "title": "Learn Docker",
        "description": "Build an image"
    })
    assert created.status_code == 201
    task_id = created.json["id"]
    assert created.json["status"] == "todo"

    listed = client.get("/api/tasks")
    assert listed.status_code == 200
    assert any(task["id"] == task_id for task in listed.json)

def test_create_task_requires_title(client):
    response = client.post("/api/tasks", json={"description": "missing title"})
    assert response.status_code == 400

def test_update_task(client):
    created = client.post("/api/tasks", json={"title": "Old title"})
    task_id = created.json["id"]
    response = client.patch(f"/api/tasks/{task_id}", json={"status": "done", "title": "New title"})
    assert response.status_code == 200
    assert response.json["title"] == "New title"
    assert response.json["status"] == "done"

def test_invalid_status_rejected(client):
    created = client.post("/api/tasks", json={"title": "Test"})
    response = client.patch(f"/api/tasks/{created.json['id']}", json={"status": "finished"})
    assert response.status_code == 400

def test_delete_task(client):
    created = client.post("/api/tasks", json={"title": "Delete me"})
    task_id = created.json["id"]
    response = client.delete(f"/api/tasks/{task_id}")
    assert response.status_code == 204
    assert client.get(f"/api/tasks/{task_id}").status_code == 404


def test_homepage_serves_study_matrix(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b"CST Semester Study Matrix" in response.data


def test_study_login_and_logout(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    response = client.post("/api/auth/login", json={"password": "test-study-password"})
    assert response.status_code == 200
    assert client.get("/api/auth/me").json["authenticated"] is True
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
