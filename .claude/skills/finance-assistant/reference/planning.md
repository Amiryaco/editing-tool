# Building the plan

The plan is short, specific, and agreed with the user. Every saving is tied to a line in the data.

## Steps

1. **Baseline.** Average and median month (`totals`), split business / personal (`monthly`), and
   income if known (`user_income`, bank `income_seen`). Monthly gap = income − spending.
2. **Sort the spending into four kinds** (`budget_baseline[].nature` and `recurring`):
   - *Fixed* (rent, insurance, phone, arnona, standing orders): change by renegotiating or
     switching, once.
   - *Committed* (installments): already spent; show when each ends and the money it frees.
   - *Irregular* (`irregular: true`: clothes, furniture, flights, yearly renewals): the surprise
     makers. Turn each into a monthly set-aside (its average) in a separate "sinking fund".
   - *Variable* (groceries, eating out, delivery, shopping): weekly habits; this is where targets go.
3. **Find the money**, in this order (cheapest effort first):
   - subscriptions and tools not used or duplicated (`recurring`, scope and category);
   - price increases on fixed charges: call and negotiate or switch (phone, insurance, internet);
   - fees, interest, foreign-currency charges (`opportunities`);
   - installments/credit: stop opening new ones while the old ones run;
   - variable categories: `suggested_target` is 15% under the median; agree a number the user
     believes in and one concrete habit per category (e.g. "delivery twice a week, not five times").
4. **Set the budget**: per category, the agreed monthly number. Fixed + set-asides + variable
   targets must fit inside income (personal) / revenue minus tax reserve (business).
5. **Safety net**: an emergency fund of 3–6 months of essential spending (closer to 6 for a business
   owner with variable income), built from the savings found above.
6. **Routine**: a monthly 15-minute review with the new statement (step 7 in SKILL.md) and one
   weekly glance at the card app for the variable categories.

## plan.json

```json
{
  "summary": "two or three sentences: the situation and the direction",
  "goals": ["save 1,500 ₪/month into an emergency fund by March", "business tools under 600 ₪/month"],
  "actions": [
    {"title": "cancel the second streaming service", "saving": 55, "detail": "NETFLIX + DISNEY both active, 1,320 ₪/year"},
    {"title": "call the phone company about the price rise", "saving": 30, "detail": "89 → 119 ₪ since June"}
  ],
  "budget": {"סופר ומזון": 2800, "משלוחי אוכל": 500, "מסעדות ובתי קפה": 400},
  "business_notes": ["map card 8765 as business", "ask the accountant about the car share"]
}
```

`saving` is monthly ₪ and must come from the data (a subscription's typical amount, the gap between
median and target). Leave it out when it cannot be measured.

## Tone

Plain Hebrew, no judgement, numbers rounded to the shekel, the biggest lever first, at most 5–7
actions. The user should finish reading knowing exactly what to do this week.
