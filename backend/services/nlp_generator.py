import spacy
from spacy.tokens import Doc
from typing import List, Dict, Tuple
import re

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
        # Filter out pronouns and keep keywords that are not stop words
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
        # Look for copula verbs: "is", "are", "was", "were"
        if token.lemma_ == "be" and token.dep_ == "ROOT":
            # Find the nominal subject
            nsubj = None
            for child in token.children:
                if child.dep_ == "nsubj":
                    nsubj = child
                    break
            
            if nsubj:
                # Subject phrase
                subj_tokens = [t for t in nsubj.subtree if t.head.i <= token.i]
                subj_text = "".join([t.text_with_ws for t in subj_tokens]).strip()
                
                # Definition/Complement phrase (everything after the copula)
                comp_tokens = [t for t in sent if t.i > token.i]
                comp_text = "".join([t.text_with_ws for t in comp_tokens]).strip()
                
                if subj_text and comp_text:
                    # Clean trailing punctuation
                    comp_text = re.sub(r'[.\s]+$', '', comp_text)
                    
                    # Choose correct form of 'be'
                    be_verb = token.text
                    
                    question = f"What {be_verb} {subj_text}?"
                    # Capitalize first letter of question
                    question = question[0].upper() + question[1:]
                    return question, comp_text
    return "", ""

def try_person_question(sent, doc_entities) -> Tuple[str, str]:
    """Rule 2: Person questions (Who did X? -> Y)"""
    # Look for PERSON entities in the sentence
    for ent in doc_entities:
        if ent["label"] == "PERSON":
            person_name = ent["text"]
            # Check if this person is inside the sentence and functions as a subject
            if person_name in sent.text:
                # Replace the person's name with "Who"
                sent_text = sent.text.strip()
                # Replace only the first occurrence
                pattern = re.compile(re.escape(person_name), re.IGNORECASE)
                question = pattern.sub("Who", sent_text)
                # Remove trailing periods and add a question mark
                question = re.sub(r'[.\s]+$', '', question) + "?"
                return question, person_name
    return "", ""

def try_location_question(sent, doc_entities) -> Tuple[str, str]:
    """Rule 3: Location questions (Where did X occur? -> in Y)"""
    # Look for LOC/GPE entities
    loc_ent = None
    for ent in doc_entities:
        if ent["label"] in ["LOC", "GPE"] and ent["text"] in sent.text:
            loc_ent = ent["text"]
            break
            
    # Find prepositions indicating location: in, at, on, to
    for token in sent:
        if token.text.lower() in ["in", "at", "on", "to"] and token.dep_ == "prep":
            # Check if preposition object is a location
            pobj = None
            for child in token.children:
                if child.dep_ == "pobj":
                    pobj = child
                    break
            
            if pobj and (loc_ent or pobj.pos_ in ["NOUN", "PROPN"]):
                loc_phrase = "".join([t.text_with_ws for t in token.subtree]).strip()
                loc_phrase_clean = re.sub(r'[.\s]+$', '', loc_phrase)
                
                # Extract the rest of the sentence (subject + verb)
                rest_tokens = [t for t in sent if t.i < token.i]
                rest_text = "".join([t.text_with_ws for t in rest_tokens]).strip()
                
                # Try to formulate "Where does/do/did ..."
                # Look for root verb to get subject and tense
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
                    # Simple tense detection
                    tense = "does"
                    root_lemma = root_verb.lemma_
                    if root_verb.tag_ in ["VBD", "VBN"]:
                        tense = "did"
                    elif nsubj.tag_ in ["NNS", "NNPS"] or (nsubj.text.lower() in ["they", "we", "you", "i"]):
                        tense = "do"
                        
                    # Reconstruct question: "Where {tense} {subject} {verb_lemma}?"
                    subj_text = "".join([t.text_with_ws for t in nsubj.subtree if t.i < token.i]).strip()
                    # Clean subj_text from any leading capitalized verb if present
                    question = f"Where {tense} {subj_text.lower()} {root_lemma}?"
                    question = question[0].upper() + question[1:]
                    return question, loc_phrase_clean
    return "", ""

def try_time_question(sent, doc_entities) -> Tuple[str, str]:
    """Rule 4: Time questions (When did X happen? -> in Y)"""
    # Look for DATE/TIME entities
    time_ent = None
    for ent in doc_entities:
        if ent["label"] in ["DATE", "TIME"] and ent["text"] in sent.text:
            time_ent = ent["text"]
            break
            
    if time_ent:
        # Locate preposition associated with time entity
        for token in sent:
            if token.dep_ == "prep" and any(child.text == time_ent or time_ent in child.text for child in token.children):
                time_phrase = "".join([t.text_with_ws for t in token.subtree]).strip()
                time_phrase_clean = re.sub(r'[.\s]+$', '', time_phrase)
                
                # Check for helper/auxiliary verbs: was, were, did
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
                        # Tense detection for standard verbs
                        tense = "did" if root_verb.tag_ in ["VBD", "VBN"] else "does"
                        question = f"When {tense} {subj_text.lower()} {root_lemma}?"
                        
                    question = question[0].upper() + question[1:]
                    return question, time_phrase_clean
    return "", ""

def try_fallback_question(sent) -> Tuple[str, str]:
    """Rule 5: Fallback Keyword Masking / Cloze Deletion"""
    # Find direct object, or a key noun
    target_token = None
    for token in sent:
        if token.dep_ == "dobj" and token.pos_ in ["NOUN", "PROPN"]:
            target_token = token
            break
            
    if not target_token:
        # Fallback to any noun that is not a subject
        for token in sent:
            if token.pos_ in ["NOUN", "PROPN"] and token.dep_ not in ["nsubj", "nsubjpass", "compound"]:
                target_token = token
                break
                
    if target_token:
        # Create cloze-deletion
        answer = target_token.text
        sent_text = sent.text.strip()
        # Clean double spaces and replace target word with blank
        pattern = re.compile(r'\b' + re.escape(answer) + r'\b', re.IGNORECASE)
        question = pattern.sub("______", sent_text)
        # Ensure it has a punctuation
        if not question.endswith((".", "?", "!")):
            question += "."
        # Formulate as a review item prompt
        question = f"Complete the statement: {question}"
        return question, answer
        
    return "", ""

def generate_flashcards(notes: str) -> List[Dict[str, str]]:
    """Analyze notes and generate a list of question-answer flashcard dicts."""
    flashcards = []
    
    # Text validation
    notes = notes.strip()
    if len(notes) < 30:
        return []
        
    # Get NLP engine
    engine = get_nlp()
    if engine is None:
        # Basic pure-python fallback for demo/environments without spaCy loaded
        sentences = [s.strip() for s in re.split(r'[.!?]+', notes) if len(s.strip()) > 10]
        for s in sentences:
            if " is " in s:
                parts = s.split(" is ")
                flashcards.append({
                    "question": f"What is {parts[0].strip()}?",
                    "answer": parts[1].strip(),
                    "difficulty": "easy"
                })
            else:
                words = s.split()
                if len(words) > 4:
                    keyword = words[-1].strip(",.")
                    q = s.replace(keyword, "______")
                    flashcards.append({
                        "question": f"Complete the statement: {q}",
                        "answer": keyword,
                        "difficulty": "medium"
                    })
        return flashcards

    # Process notes
    doc = engine(notes)
    doc_entities = extract_entities(doc)
    
    # Process sentence by sentence
    for sent in doc.sents:
        # Skip very short sentences (less than 4 words)
        if len([t for t in sent if not t.is_punct]) < 4:
            continue
            
        q, a = "", ""
        difficulty = get_sentence_difficulty(sent)
        
        # Apply NLP rules sequentially
        # 1. Check for Definition
        q, a = try_definition_question(sent)
        
        # 2. Check for Person
        if not q:
            q, a = try_person_question(sent, doc_entities)
            
        # 3. Check for Location
        if not q:
            q, a = try_location_question(sent, doc_entities)
            
        # 4. Check for Time/Date
        if not q:
            q, a = try_time_question(sent, doc_entities)
            
        # 5. Fallback cloze deletion
        if not q:
            q, a = try_fallback_question(sent)
            
        if q and a:
            # Capitalize answer
            a = a[0].upper() + a[1:] if len(a) > 0 else a
            flashcards.append({
                "question": q,
                "answer": a,
                "difficulty": difficulty
            })
            
    # Remove duplicate flashcards by question
    seen = set()
    unique_cards = []
    for card in flashcards:
        if card["question"] not in seen:
            seen.add(card["question"])
            unique_cards.append(card)
            
    return unique_cards
