"""Dump the app's OpenAPI schema as JSON (drives TypeScript type generation).

Run via ``python -m diffroom.openapi``; the ``just gen-types`` recipe pipes the
output to a throwaway ``frontend/openapi.json`` that ``openapi-typescript`` turns
into the committed ``frontend/src/lib/api-types.ts``.
"""

from __future__ import annotations

import json
from typing import Any

from .server import create_app


def openapi_schema() -> dict[str, Any]:
    """Return the FastAPI-generated OpenAPI schema for the DiffRoom app."""
    return create_app().openapi()


def main() -> None:
    print(json.dumps(openapi_schema(), indent=2))


if __name__ == "__main__":
    main()
