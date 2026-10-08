# Business side: what to know (Israel, 2026)

Sources are tax-advisor guides and news sites, not the Tax Authority itself, and the rates change.
Use these to ask the right questions and flag items. **Every decision goes through the user's
accountant (רואה חשבון).** Researched October 2026.

## Status

| | עוסק פטור | עוסק מורשה | חברה בע"מ |
|---|---|---|---|
| VAT | does not charge or reclaim VAT | charges 18% and reclaims input VAT on business purchases with a tax invoice | like מורשה |
| Ceiling | annual turnover (gross receipts, not profit) up to about **122,833 ₪ in 2026**; above it registration as מורשה is mandatory | none | none |
| Still pays | income tax and National Insurance (ביטוח לאומי) advances | same | corporate tax; owner salary/dividends |

VAT is **18%** since January 2025.

## Recognised expenses (typical rates, verify)

| Expense | Income tax | Input VAT (מורשה) | Notes |
|---|---|---|---|
| Car (fuel, service, insurance, licence) | about 45% | about 2/3 | 25% VAT if mostly private use; depreciation ~15%/year |
| Mobile phone | partial (mixed use) | partial | a line used only for business: full |
| Home office | by share of floor area | by share | arnona, electricity, rent proportional |
| Refreshments at the business | sources disagree (20%–100%) | full | ask the accountant |
| Software, SaaS, ads, hosting, equipment | full when for the business | domestic with tax invoice: full | foreign SaaS has no Israeli VAT invoice; ask about reverse charge |
| Professional services (accountant, lawyer) | full | full | |
| Pension (קרן פנסיה) and study fund (קרן השתלמות) for self-employed | deduction/credit up to ceilings | — | worth checking every year before December |

`analysis.json → business.input_vat_upper_bound_domestic` is an **upper bound** (all domestic
business charges × 18/118). It counts only with a tax invoice, for an עוסק מורשה, and only the
recognised share. Present it as "up to", never as money owed back.

## Advice that is safe to give (no rates needed)

- **Separate business and personal**: one card and one account for the business. It makes the
  analysis, VAT and the annual report simple, and the "business?" list disappears.
- **Collect tax invoices** for every business card charge (the card statement is not an invoice);
  monthly, not in March.
- **Tax reserve**: move a fixed share of every receipt to a separate account for income tax, NI and
  (for מורשה) VAT, so advances never squeeze the household. The accountant sets the percentage.
- **Pay yourself a fixed monthly amount** from the business account to the personal one; the home
  budget runs on that number, the business keeps its own buffer.
- **Business buffer**: about 2–3 months of fixed business costs (`budget_baseline` rows with nature
  `business` and the business recurring charges give the number).
- **Review tools quarterly**: SaaS and AI tools pile up; `recurring` with scope business lists them
  with annual cost.
