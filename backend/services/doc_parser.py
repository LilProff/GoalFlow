"""
Text extraction for the AI-import onboarding flow. The user runs their own
AI assistant elsewhere and uploads whatever it hands back — supports the
plain-text formats that covers (.md/.txt) plus .docx, since "send back the
md file or doc" was the explicit ask.
"""
import io

MAX_IMPORT_BYTES = 2 * 1024 * 1024  # 2MB — this is a goals document, not a data dump


class UnsupportedImportFile(Exception):
    pass


def extract_text(filename: str, content: bytes) -> str:
    if len(content) > MAX_IMPORT_BYTES:
        raise UnsupportedImportFile("File is too large (2MB max).")

    name = (filename or "").lower()

    if name.endswith(".docx"):
        try:
            from docx import Document
        except ImportError as e:
            raise UnsupportedImportFile("Server is missing the .docx parser.") from e
        try:
            doc = Document(io.BytesIO(content))
        except Exception as e:
            raise UnsupportedImportFile("Couldn't read that .docx file — is it valid?") from e
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    if name.endswith(".doc"):
        # Legacy binary .doc (not .docx) has no lightweight pure-Python
        # reader in this stack — ask for a format we can actually parse
        # rather than silently mangling binary content as text.
        raise UnsupportedImportFile("Old .doc format isn't supported — please save as .docx or .md and re-upload.")

    # .md, .txt, or anything else unrecognized — treat as plain text.
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("utf-8", errors="ignore")
