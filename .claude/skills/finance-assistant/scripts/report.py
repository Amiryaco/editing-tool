#!/usr/bin/env python3
"""Turn analysis.json into a self-contained Hebrew (RTL) HTML dashboard: headline tiles, monthly
spend split personal/business, categories, fixed charges and subscriptions, future installments,
anomalies, business items to confirm, and the plan (when plan.json exists next to it).

    python3 report.py finance/out/analysis.json -o finance/out/report.html [--plan finance/out/plan.json]

plan.json (written by the assistant after the conversation with the user) is optional:
  {"summary": "...", "goals": ["..."], "actions": [{"title": "...", "saving": 250, "detail": "..."}],
   "budget": {"קטגוריה": 1200}, "business_notes": ["..."]}
"""
import argparse
import html
import json
import os

CSS = """
:root{--surface:#fcfcfb;--card:#ffffff;--ink:#0b0b0b;--ink2:#52514e;--muted:#8a8984;--line:#e6e5e0;
--s1:#2a78d6;--s2:#eb6834;--good:#1b8a4c;--warn:#b26b00;--bad:#c62f2f;--chip:#f0efec}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--surface:#1a1a19;--card:#232321;
--ink:#ffffff;--ink2:#c3c2b7;--muted:#8f8e86;--line:#383835;--s1:#3987e5;--s2:#d95926;--good:#3fb871;
--warn:#e0a030;--bad:#ef6b6b;--chip:#2e2e2b}}
:root[data-theme="dark"]{--surface:#1a1a19;--card:#232321;--ink:#ffffff;--ink2:#c3c2b7;--muted:#8f8e86;
--line:#383835;--s1:#3987e5;--s2:#d95926;--good:#3fb871;--warn:#e0a030;--bad:#ef6b6b;--chip:#2e2e2b}
*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);
font-family:Heebo,Rubik,Arial,sans-serif;line-height:1.5}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:36px 0 12px}
.sub{color:var(--ink2);margin:0 0 20px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.tile b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.tile span{color:var(--ink2);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:right;padding:7px 8px;
border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--ink2);font-weight:600}
td.n,th.n{text-align:left;font-variant-numeric:tabular-nums}
.legend{display:flex;gap:16px;font-size:13px;color:var(--ink2);margin-bottom:6px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-left:6px;vertical-align:middle}
.chip{display:inline-block;background:var(--chip);border-radius:99px;padding:1px 9px;font-size:12px;color:var(--ink2)}
.sev{font-weight:600}.sev.high{color:var(--bad)}.sev.medium{color:var(--warn)}.sev.low{color:var(--ink2)}
.note{color:var(--muted);font-size:13px;margin-top:8px}
.hb{display:flex;align-items:center;gap:10px;padding:3px 0;font-size:14px}
.hl{flex:0 0 38%;max-width:240px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ht{flex:1;display:flex;align-items:center;gap:6px}.ht i{display:block;height:14px;border-radius:3px 0 0 3px}
.ht em{font-style:normal;color:var(--ink2);font-variant-numeric:tabular-nums;font-size:13px}
.card svg{min-width:520px}svg{direction:ltr}svg text{fill:var(--ink2);font-size:12px;font-family:inherit}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--surface);padding:6px 10px;
border-radius:8px;font-size:13px;display:none;z-index:9;white-space:nowrap}
.plan li{margin-bottom:8px}.save{color:var(--good);font-weight:600}
"""

JS = """
const tip=document.getElementById('tip');
document.querySelectorAll('[data-tip]').forEach(el=>{
 el.addEventListener('mousemove',e=>{tip.textContent=el.dataset.tip;tip.style.display='block';
  tip.style.left=Math.min(e.clientX+12,innerWidth-tip.offsetWidth-8)+'px';tip.style.top=(e.clientY+14)+'px'});
 el.addEventListener('mouseleave',()=>tip.style.display='none');});
"""

TYPE_HE = {"big_purchase": "רכישה גדולה", "category_spike": "קפיצה בקטגוריה", "new_merchant": "בית עסק חדש",
           "possible_duplicate": "חיוב כפול?", "price_increase": "התייקרות"}
SEV_HE = {"high": "▲ גבוה", "medium": "● בינוני", "low": "○ נמוך"}
SCOPE_HE = {"personal": "פרטי", "business": "עסקי", "business?": "עסקי (לאישור)", "mixed": "מעורב"}


def e(x):
    return html.escape(str(x))


def ils(v):
    return f"{round(v):,} ₪"


def monthly_chart(monthly):
    w, h, pad_b, pad_t = 760, 240, 28, 16
    keys = [("personal", "פרטי", "var(--s1)"), ("business", "עסקי", "var(--s2)")]
    rows = []
    for m in monthly:
        p = m.get("personal", 0) + m.get("mixed", 0)
        b = m.get("business", 0) + m.get("business?", 0)
        rows.append((m["month"], max(p, 0), max(b, 0)))
    top = max((p + b for _, p, b in rows), default=1) or 1
    n = len(rows)
    slot = w / max(n, 1)
    bw = min(46, slot * 0.6)
    sc = (h - pad_b - pad_t) / top
    out = [f'<svg viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="הוצאות לפי חודש">']
    for frac in (0.5, 1.0):
        y = h - pad_b - top * frac * sc
        out.append(f'<line x1="0" x2="{w}" y1="{y:.1f}" y2="{y:.1f}" stroke="var(--line)"/>'
                   f'<text x="{w - 2}" y="{y - 4:.1f}" text-anchor="end">{round(top * frac):,}</text>')
    for i, (m, p, b) in enumerate(rows):
        x = w - (i + 0.5) * slot - bw / 2        # RTL: first month on the right
        y0 = h - pad_b
        hp, hb = p * sc, b * sc
        tipt = f"{m}: פרטי {round(p):,} ₪ · עסקי {round(b):,} ₪ · סה\"כ {round(p + b):,} ₪"
        out.append(f'<g data-tip="{e(tipt)}"><rect x="{x - 4:.1f}" y="{pad_t}" width="{bw + 8:.1f}" '
                   f'height="{h - pad_b - pad_t}" fill="transparent"/>')
        if hp > 0:
            out.append(f'<rect x="{x:.1f}" y="{y0 - hp:.1f}" width="{bw:.1f}" height="{hp:.1f}" fill="{keys[0][2]}"/>')
        if hb > 0:
            yb = y0 - hp - hb - (2 if hp > 0 else 0)
            out.append(f'<rect x="{x:.1f}" y="{yb:.1f}" width="{bw:.1f}" height="{hb:.1f}" rx="4" fill="{keys[1][2]}"/>'
                       f'<rect x="{x:.1f}" y="{yb + hb - 4:.1f}" width="{bw:.1f}" height="4" fill="{keys[1][2]}"/>')
        out.append(f'</g><text x="{x + bw / 2:.1f}" y="{h - 8}" text-anchor="middle">{m[2:]}</text>')
    out.append("</svg>")
    legend = "".join(f'<span><i style="background:{c}"></i>{lab}</span>' for _, lab, c in keys)
    return f'<div class="legend">{legend}</div>' + "".join(out)


def hbar(rows, color="var(--s1)"):
    """rows: [(label, value, tooltip)] - horizontal bars as HTML (RTL-native, readable on phones)."""
    if not rows:
        return '<p class="note">אין נתונים</p>'
    top = max(v for _, v, _ in rows) or 1
    out = []
    for lab, v, t in rows:
        pct = max(100 * v / top, 0.6)
        out.append(f'<div class="hb" data-tip="{e(t)}"><span class="hl">{e(lab)}</span>'
                   f'<span class="ht"><i style="width:{pct:.1f}%;background:{color}"></i>'
                   f'<em>{round(v):,}</em></span></div>')
    return "".join(out)


def table(headers, rows, num_cols=()):
    th = "".join(f'<th class="{"n" if i in num_cols else ""}">{e(x)}</th>' for i, x in enumerate(headers))
    body = "".join("<tr>" + "".join(f'<td class="{"n" if i in num_cols else ""}">{c}</td>' for i, c in enumerate(r))
                   + "</tr>" for r in rows)
    return f'<div class="card"><table><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>'


def build(a, plan):
    t, o, biz, inst = a["totals"], a["opportunities"], a["business"], a["installments"]
    per = a["period"]
    parts = [f'<h1>תמונת מצב פיננסית</h1><p class="sub">{e(per["first"])} עד {e(per["last"])} · '
             f'{per["n_months"]} חודשי חיוב · {len(a["sources"])} קבצים'
             + (f' · חודשים חלקיים שלא נכנסו לממוצע: {e(", ".join(per["partial_months"]))}' if per["partial_months"] else "")
             + '</p>']
    tiles = [(ils(t["monthly_avg"]), "ממוצע הוצאה חודשי"),
             (ils(t["last_month"]), f'חודש אחרון מלא ({t.get("last_full_month", "")})'),
             (ils(o["fixed_monthly"]), "חיובים קבועים פעילים בחודש"),
             (ils(inst["remaining_total"]), "נשאר לשלם בתשלומים"),
             (ils(biz["monthly_avg"]), "הוצאה עסקית בחודש (כולל לאישור)"),
             (f'{a["uncategorized_share"]}%', "לא מסווג")]
    parts.append('<div class="tiles">' + "".join(f'<div class="tile"><b>{v}</b><span>{lab}</span></div>'
                                                  for v, lab in tiles) + "</div>")

    if plan:
        acts = "".join(f'<li><b>{e(x.get("title", ""))}</b>'
                       + (f' <span class="save">· חיסכון של כ-{ils(x["saving"])} בחודש</span>' if x.get("saving") else "")
                       + (f'<br><span class="note">{e(x["detail"])}</span>' if x.get("detail") else "") + "</li>"
                       for x in plan.get("actions", []))
        goals = "".join(f"<li>{e(g)}</li>" for g in plan.get("goals", []))
        parts.append('<h2>התכנית</h2><div class="card plan">'
                     + (f'<p>{e(plan["summary"])}</p>' if plan.get("summary") else "")
                     + (f"<h3>יעדים</h3><ul>{goals}</ul>" if goals else "")
                     + (f"<h3>צעדים</h3><ol>{acts}</ol>" if acts else "") + "</div>")
        if plan.get("budget"):
            base = {b["category"]: b for b in a["budget_baseline"]}
            rows = [[e(c), ils(base.get(c, {}).get("avg", 0)), ils(v)] for c, v in plan["budget"].items()]
            parts.append("<h2>תקציב חודשי</h2>" + table(["קטגוריה", "היום (ממוצע)", "יעד"], rows, (1, 2)))

    parts.append('<h2>הוצאות לפי חודש</h2><div class="card">' + monthly_chart(a["monthly"]) + "</div>")

    cats = [(b["category"], b["avg"], f'{b["category"]}: ממוצע {b["avg"]:,} ₪ · חציון {b["median"]:,} ₪ · '
             f'חודש אחרון {b["last"]:,} ₪ · שיא {b["max"]:,} ₪') for b in a["budget_baseline"] if b["avg"] > 0][:18]
    parts.append('<h2>על מה הולך הכסף (ממוצע לחודש)</h2><div class="card">' + hbar(cats) + "</div>")

    if a.get("forecast"):
        rows = [[e(f["month"]), ils(f["fixed"]), ils(f["installments"]),
                 ils(f["yearly_due"]) + (f' <span class="chip">{e(", ".join(f["yearly_items"]))}</span>' if f["yearly_items"] else ""),
                 ils(f["variable_typical"]), f'<b>{ils(f["total"])}</b>'] for f in a["forecast"]]
        parts.append("<h2>מה צפוי בחיובים הקרובים</h2>"
                     + table(["חודש חיוב", "קבועות", "תשלומים", "שנתיים", "משתנות (חודש רגיל)", "צפי"], rows, (1, 2, 3, 4, 5))
                     + '<p class="note">קבועות ותשלומים כבר מחויבים. החלק המשתנה הוא החציון של החודשים הקודמים, לכן חודש עם רכישה גדולה יהיה מעליו.</p>')

    if a["anomalies"]:
        rows = [[f'<span class="sev {x["severity"]}">{SEV_HE[x["severity"]]}</span>', e(TYPE_HE.get(x["type"], x["type"])),
                 e(x.get("merchant") or x.get("category", "")), e(x.get("date") or x.get("month", "")),
                 ils(x.get("amount", 0)), e(x["detail"])] for x in a["anomalies"]]
        parts.append("<h2>חריגות ודברים שכדאי לבדוק</h2>"
                     + table(["חומרה", "סוג", "בית עסק / קטגוריה", "מתי", "סכום", "פירוט"], rows, (4,)))

    rec = [r for r in a["recurring"] if r["active"]]
    if rec:
        rows = [[e(r["merchant"]), e(r["category"]), e(SCOPE_HE.get(r["scope"], r["scope"])),
                 "שנתי" if r["frequency"] == "yearly" else "חודשי", ils(r["typical"]), ils(r["annual_cost"]),
                 (f'<span class="sev medium">+{r["price_change"]["pct"]}%</span>' if r["price_change"] else "")]
                for r in rec]
        parts.append(f'<h2>חיובים קבועים ומנויים פעילים · {ils(o["fixed_monthly"])} בחודש</h2>'
                     + table(["בית עסק", "קטגוריה", "שייך ל", "תדירות", "חיוב רגיל", "בשנה", "שינוי מחיר"], rows, (4, 5)))

    if inst["plans"]:
        fut = inst["future_by_month"]
        parts.append(f'<h2>תשלומים שעוד יגיעו · {ils(inst["remaining_total"])}</h2>')
        if fut:
            parts.append('<div class="card">' + hbar([(m, v, f"{m}: {round(v):,} ₪ בתשלומים") for m, v in fut.items()],
                                                       "var(--s2)") + "</div>")
        rows = [[e(p["merchant"]), e(p["purchase_date"]), f'{p["paid_no"]}/{p["total_no"]}', ils(p["monthly"]),
                 ils(p["remaining_amount"]), e(p["ends"])] for p in inst["plans"]]
        parts.append(table(["בית עסק", "נרכש", "תשלום", "לחודש", "נשאר", "מסתיים"], rows, (3, 4)))

    if biz["to_confirm"] or biz["by_category"]:
        rows = [[e(x["merchant"]), e(x["category"]), e(x["cards"]), ils(x["total"])] for x in biz["to_confirm"]]
        parts.append("<h2>העסק</h2>" + hbar([(c, v, f"{c}: {v:,} ₪ בתקופה") for c, v in biz["by_category"].items()], "var(--s2)")
                     + (("<h3>לאשר כהוצאה עסקית</h3>" + table(["בית עסק", "קטגוריה", "כרטיס", "סה\"כ"], rows, (3,)))
                        if rows else "")
                     + f'<p class="note">מע"מ תשומות אפשרי (תקרה עליונה, רק לעוסק מורשה, רק מול חשבונית מס ורק על החלק המוכר): '
                       f'עד {ils(biz["input_vat_upper_bound_domestic"])}. הוצאות עסקיות במט"ח: {ils(biz["foreign_total"])}. '
                       'לאמת מול רואה החשבון.</p>')

    tm = [[e(x["merchant"]), e(x["category"]), str(x["count"]), ils(x["monthly_avg"]), ils(x["total"])]
          for x in a["top_merchants"][:15]]
    parts.append("<h2>בתי העסק שהכי הרבה כסף הולך אליהם</h2>"
                 + table(["בית עסק", "קטגוריה", "עסקאות", "לחודש", "סה\"כ"], tm, (2, 3, 4)))
    if a["uncategorized"]:
        rows = [[e(x["merchant"]), str(x["count"]), ils(x["total"])] for x in a["uncategorized"][:20]]
        parts.append("<h2>לא מסווג (צריך את עזרתך)</h2>" + table(["בית עסק", "עסקאות", "סה\"כ"], rows, (1, 2)))
    parts.append('<p class="note">כל המספרים מחושבים מקובצי הפירוט בלבד. החודש הוא חודש החיוב כשהקובץ כולל תאריך חיוב, '
                 'אחרת חודש הרכישה. זה לא ייעוץ מס או השקעות.</p>')
    return ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1"><title>תמונת מצב פיננסית</title>'
            f'<style>{CSS}</style></head><body><main>{"".join(parts)}</main><div id="tip"></div>'
            f'<script>{JS}</script></body></html>')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("analysis")
    ap.add_argument("-o", "--out", default=None)
    ap.add_argument("--plan", default=None)
    a = ap.parse_args()
    with open(a.analysis, encoding="utf-8") as fh:
        data = json.load(fh)
    plan_path = a.plan or os.path.join(os.path.dirname(a.analysis), "plan.json")
    plan = None
    if os.path.exists(plan_path):
        with open(plan_path, encoding="utf-8") as fh:
            plan = json.load(fh)
    out = a.out or os.path.join(os.path.dirname(a.analysis), "report.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(build(data, plan))
    print("->", out)


if __name__ == "__main__":
    main()
