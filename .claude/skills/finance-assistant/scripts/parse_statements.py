#!/usr/bin/env python3
"""Read Israeli credit-card and bank exports (Max, Isracard/Amex, Cal/Diners, bank current
accounts; .xlsx / .xls / HTML-disguised .xls / .csv) into one normalised transactions table.

Nothing here is tied to a single issuer's layout: every sheet is scanned for header rows, header
cells are matched to canonical fields by their Hebrew/English wording, and each header starts a
section that runs until the next header. Rows whose date does not parse (totals, blank lines,
section titles) are skipped. The card's last four digits are taken from the card column or, failing
that, from a "כרטיס ... 1234" line above the section.

    python3 parse_statements.py finance/data/*.xlsx -o finance/out/transactions.csv

Output columns: see FIELDS. amount > 0 is money out (charge), amount < 0 is money in (refund,
income). month is the billing month (charge date when the export has one, else purchase date).
"""
import argparse
import csv
import datetime as dt
import io
import os
import re
import sys

import pandas as pd

FIELDS = ["date", "charge_date", "month", "merchant", "amount", "orig_amount", "orig_currency",
          "card", "txn_type", "installment_no", "installment_total", "issuer_category", "notes",
          "issuer", "kind", "source_file", "sheet", "row"]

# canonical field -> header wordings (normalised: no quotes/geresh, single spaces, lower case).
# Longer, more specific wordings are tried first, so "סכום עסקה מקורי" never lands on "סכום עסקה".
SYNONYMS = {
    "date": ["תאריך עסקה", "תאריך העסקה", "תאריך רכישה", "תאריך הרכישה", "תאריך ביצוע",
             "תאריך פעולה", "תאריך", "transaction date", "purchase date", "date"],
    "charge_date": ["תאריך חיוב", "מועד חיוב", "תאריך החיוב", "תאריך ערך", "יום ערך",
                    "billing date", "charge date", "value date"],
    "merchant": ["שם בית העסק", "שם בית עסק", "בית העסק", "בית עסק", "שם העסק", "תיאור הפעולה",
                 "תאור הפעולה", "סוג הפעולה", "הפעולה", "תיאור", "תאור", "פרטים", "merchant",
                 "description", "payee"],
    "amount": ["סכום חיוב", "סכום החיוב", "סכום לחיוב", "סכום חיוב בשח", "חיוב בשח", "סכום בשח",
               "charged amount", "billing amount", "amount charged"],
    "orig_amount": ["סכום עסקה מקורי", "סכום העסקה המקורי", "סכום מקורי", "סכום עסקה",
                    "סכום העסקה", "original amount", "transaction amount"],
    "charge_currency": ["מטבע חיוב", "מטבע לחיוב", "מטבע החיוב", "billing currency"],
    "orig_currency": ["מטבע עסקה מקורי", "מטבע עסקה", "מטבע מקור", "מטבע המקור",
                      "original currency", "currency"],
    "card": ["4 ספרות אחרונות של כרטיס האשראי", "ספרות אחרונות", "4 ספרות", "מספר כרטיס",
             "כרטיס", "card"],
    "txn_type": ["סוג עסקה", "סוג העסקה", "סוג חיוב", "transaction type", "type"],
    "issuer_category": ["קטגוריה", "ענף", "סקטור", "category"],
    "notes": ["פירוט נוסף", "פרטים נוספים", "הערות", "הערה", "notes", "memo"],
    "voucher": ["מס שובר", "מספר שובר", "אסמכתא", "אסמכתה", "reference"],
    "debit": ["בחובה", "חובה", "debit", "withdrawal"],
    "credit": ["בזכות", "זכות", "credit", "deposit"],
    "balance": ["יתרה בשח", "היתרה", "יתרה", "balance"],
    "generic_amount": ["סכום", "amount"],
}
_PAIRS = sorted(((norm, field) for field, words in SYNONYMS.items() for norm in words),
                key=lambda p: -len(p[0]))

ISSUER_HINTS = [("max", ["max", "מקס", "לאומי קארד"]), ("isracard", ["ישראכרט", "isracard"]),
                ("amex", ["אמריקן אקספרס", "american express", "amex"]),
                ("cal", ["כאל", "cal-online", "visa cal", "ויזה כאל"]), ("diners", ["דיינרס", "diners"])]
CURRENCY_SIGNS = {"₪": "ILS", "ש\"ח": "ILS", "שח": "ILS", "nis": "ILS", "ils": "ILS", "$": "USD",
                  "usd": "USD", "דולר": "USD", "€": "EUR", "eur": "EUR", "אירו": "EUR", "יורו": "EUR",
                  "£": "GBP", "gbp": "GBP", "לישט": "GBP"}


def norm(s):
    s = "" if s is None else str(s)
    s = re.sub(r"[\"'״׳`]", "", s).replace("\n", " ").replace("‏", "").replace("‎", "")
    return re.sub(r"\s+", " ", s).strip().lower()


def match_header(cell):
    n = norm(cell)
    if not n or len(n) > 45:
        return None
    for word, field in _PAIRS:
        if n == word:
            return field
    for word, field in _PAIRS:
        if len(word) >= 4 and word in n:
            return field
    return None


def header_map(row):
    """Return {field: column index} if this row looks like a header, else None."""
    found = {}
    for i, cell in enumerate(row):
        f = match_header(cell)
        if f and f not in found:
            found[f] = i
    has_amount = any(k in found for k in ("amount", "orig_amount", "debit", "credit", "generic_amount"))
    if "date" in found and "merchant" in found and has_amount and len(found) >= 3:
        return found
    if "charge_date" in found and "merchant" in found and has_amount:   # bank: only value date
        found["date"] = found.pop("charge_date")
        return found
    return None


def parse_date(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (dt.datetime, pd.Timestamp)):
        return v.date() if not pd.isna(v) else None
    if isinstance(v, dt.date):
        return v
    if isinstance(v, (int, float)) and 20000 < float(v) < 80000:          # Excel serial
        return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(v))).date()
    s = str(v).strip()
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        y, mo, d = map(int, m.groups())
    else:
        m = re.match(r"^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$", s.split(" ")[0])
        if not m:
            return None
        d, mo, y = map(int, m.groups())
        if y < 100:
            y += 2000
    try:
        return dt.date(y, mo, d)
    except ValueError:
        return None


def parse_amount(v):
    """Return (value, currency or None). Handles '₪ 1,234.50', '1,234.50-', '(12.00)', '$12'."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None, None
    if isinstance(v, (int, float)):
        return float(v), None
    s = str(v).strip()
    if not s:
        return None, None
    cur = None
    low = norm(s)
    for sign, code in CURRENCY_SIGNS.items():
        if sign in low or sign in s:
            cur = code
            break
    neg = s.startswith("-") or s.endswith("-") or (s.startswith("(") and s.endswith(")"))
    digits = re.sub(r"[^0-9.,]", "", s)
    if not digits or not re.search(r"\d", digits):
        return None, cur
    if "," in digits and "." in digits:
        digits = digits.replace(",", "")
    elif "," in digits:
        parts = digits.split(",")
        digits = digits.replace(",", "") if len(parts[-1]) == 3 else digits.replace(",", ".")
    try:
        val = float(digits)
    except ValueError:
        return None, cur
    return (-val if neg else val), cur


def currency_code(v):
    n = norm(v)
    if not n:
        return None
    for sign, code in CURRENCY_SIGNS.items():
        if sign in n or sign in str(v):
            return code
    return n.upper()[:3]


INSTALLMENT_RE = re.compile(r"(?:תשלום\s*)?(\d{1,2})\s*(?:מתוך|מ-|/|מ\s)\s*(\d{1,2})")


def classify_type(txn_type, notes, merchant):
    text = " ".join(norm(x) for x in (txn_type, notes))
    no = total = None
    m = INSTALLMENT_RE.search(text)
    if m and ("תשלום" in text or "מתוך" in text):
        no, total = int(m.group(1)), int(m.group(2))
        if not (0 < no <= total <= 72):
            no = total = None
    if "קרדיט" in text:
        kind = "credit"
    elif no or "תשלומים" in text:
        kind = "installments"
    elif "הוראת קבע" in text or "הו\"ק" in text or "קבע" in text:
        kind = "standing_order"
    elif any(w in text for w in ("זיכוי", "החזר", "ביטול")):
        kind = "refund"
    elif "מיידי" in text or "דביט" in text:
        kind = "immediate"
    else:
        kind = "regular"
    return kind, no, total


def detect_issuer(path, rows, header_row):
    """File name first, then only the title rows above the first header (merchant names in the
    data, such as a bank line "מקס איט פיננסים", must not decide the issuer)."""
    pre = rows[:header_row] if header_row is not None else rows[:6]
    for blob in (norm(os.path.basename(path)), " ".join(norm(c) for r in pre for c in r if c is not None)):
        for name, words in ISSUER_HINTS:
            if any(w in blob for w in words):
                return name
    tokens = set(re.split(r"[^a-z]+", norm(os.path.basename(path))))
    if "transaction-details" in norm(os.path.basename(path)):
        return "max"
    for name in ("cal", "max", "isracard", "amex", "diners"):
        if name in tokens:
            return name
    return "unknown"


CARD_CTX = re.compile(r"(?:כרטיס|המסתיים|מסתיים|card|ending)[^0-9]{0,25}(\d{4})(?!\d)")


def read_sheets(path):
    """Yield (sheet_name, list of row lists) for any supported file."""
    ext = os.path.splitext(path)[1].lower()
    with open(path, "rb") as fh:
        head = fh.read(512)
    if ext == ".csv" or ext == ".txt":
        for enc in ("utf-8-sig", "cp1255", "utf-16"):
            try:
                text = open(path, encoding=enc).read()
                break
            except UnicodeError:
                continue
        dialect = csv.Sniffer().sniff(text[:4000], delimiters=",;\t") if text else csv.excel
        yield "csv", [r for r in csv.reader(io.StringIO(text), dialect)]
        return
    if head.lstrip()[:1] == b"<" or b"<html" in head.lower() or b"<table" in head.lower():
        # Isracard/banks often ship an HTML table renamed to .xls
        for i, df in enumerate(pd.read_html(path, header=None, encoding="utf-8")):
            yield f"table{i + 1}", df.astype(object).where(df.notna(), None).values.tolist()
        return
    engine = "xlrd" if head.startswith(b"\xd0\xcf\x11\xe0") else "openpyxl"
    book = pd.read_excel(path, sheet_name=None, header=None, engine=engine)
    for name, df in book.items():
        yield name, df.astype(object).where(df.notna(), None).values.tolist()


def parse_file(path):
    out = []
    for sheet, rows in read_sheets(path):
        first_hdr = next((i for i, r in enumerate(rows[:60]) if header_map(list(r))), None)
        issuer = detect_issuer(path, rows, first_hdr)
        hmap, card_ctx, section = None, None, ""
        for r_i, row in enumerate(rows):
            row = list(row)
            text = " ".join(str(c) for c in row if c is not None)
            hm = header_map(row)
            if hm:
                hmap = hm
                continue
            m = CARD_CTX.search(text)
            if m and (hmap is None or parse_date(_cell(row, hmap, "date")) is None):
                card_ctx = m.group(1)
            if hmap is None:
                continue
            d = parse_date(_cell(row, hmap, "date"))
            if d is None:
                if text.strip() and len(text) < 80 and not re.search(r"\d", text):
                    section = text.strip()
                continue
            merchant = str(_cell(row, hmap, "merchant") or "").strip()
            if not merchant or norm(merchant).startswith(("סהכ", "סך", "total")):
                continue
            amt, cur = parse_amount(_cell(row, hmap, "amount"))
            oamt, ocur = parse_amount(_cell(row, hmap, "orig_amount"))
            ocur = currency_code(_cell(row, hmap, "orig_currency")) or ocur
            kind_bank = "credit_card"
            if amt is None and ("debit" in hmap or "credit" in hmap):
                kind_bank = "bank"
                deb, _ = parse_amount(_cell(row, hmap, "debit"))
                cre, _ = parse_amount(_cell(row, hmap, "credit"))
                amt = (abs(deb) if deb else 0.0) - (abs(cre) if cre else 0.0)
                if not deb and not cre:
                    continue
            elif amt is None and "generic_amount" in hmap:
                amt, cur = parse_amount(_cell(row, hmap, "generic_amount"))
                if "balance" in hmap:
                    kind_bank = "bank"
                    amt = -amt if amt is not None else None   # bank: negative = money out
            if amt is None:
                # not yet charged (pending) rows: fall back to the original ILS amount
                if oamt is not None and (ocur in (None, "ILS")):
                    amt = oamt
                else:
                    continue
            txn_type = _cell(row, hmap, "txn_type")
            notes = _cell(row, hmap, "notes")
            kind, no, total = classify_type(txn_type, notes, merchant)
            if kind == "refund" and amt > 0:
                amt = -amt
            cd = parse_date(_cell(row, hmap, "charge_date"))
            card = _cell(row, hmap, "card")
            card = re.sub(r"\D", "", str(card))[-4:] if card is not None else ""
            card = card or (card_ctx or "")
            if kind_bank == "bank":
                card = card or "bank"
            if not ocur and oamt is not None and section and re.search(r"חו\"?ל|מט\"?ח", section):
                ocur = "FX"
            out.append({
                "date": d.isoformat(), "charge_date": cd.isoformat() if cd else "",
                "month": (cd or d).strftime("%Y-%m"), "merchant": re.sub(r"\s+", " ", merchant),
                "amount": round(amt, 2), "orig_amount": "" if oamt is None else round(oamt, 2),
                "orig_currency": ocur or "", "card": card, "txn_type": kind,
                "installment_no": no or "", "installment_total": total or "",
                "issuer_category": str(_cell(row, hmap, "issuer_category") or "").strip(),
                "notes": str(notes or "").strip(), "issuer": "bank" if kind_bank == "bank" else issuer,
                "kind": kind_bank,
                "source_file": os.path.basename(path), "sheet": str(sheet), "row": r_i + 1,
            })
    return out


def _cell(row, hmap, field):
    i = hmap.get(field)
    if i is None or i >= len(row):
        return None
    v = row[i]
    if isinstance(v, float) and pd.isna(v):
        return None
    return v


def dedupe(rows):
    """Overlapping exports (same month downloaded twice, or Max + a bank file) repeat rows. Keep,
    for each identical key, the largest count seen in any single file, so two genuine identical
    coffees in one file both stay."""
    def key(r):
        return (r["date"], norm(r["merchant"]), r["amount"], r["card"], r["installment_no"])
    per_file = {}
    for r in rows:
        per_file.setdefault(key(r), {}).setdefault(r["source_file"], []).append(r)
    kept = []
    for files in per_file.values():
        best = max(files.values(), key=len)
        kept.extend(best)
    kept.sort(key=lambda r: (r["date"], r["merchant"]))
    return kept, len(rows) - len(kept)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+")
    ap.add_argument("-o", "--out", default="finance/out/transactions.csv")
    a = ap.parse_args()
    rows = []
    for p in a.files:
        try:
            got = parse_file(p)
        except Exception as e:   # one unreadable file should not sink the rest
            print(f"!! {p}: {e}", file=sys.stderr)
            continue
        issuers = sorted({r["issuer"] for r in got}) or ["-"]
        span = f"{min(r['date'] for r in got)} .. {max(r['date'] for r in got)}" if got else "-"
        print(f"{os.path.basename(p)}: {len(got)} rows, issuer {','.join(issuers)}, {span}")
        if not got:
            print("   no header row recognised - open the file and add its header wording to SYNONYMS",
                  file=sys.stderr)
        rows.extend(got)
    rows, dropped = dedupe(rows)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"-> {a.out}: {len(rows)} transactions ({dropped} duplicates across files removed)")


if __name__ == "__main__":
    main()
