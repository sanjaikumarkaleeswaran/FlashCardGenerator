import sys
import spacy

def main():
    print("Downloading spaCy 'en_core_web_sm' model...")
    try:
        spacy.cli.download("en_core_web_sm")
        print("Model downloaded successfully!")
    except Exception as e:
        print(f"Error downloading spaCy model: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
