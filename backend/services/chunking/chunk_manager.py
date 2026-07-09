import logging
from typing import List, Dict
from services.chunking.natural_splitter import NaturalSplitter
from services.chunking.overlap_chunker import OverlapChunker
from services.chunking.parent_child_chunker import ParentChildChunker
from services.chunking.metadata_builder import MetadataBuilder
from services.chunking.chunk_validator import ChunkValidator

logger = logging.getLogger(__name__)

class ChunkManager:
    """Orchestrates the entire advanced chunking pipeline."""
    
    def __init__(self):
        self.splitter = NaturalSplitter(max_chunk_words=800)
        self.overlapper = OverlapChunker(overlap_words=150)
        self.pc_chunker = ParentChildChunker()

    def process_document(self, document_id: str, document_name: str, raw_text: str) -> List[Dict]:
        """
        Runs the full enterprise pipeline:
        1. Natural Splitting
        2. Overlap Chunking
        3. Parent/Child Generation
        4. Validation
        5. Metadata Association
        """
        logger.info(f"Starting chunking pipeline for document {document_id}")
        
        # Step 1: Natural Semantic Boundaries
        natural_chunks = self.splitter.split_document(raw_text)
        logger.info(f"Generated {len(natural_chunks)} natural chunks.")
        
        # Step 2: Overlap Chunks for continuity
        overlapped_chunks = self.overlapper.apply_overlap(natural_chunks)
        
        # Step 3: Hierarchical Parent-Child splitting
        hierarchy = self.pc_chunker.build_hierarchy(overlapped_chunks)
        parents = hierarchy["parents"]
        children = hierarchy["children"]
        
        logger.info(f"Generated {len(parents)} parents and {len(children)} child chunks.")
        
        # Step 4 & 5: Validate and attach metadata (Embeddings are meant for children)
        valid_chunks = []
        for child in children:
            if ChunkValidator.is_valid(child["text"]):
                # Retrieve parent for metadata
                parent_chunk = next((p for p in parents if p["id"] == child["parent_id"]), None)
                parent_text = parent_chunk["text"] if parent_chunk else child["text"]
                
                metadata = MetadataBuilder.build(
                    document_id=document_id,
                    document_name=document_name,
                    text=child["text"],
                    parent_chunk_id=child["parent_id"],
                    child_chunk_id=child["id"],
                    chunk_index=child["index"]
                )
                
                valid_chunks.append({
                    "child_id": child["id"],
                    "parent_id": child["parent_id"],
                    "child_text": child["text"],
                    "parent_text": parent_text,
                    "metadata": metadata
                })
        
        logger.info(f"Pipeline complete. {len(valid_chunks)} valid chunks ready for embedding.")
        return valid_chunks
