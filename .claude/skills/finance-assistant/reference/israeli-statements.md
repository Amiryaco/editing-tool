# Israeli card and bank exports

The issuers do not publish their export layouts, and they change them. The parser therefore does not
hard-code any layout: it finds header rows by wording. This page records what is known and what to
watch for. When a real file differs, add its header wording to `SYNONYMS` in `parse_statements.py`
and note it here.

## Exporting (ask the user to do this)

| Issuer | Where | Notes |
|---|---|---|
| **Max** (formerly Leumi Card) | max.co.il → personal area → "פירוט החיובים והעסקאות" → download to Excel | .xlsx, title rows above the header, separate sheets for regular, foreign-currency and immediate-debit transactions. Columns typically: תאריך עסקה, שם בית העסק, קטגוריה, 4 ספרות אחרונות של כרטיס האשראי, סוג עסקה, סכום חיוב, מטבע חיוב, סכום עסקה מקורי, מטבע עסקה מקורי, תאריך חיוב, הערות (installments appear as "תשלום 2 מתוך 6"). |
| **Isracard / American Express** | digital.isracard.co.il / americanexpress.co.il → personal area → פירוט חיובים → download | Saves an `.xls` that is often an HTML table. One section per card ("…המסתיים ב-1234"), a domestic section (תאריך רכישה, שם בית עסק, סכום עסקה, סכום חיוב, מס' שובר, פירוט נוסף) and an abroad section (with תאריך חיוב, סכום מקורי, מטבע מקור), and total rows. Up to ~2 years back. |
| **Cal** (Visa Cal, Diners) | cal-online.co.il → פירוט עסקאות → ייצוא לאקסל (site or app) | Searchable by merchant, date range, amount, domestic/abroad; history about 1.5 years by billing date. Amounts may be text like "₪ 1,234.50"; branch column "ענף". |
| **Banks** (Hapoalim, Leumi, Discount, Mizrahi, …) | online banking → עו"ש → תנועות → ייצוא לאקסל | Usually תאריך, תאריך ערך, תיאור/הפעולה, אסמכתא, חובה, זכות, יתרה. Some ship one signed "סכום" column. |

Ask for every card, including the business one and any card of a partner that shares the household
budget, and 6–12 months. PDF statements are a last resort: copy-paste or PDF-to-Excel scrambles
Hebrew order and splits columns.

Automated alternatives the user may already use (all scrape with the user's bank passwords, so only
on a machine they trust): `israeli-bank-scrapers` (the open-source library behind most tools),
Caspion (desktop app, rule-based categories, exports to Sheets/YNAB/CSV), Moneyman (scheduled, to
Google Sheets), Firefly III and Actual Budget importers; and commercial RiseUp (open-banking,
alerts on double charges and changed standing orders). A CSV/Sheets export from any of them can be
fed to `parse_statements.py` too.

## Pitfalls the analysis already handles (and you should explain)

- **Billing month vs purchase date.** A card bill on the 10th covers purchases from the previous
  cycle. "This month's bill" = purchases mostly from last month + standing orders + installments.
- **Installments (תשלומים) and credit (קרדיט).** Each month shows one payment; the purchase keeps
  costing money for months. קרדיט deals usually carry interest. `installments.plans` lists what is
  still to come and when each ends (money freed).
- **Standing orders on the card (הוראת קבע).** Issuers must mark recurring deals on the statement
  (Bank of Israel directive 470); the parser reads that from סוג עסקה.
- **Foreign currency.** Charged in ILS at the issuer's rate plus a conversion fee (check the card's
  fee schedule; do not quote a number you have not seen on the statement).
- **Pending rows** with no charge amount yet use the original ILS amount.
- **The card bill in the bank account** would double count every purchase; it is excluded when card
  files are present.
- **Bit / PayBox / PayPal** lines hide the real purpose; ask about the big ones.
- **Overlapping downloads** repeat rows; the parser keeps one copy (but keeps two genuine identical
  purchases within one file).
- **Descriptor ≠ brand.** The merchant name on the statement is the business's billing descriptor
  (e.g. "FACEBK *ADS"), which may differ from the brand name.
- **Disputes.** A charge higher than agreed or not authorised: write to the issuer within 30 days
  of the statement (Israel Consumer Council guidance). Possible double charges in `anomalies` are
  candidates, not proof.
