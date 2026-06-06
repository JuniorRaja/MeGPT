"""
Run from api/ directory:
    python scripts/ingest_bud.py                        # ingests bud_persona.json
    python scripts/ingest_bud.py persona_template.json  # ingests persona_template.json
    python scripts/ingest_bud.py all                    # ingests both files
"""
import asyncio
import json
import sys
from pathlib import Path

import httpx

API_URL = "http://localhost:8000"
DATA_DIR = Path(__file__).parent.parent / "data"


async def ingest_file(client: httpx.AsyncClient, path: Path) -> int:
    entries = json.loads(path.read_text(encoding="utf-8"))
    print(f"\n→ {path.name} ({len(entries)} entries)")
    total = 0
    for entry in entries:
        if entry.get("text", "").startswith("TODO:"):
            print(f"  ⚠ skipped TODO entry: [{entry['category']}] {entry['source']!r}")
            continue
        resp = await client.post(
            f"{API_URL}/ingest",
            json={"text": entry["text"], "source": entry["source"], "category": entry["category"]},
        )
        if resp.status_code == 201:
            data = resp.json()
            total += data["chunks_created"]
            print(f"  ✓ [{entry['category']}] {entry['source']!r:25s} → {data['chunks_created']} chunk(s)")
        else:
            print(f"  ✗ [{entry['category']}] {entry['source']!r:25s} → {resp.status_code} {resp.text}")
    return total


async def main() -> None:
    arg = sys.argv[1] if len(sys.argv) > 1 else "bud_persona.json"

    if arg == "all":
        files = [DATA_DIR / "bud_persona.json", DATA_DIR / "persona_template.json"]
    else:
        files = [DATA_DIR / arg]

    async with httpx.AsyncClient(timeout=60.0) as client:
        total_chunks = 0
        for f in files:
            if not f.exists():
                print(f"✗ File not found: {f}")
                continue
            total_chunks += await ingest_file(client, f)

        print(f"\nDone. Total new chunks: {total_chunks}")
        count_resp = await client.get(f"{API_URL}/ingest/count")
        print(f"Qdrant total: {count_resp.json()}")


if __name__ == "__main__":
    asyncio.run(main())
