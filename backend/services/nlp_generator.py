import spacy
from spacy.tokens import Doc
from typing import List, Dict, Tuple
import re
import random

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # Safe fallback if model is not loaded (will download during execution or start)
    nlp = None

def get_nlp():
    """Ensure NLP engine is loaded; try to load dynamically if needed."""
    global nlp
    if nlp is None:
        try:
            nlp = spacy.load("en_core_web_sm")
        except OSError:
            try:
                from spacy.cli import download
                download("en_core_web_sm")
                nlp = spacy.load("en_core_web_sm")
            except Exception:
                nlp = None
    return nlp

def extract_keywords(doc: Doc) -> List[str]:
    """Extract important nouns and concepts from the parsed document."""
    keywords = []
    for chunk in doc.noun_chunks:
        clean_text = chunk.root.text.strip().lower()
        if not chunk.root.is_stop and len(clean_text) > 2:
            keywords.append(chunk.text.strip())
    return list(set(keywords))

def extract_entities(doc: Doc) -> List[Dict[str, str]]:
    """Detect people, locations, dates, and organizations."""
    entities = []
    for ent in doc.ents:
        if ent.label_ in ["PERSON", "GPE", "LOC", "DATE", "TIME", "ORG"]:
            entities.append({
                "text": ent.text.strip(),
                "label": ent.label_
            })
    return entities

def extract_all_entities_and_nouns(doc) -> Tuple[List[str], Dict[str, List[str]]]:
    """Extract all nouns and entities to build high-quality MCQ distractors."""
    by_type = {}
    all_nouns = []
    
    # Extract entities by type
    for ent in doc.ents:
        label = ent.label_
        text = ent.text.strip()
        if text:
            if label not in by_type:
                by_type[label] = []
            if text not in by_type[label]:
                by_type[label].append(text)
                
    # Extract nouns from chunks
    for chunk in doc.noun_chunks:
        text = chunk.text.strip()
        if text and len(text) > 1:
            all_nouns.append(text)
            
    return list(set(all_nouns)), by_type

def get_sentence_difficulty(sent) -> str:
    """Calculate difficulty based on sentence length and dependency complexity."""
    words = len([token for token in sent if not token.is_punct])
    if words < 12:
        return "easy"
    elif words <= 22:
        return "medium"
    else:
        return "hard"

def try_definition_question(sent) -> Tuple[str, str]:
    """Rule 1: Definition questions (X is Y -> What is X? -> Y)"""
    for token in sent:
        if token.lemma_ == "be" and token.dep_ == "ROOT":
            nsubj = None
            for child in token.children:
                if child.dep_ == "nsubj":
                    nsubj = child
                    break
            
            if nsubj:
                subj_tokens = [t for t in nsubj.subtree if t.head.i <= token.i]
                subj_text = "".join([t.text_with_ws for t in subj_tokens]).strip()
                comp_tokens = [t for t in sent if t.i > token.i]
                comp_text = "".join([t.text_with_ws for t in comp_tokens]).strip()
                
                if subj_text and comp_text:
                    comp_text = re.sub(r'[.\s]+$', '', comp_text)
                    be_verb = token.text
                    question = f"What {be_verb} {subj_text}?"
                    question = question[0].upper() + question[1:]
                    return question, comp_text
    return "", ""

def try_person_question(sent, doc_entities) -> Tuple[str, str]:
    """Rule 2: Person questions (Who did X? -> Y)"""
    for ent in doc_entities:
        if ent["label"] == "PERSON":
            person_name = ent["text"]
            if person_name in sent.text:
                sent_text = sent.text.strip()
                pattern = re.compile(re.escape(person_name), re.IGNORECASE)
                question = pattern.sub("Who", sent_text)
                question = re.sub(r'[.\s]+$', '', question) + "?"
                return question, person_name
    return "", ""

def try_location_question(sent, doc_entities) -> Tuple[str, str]:
    """Rule 3: Location questions (Where did X occur? -> in Y)"""
    loc_ent = None
    for ent in doc_entities:
        if ent["label"] in ["LOC", "GPE"] and ent["text"] in sent.text:
            loc_ent = ent["text"]
            break
            
    for token in sent:
        if token.text.lower() in ["in", "at", "on", "to"] and token.dep_ == "prep":
            pobj = None
            for child in token.children:
                if child.dep_ == "pobj":
                    pobj = child
                    break
            
            if pobj and (loc_ent or pobj.pos_ in ["NOUN", "PROPN"]):
                loc_phrase = "".join([t.text_with_ws for t in token.subtree]).strip()
                loc_phrase_clean = re.sub(r'[.\s]+$', '', loc_phrase)
                
                rest_tokens = [t for t in sent if t.i < token.i]
                rest_text = "".join([t.text_with_ws for t in rest_tokens]).strip()
                
                root_verb = None
                nsubj = None
                for t in sent:
                    if t.dep_ == "ROOT" and t.pos_ == "VERB":
                        root_verb = t
                        break
                
                if root_verb:
                    for child in root_verb.children:
                        if child.dep_ in ["nsubj", "nsubjpass"]:
                            nsubj = child
                            break
                            
                if root_verb and nsubj:
                    tense = "does"
                    root_lemma = root_verb.lemma_
                    if root_verb.tag_ in ["VBD", "VBN"]:
                        tense = "did"
                    elif nsubj.tag_ in ["NNS", "NNPS"] or (nsubj.text.lower() in ["they", "we", "you", "i"]):
                        tense = "do"
                        
                    subj_text = "".join([t.text_with_ws for t in nsubj.subtree if t.i < token.i]).strip()
                    question = f"Where {tense} {subj_text.lower()} {root_lemma}?"
                    question = question[0].upper() + question[1:]
                    return question, loc_phrase_clean
    return "", ""

def try_time_question(sent, doc_entities) -> Tuple[str, str]:
    """Rule 4: Time questions (When did X happen? -> in Y)"""
    time_ent = None
    for ent in doc_entities:
        if ent["label"] in ["DATE", "TIME"] and ent["text"] in sent.text:
            time_ent = ent["text"]
            break
            
    if time_ent:
        for token in sent:
            if token.dep_ == "prep" and any(child.text == time_ent or time_ent in child.text for child in token.children):
                time_phrase = "".join([t.text_with_ws for t in token.subtree]).strip()
                time_phrase_clean = re.sub(r'[.\s]+$', '', time_phrase)
                
                aux_verb = "did"
                root_verb = None
                nsubj = None
                
                for t in sent:
                    if t.dep_ == "ROOT":
                        root_verb = t
                    if t.dep_ == "auxpass" or t.dep_ == "aux":
                        aux_verb = t.text
                
                if root_verb:
                    for child in root_verb.children:
                        if child.dep_ in ["nsubj", "nsubjpass"]:
                            nsubj = child
                            break
                
                if root_verb and nsubj:
                    subj_text = "".join([t.text_with_ws for t in nsubj.subtree if t.i < token.i]).strip()
                    if aux_verb in ["was", "were"]:
                        verb_text = root_verb.text
                        question = f"When {aux_verb} {subj_text.lower()} {verb_text}?"
                    else:
                        root_lemma = root_verb.lemma_
                        tense = "did" if root_verb.tag_ in ["VBD", "VBN"] else "does"
                        question = f"When {tense} {subj_text.lower()} {root_lemma}?"
                        
                    question = question[0].upper() + question[1:]
                    return question, time_phrase_clean
    return "", ""

def try_fallback_question(sent, ignore_words: List[str] = None) -> Tuple[str, str]:
    """Rule 5: Fallback Keyword Masking / Cloze Deletion with Stopword Filtering"""
    ignore_set = {w.lower().strip() for w in ignore_words} if ignore_words else set()
    extra_stopwords = {
        "however", "therefore", "although", "furthermore", "besides", "instead", 
        "meanwhile", "nevertheless", "nonetheless", "non", "yes", "no", "not", 
        "any", "some", "every", "other", "another", "such", "this", "that", "these",
        "those", "which", "whose", "what", "where", "when", "why", "how", "whom"
    }

    target_token = None
    for token in sent:
        t_low = token.text.strip().lower()
        if (
            token.dep_ == "dobj" and 
            token.pos_ in ["NOUN", "PROPN"] and 
            not token.is_stop and 
            len(t_low) > 2 and
            t_low not in ignore_set and
            t_low not in extra_stopwords
        ):
            target_token = token
            break
            
    if not target_token:
        for token in sent:
            t_low = token.text.strip().lower()
            if (
                token.pos_ in ["NOUN", "PROPN"] and 
                token.dep_ not in ["nsubj", "nsubjpass", "compound"] and
                not token.is_stop and
                len(t_low) > 2 and
                t_low not in ignore_set and
                t_low not in extra_stopwords
            ):
                target_token = token
                break
                
    if target_token:
        answer = target_token.text
        sent_text = sent.text.strip()
        pattern = re.compile(r'\b' + re.escape(answer) + r'\b', re.IGNORECASE)
        question = pattern.sub("______", sent_text)
        if not question.endswith((".", "?", "!")):
            question += "."
        return question, answer
        
    return "", ""

def generate_qa(notes: str) -> List[Dict]:
    """Generate Standard Question-Answer flashcards using spaCy rules."""
    flashcards = []
    engine = get_nlp()
    if engine is None:
        return []
        
    doc = engine(notes)
    doc_entities = extract_entities(doc)
    
    for sent in doc.sents:
        if len([t for t in sent if not t.is_punct]) < 4:
            continue
            
        q, a = "", ""
        difficulty = get_sentence_difficulty(sent)
        
        q, a = try_definition_question(sent)
        if not q:
            q, a = try_person_question(sent, doc_entities)
        if not q:
            q, a = try_location_question(sent, doc_entities)
        if not q:
            q, a = try_time_question(sent, doc_entities)
        if not q:
            q, a = try_fallback_question(sent)
            if q:
                q = f"Complete the statement: {q}"

        if q and a:
            a = a[0].upper() + a[1:] if len(a) > 0 else a
            flashcards.append({
                "type": "qa",
                "question": q,
                "answer": a,
                "difficulty": difficulty,
                "options": []
            })
            
    # Deduplicate
    seen = set()
    unique = []
    for c in flashcards:
        if c["question"] not in seen:
            seen.add(c["question"])
            unique.append(c)
    return unique

def generate_fillups(notes: str, ignore_words: List[str] = None) -> List[Dict]:
    """Generate Cloze Fill-in-the-blank cards with ignore words protection."""
    flashcards = []
    engine = get_nlp()
    if engine is None:
        return []
        
    doc = engine(notes)
    ignore_set = {w.lower().strip() for w in ignore_words} if ignore_words else set()
    extra_stopwords = {
        "however", "therefore", "although", "furthermore", "besides", "instead", 
        "meanwhile", "nevertheless", "nonetheless", "non", "yes", "no", "not", 
        "any", "some", "every", "other", "another", "such", "this", "that", "these",
        "those", "which", "whose", "what", "where", "when", "why", "how", "whom"
    }
    
    for sent in doc.sents:
        if len([t for t in sent if not t.is_punct]) < 4:
            continue
            
        difficulty = get_sentence_difficulty(sent)
        target = None
        
        # Locate candidate noun to mask, filtering stopwords/ignored words
        for token in sent:
            t_low = token.text.strip().lower()
            if (
                token.dep_ in ["dobj", "pobj"] and 
                token.pos_ in ["NOUN", "PROPN"] and 
                not token.is_stop and
                len(t_low) > 2 and
                t_low not in ignore_set and
                t_low not in extra_stopwords
            ):
                target = token
                break
        if not target:
            for token in sent:
                t_low = token.text.strip().lower()
                if (
                    token.pos_ in ["NOUN", "PROPN"] and 
                    not token.is_stop and 
                    token.dep_ not in ["compound"] and
                    len(t_low) > 2 and
                    t_low not in ignore_set and
                    t_low not in extra_stopwords
                ):
                    target = token
                    break
                    
        if target:
            answer = target.text
            sent_text = sent.text.strip()
            pattern = re.compile(r'\b' + re.escape(answer) + r'\b', re.IGNORECASE)
            question = pattern.sub("______", sent_text)
            
            if not question.endswith((".", "?", "!")):
                question += "."
                
            flashcards.append({
                "type": "fillup",
                "question": question,
                "answer": answer,
                "difficulty": difficulty,
                "options": []
            })
            
    # Deduplicate
    seen = set()
    unique = []
    for c in flashcards:
        if c["question"] not in seen:
            seen.add(c["question"])
            unique.append(c)
    return unique

def generate_mcq(notes: str) -> List[Dict]:
    """Generate Multiple Choice Questions (MCQ) with 4 options utilizing Noun Phrases as Distractors."""
    flashcards = []
    engine = get_nlp()
    if engine is None:
        return []
        
    doc = engine(notes)
    all_nouns, entities_by_type = extract_all_entities_and_nouns(doc)
    doc_entities = extract_entities(doc)
    
    # Generic lists to generate distractors if the text doesn't contain enough elements
    fallbacks = {
        "PERSON": ["Isaac Newton", "Nikola Tesla", "Charles Darwin", "Galileo Galilei", "Marie Curie", "Albert Einstein"],
        "GPE": ["London", "Paris", "New York", "Tokyo", "Berlin", "Washington DC"],
        "LOC": ["Asia", "Europe", "Atlantic Ocean", "Amazon Rainforest", "Sahara Desert"],
        "DATE": ["1915", "1945", "1895", "1776", "2001", "1989"],
        "GENERIC": ["Nucleus", "Ribosome", "Cell Wall", "Chloroplast", "Mitochondria", "Cytoplasm", "Endoplasmic cell"]
    }
    
    # Extract noun phrase distractors from doc.noun_chunks
    noun_phrases = []
    for chunk in doc.noun_chunks:
        chunk_clean = re.sub(r'[.\s]+$', '', chunk.text).strip()
        if chunk_clean and len(chunk_clean) > 2 and not chunk.root.is_stop:
            chunk_cap = chunk_clean[0].upper() + chunk_clean[1:]
            if chunk_cap not in noun_phrases:
                noun_phrases.append(chunk_cap)

    for sent in doc.sents:
        if len([t for t in sent if not t.is_punct]) < 4:
            continue
            
        difficulty = get_sentence_difficulty(sent)
        q, a = "", ""
        ent_label = "GENERIC"
        
        # Check if the sentence has an entity to determine label
        for ent in doc_entities:
            if ent["text"] in sent.text:
                ent_label = ent["label"]
                break
                
        # Generate raw QA structure
        q, a = try_definition_question(sent)
        if not q:
            q, a = try_person_question(sent, doc_entities)
            if q:
                ent_label = "PERSON"
        if not q:
            q, a = try_location_question(sent, doc_entities)
            if q:
                ent_label = "GPE"
        if not q:
            q, a = try_time_question(sent, doc_entities)
            if q:
                ent_label = "DATE"
        if not q:
            q, a = try_fallback_question(sent)
            
        if q and a:
            correct_ans = a.strip()
            # Clean up prepositions
            correct_ans_clean = re.sub(r'^[In\s|At\s|On\s|To\s]+', '', correct_ans, flags=re.IGNORECASE)
            correct_ans_clean = re.sub(r'[.\s]+$', '', correct_ans_clean).strip()
            if not correct_ans_clean:
                correct_ans_clean = correct_ans
                
            correct_ans_clean = correct_ans_clean[0].upper() + correct_ans_clean[1:] if len(correct_ans_clean) > 0 else correct_ans_clean
            
            # Formulate distractors
            distractors = []
            
            # 1. Grab same-entity type from parsed text
            candidates = entities_by_type.get(ent_label, [])
            for cand in candidates:
                cand_clean = re.sub(r'[.\s]+$', '', cand).strip()
                if len(cand_clean) > 0:
                    cand_cap = cand_clean[0].upper() + cand_clean[1:]
                    if cand_cap.lower() != correct_ans_clean.lower() and cand_cap not in distractors:
                        distractors.append(cand_cap)
            
            # 2. Add mined Noun Phrases from doc.noun_chunks (Advanced MCQ quality distractor mining)
            if len(distractors) < 3:
                for np in noun_phrases:
                    if np.lower() != correct_ans_clean.lower() and np not in distractors:
                        distractors.append(np)
                        if len(distractors) >= 3:
                            break

            # 3. Add general nouns from text
            if len(distractors) < 3:
                for n in all_nouns:
                    n_clean = n.strip()
                    if len(n_clean) > 0:
                        n_cap = n_clean[0].upper() + n_clean[1:]
                        if n_cap.lower() != correct_ans_clean.lower() and n_cap not in distractors:
                            distractors.append(n_cap)
                            if len(distractors) >= 3:
                                break

            # 4. Add fallback entities of the same type
            if len(distractors) < 3:
                backup = fallbacks.get(ent_label, fallbacks["GENERIC"])
                for b in backup:
                    b_clean = b.strip()
                    if b_clean.lower() != correct_ans_clean.lower() and b_clean not in distractors:
                        distractors.append(b_clean)
                        if len(distractors) >= 3:
                            break
                            
            # 5. Final fallback using biological/general terms
            if len(distractors) < 3:
                for fallback_val in fallbacks["GENERIC"]:
                    if fallback_val.lower() != correct_ans_clean.lower() and fallback_val not in distractors:
                        distractors.append(fallback_val)
                        if len(distractors) >= 3:
                            break
                            
            distractors = distractors[:3]
            
            # Build options list (exactly 4 unique realistic options)
            options = [correct_ans_clean] + distractors
            # Keep it unique
            options = list(dict.fromkeys(options))
            while len(options) < 4:
                # Add unique fallbacks if not 4 options
                for item in fallbacks["GENERIC"]:
                    if item not in options:
                        options.append(item)
                        break
            options = options[:4]
            random.shuffle(options)
            
            flashcards.append({
                "type": "mcq",
                "question": q,
                "answer": correct_ans_clean,
                "difficulty": difficulty,
                "options": options
            })
            
    # Deduplicate
    seen = set()
    unique = []
    for c in flashcards:
        if c["question"] not in seen:
            seen.add(c["question"])
            unique.append(c)
    return unique

def generate_flashcards_upgraded(notes: str, count: int, card_type: str, ignore_words: List[str] = None) -> List[Dict]:
    """Orchestrator to generate specific flashcard types up to the requested count."""
    if card_type == "mcq":
        cards = generate_mcq(notes)
    elif card_type == "fillup":
        cards = generate_fillups(notes, ignore_words)
    else:
        cards = generate_qa(notes)
        
    return cards[:count]

def generate_flashcards(notes: str) -> List[Dict]:
    """Legacy backward-compatible API signature mapping to standard QA mode."""
    raw_cards = generate_qa(notes)
    # Strip type & options for legacy support
    legacy_cards = []
    for c in raw_cards:
        legacy_cards.append({
            "question": c["question"],
            "answer": c["answer"],
            "difficulty": c["difficulty"]
        })
    return legacy_cards
