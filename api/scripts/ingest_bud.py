"""
Run from api/ directory:
    python scripts/ingest_bud.py

Ingests all entries in data/bud_persona.json into the running API.
"""
import asyncio
import json
from pathlib import Path

import httpx

API_URL = "http://localhost:8000"
DATA_FILE = Path(__file__).parent.parent / "data" / "bud_persona.json"


async def main() -> None:
    entries = json.loads(DATA_FILE.read_text())
    print(f"Ingesting {len(entries)} entries…\n")

    async with httpx.AsyncClient(timeout=60.0) as client:
        total_chunks = 0
        for entry in entries:
            resp = await client.post(
                f"{API_URL}/ingest",
                json={
                    "text": entry["text"],
                    "source": entry["source"],
                    "category": entry["category"],
                },
            )
            if resp.status_code == 201:
                data = resp.json()
                total_chunks += data["chunks_created"]
                print(f"  ✓ [{entry['category']}] {entry['source']!r:12s} → {data['chunks_created']} chunk(s)")
            else:
                print(f"  ✗ [{entry['category']}] {entry['source']!r:12s} → {resp.status_code} {resp.text}")

        print(f"\nDone. Total chunks in Qdrant: ", end="")
        count_resp = await client.get(f"{API_URL}/ingest/count")
        print(count_resp.json())


if __name__ == "__main__":
    asyncio.run(main())
