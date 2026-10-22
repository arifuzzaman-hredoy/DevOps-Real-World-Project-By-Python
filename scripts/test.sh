#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"

echo "== CST Study Matrix: local automated tests =="

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "[1/4] Creating project virtual environment at $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

VENV_PY="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

if ! "$VENV_PY" -c 'import flask, flask_sqlalchemy, pytest, ruff' >/dev/null 2>&1; then
  echo "[2/4] Installing development dependencies"
  "$VENV_PIP" install -r requirements-dev.txt
else
  echo "[2/4] Required test dependencies already installed"
fi

echo "[3/4] Compiling Python source"
"$VENV_PY" -m compileall -q app tests

echo "[4/4] Running tests"
"$VENV_PY" -m pytest -v

if "$VENV_PY" -m ruff --version >/dev/null 2>&1; then
  echo "Running Ruff lint checks"
  "$VENV_PY" -m ruff check app tests
else
  echo "Ruff is not installed; pytest passed but lint was skipped."
fi

echo "PASS: local test script completed."
