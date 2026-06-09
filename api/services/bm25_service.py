import json
import logging
import math
from collections import defaultdict
from pathlib import Path

logger = logging.getLogger(__name__)

_DATA_PATH = Path(__file__).parent.parent / "data" / "persona.json"


def reciprocal_rank_fusion(
    ranked_lists: list[list[tuple[str, float, dict]]],
    k: int = 60,
    top_n: int = 5,
) -> list[tuple[str, float, dict]]:
    rrf_scores: dict[str, float] = defaultdict(float)
    metadata_by_text: dict[str, dict] = {}

    for ranked in ranked_lists:
        for rank, (text, _score, meta) in enumerate(ranked, start=1):
            rrf_scores[text] += 1.0 / (k + rank)
            if text not in metadata_by_text:
                metadata_by_text[text] = meta

    sorted_results = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [
        (text, score, metadata_by_text[text])
        for text, score in sorted_results[:top_n]
    ]


class BM25Service:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.corpus: list[dict] = []
        self.tokenized_corpus: list[list[str]] = []
        self.doc_freqs: dict[str, int] = defaultdict(int)
        self.doc_lengths: list[int] = []
        self.avgdl: float = 0.0
        self.n: int = 0

        if not _DATA_PATH.exists():
            logger.warning("persona.json not found at %s — BM25 corpus is empty", _DATA_PATH)
            return

        with open(_DATA_PATH, encoding="utf-8") as f:
            self.corpus = json.load(f)

        self.tokenized_corpus = [
            doc["text"].lower().split() for doc in self.corpus
        ]
        self.n = len(self.tokenized_corpus)
        self.doc_lengths = [len(tokens) for tokens in self.tokenized_corpus]
        self.avgdl = sum(self.doc_lengths) / self.n if self.n else 0.0

        for tokens in self.tokenized_corpus:
            for term in set(tokens):
                self.doc_freqs[term] += 1

    def _idf(self, term: str) -> float:
        df = self.doc_freqs.get(term, 0)
        # standard BM25 IDF with smoothing to avoid log(0)
        return math.log((self.n - df + 0.5) / (df + 0.5) + 1)

    def _score(self, query_terms: list[str], doc_idx: int) -> float:
        tokens = self.tokenized_corpus[doc_idx]
        dl = self.doc_lengths[doc_idx]
        tf_map: dict[str, int] = defaultdict(int)
        for tok in tokens:
            tf_map[tok] += 1

        score = 0.0
        for term in query_terms:
            if term not in tf_map:
                continue
            tf = tf_map[term]
            idf = self._idf(term)
            numerator = tf * (self.k1 + 1)
            denominator = tf + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
            score += idf * (numerator / denominator)
        return score

    def search(self, query: str, top_k: int = 15) -> list[tuple[str, float, dict]]:
        if not self.corpus:
            return []

        query_terms = query.lower().split()
        raw_scores = [
            (i, self._score(query_terms, i)) for i in range(self.n)
        ]
        raw_scores.sort(key=lambda x: x[1], reverse=True)
        top = raw_scores[:top_k]

        max_score = top[0][1] if top else 0.0
        divisor = max_score if max_score > 0.0 else 1.0

        results = []
        for idx, score in top:
            doc = self.corpus[idx]
            normalized = score / divisor
            meta = {
                "source": doc.get("source", ""),
                "category": doc.get("category", ""),
                "chunk_index": idx,
            }
            results.append((doc["text"], normalized, meta))
        return results


bm25_service = BM25Service()
