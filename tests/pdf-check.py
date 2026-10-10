"""Inspect actual browser PDF output (requires pypdf)."""
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).parent / 'output'
one = PdfReader(root / 'one-page-a4.pdf')
multi = PdfReader(root / 'multipage-letter.pdf')
assert len(one.pages) == 1
assert len(multi.pages) > 1
assert abs(float(one.pages[0].mediabox.width) - 595.28) < 1
assert abs(float(one.pages[0].mediabox.height) - 841.89) < 1
assert tuple(float(x) for x in multi.pages[0].mediabox[2:]) == (612, 792)
text = ' '.join(page.extract_text() for page in multi.pages)
assert text.count('intentionally') == 300, 'Every summary repetition must survive PDF export'
for reader in (one, multi):
    text = ' '.join(page.extract_text() for page in reader.pages)
    assert 'Jordan Rivers' in text
    assert 'Export PDF' not in text and 'MAKE IT YOURS' not in text
    assert sum(len(page.get('/Annots', [])) for page in reader.pages) >= 3
assert all(len(page.extract_text()) > 100 for page in multi.pages), 'No blank or isolated-heading PDF pages'
print(f'PDF QA passed: 1 A4 page, {len(multi.pages)} Letter pages, selectable text, all long content, hyperlinks, and no application UI.')
