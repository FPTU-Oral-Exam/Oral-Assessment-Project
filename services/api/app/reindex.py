"""Utility script to re-vectorize documents using the active embedding model."""

import logging
from . import ai
from .db import SessionLocal
from .documents import process_document
from .models import Document

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("reindex")


def reindex_all():
    db = SessionLocal()
    try:
        active_model = ai.embedding_name()
        docs = db.query(Document).all()
        log.info("Active embedding model: %s", active_model)
        log.info("Found %d document(s) in database", len(docs))

        for doc in docs:
            log.info("Re-indexing [%s] (id=%s)...", doc.filename, doc.id)
            try:
                process_document(db, doc)
                db.commit()
                log.info("  -> Successfully re-indexed [%s]", doc.filename)
            except Exception as e:
                db.rollback()
                log.error("  -> Failed to re-index [%s]: %s", doc.filename, e)
    finally:
        db.close()


if __name__ == "__main__":
    reindex_all()
