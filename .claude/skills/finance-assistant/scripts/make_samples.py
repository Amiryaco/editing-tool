#!/usr/bin/env python3
"""Synthetic statements in the shapes the issuers export (Max .xlsx with title rows and several
sheets, Isracard HTML-as-.xls with domestic/abroad sections per card, Cal .xlsx with '₪ 12.30'
text amounts, a bank .csv with debit/credit columns). For testing the parser and analysis only -
the merchants and amounts are made up.

    python3 make_samples.py /tmp/fin-samples
"""
import datetime as dt
import os
import random
import sys

import pandas as pd

random.seed(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else "finance/samples"
os.makedirs(OUT, exist_ok=True)
MONTHS = [(2026, m) for m in range(3, 10)]          # 7 billing months


def day(y, m, d):
    return dt.date(y, m, min(d, 28))


# ---------- Max (personal + business card) ----------
max_rows = []
for y, m in MONTHS:
    charge = day(y, m, 10)
    py, pm = (y, m - 1)
    for d in sorted(random.sample(range(1, 28), 9)):
        max_rows.append([day(py, pm, d), "שופרסל דיל רמת גן", "מזון וצריכה", "4321", "רגילה",
                         round(random.uniform(120, 520), 2), "₪", None, None, charge, "", ""])
    for d in random.sample(range(1, 28), 6):
        max_rows.append([day(py, pm, d), "WOLT", "מסעדות, קפה וברים", "4321", "רגילה",
                         round(random.uniform(70, 190), 2), "₪", None, None, charge, "", ""])
    max_rows.append([day(py, pm, 3), "NETFLIX.COM", "פנאי, בידור וספורט", "4321", "הוראת קבע",
                     54.9 if m < 7 else 64.9, "₪", None, None, charge, "", ""])
    max_rows.append([day(py, pm, 5), "פלאפון תקשורת", "שירותי תקשורת", "4321", "הוראת קבע", 89.0, "₪",
                     None, None, charge, "", ""])
    max_rows.append([day(py, pm, 7), "הראל ביטוח רכב", "ביטוח", "4321", "הוראת קבע", 412.0, "₪", None, None,
                     charge, "", ""])
    max_rows.append([day(py, pm, 9), "פז אפליקציה", "דלק, חשמל וגז", "4321", "רגילה",
                     round(random.uniform(250, 380), 2), "₪", None, None, charge, "", ""])
    max_rows.append([day(py, pm, 12), "קפה קפה", "מסעדות, קפה וברים", "4321", "רגילה",
                     round(random.uniform(90, 260), 2), "₪", None, None, charge, "", ""])
    # business card
    max_rows.append([day(py, pm, 2), "FACEBK *ADS 7Y2K9", "שונות", "8765", "רגילה",
                     round(random.uniform(800, 1400) * (2.2 if m == 8 else 1), 2), "₪", None, None, charge, "", ""])
    max_rows.append([day(py, pm, 4), "WIX.COM 1234567", "שונות", "8765", "הוראת קבע", 119.0, "₪", None, None,
                     charge, "", ""])
    max_rows.append([day(py, pm, 6), "חשבונית ירוקה", "שונות", "8765", "הוראת קבע", 59.0, "₪", None, None,
                     charge, "", ""])
    # installments: a laptop bought in March, 12 payments
    if (y, m) >= (2026, 4):
        n = m - 3
        max_rows.append([dt.date(2026, 3, 15), "KSP מחשבים", "חשמל ומחשבים", "8765", "תשלומים", 541.67, "₪",
                         6500.0, "₪", charge, f"תשלום {n} מתוך 12", ""])
# a one-off big purchase and a double charge
max_rows.append([dt.date(2026, 6, 20), "איקאה נתניה", "עיצוב הבית", "4321", "רגילה", 3890.0, "₪", None, None,
                 dt.date(2026, 7, 10), "", ""])
max_rows.append([dt.date(2026, 8, 11), "סופר פארם דיזנגוף", "רפואה ובתי מרקחת", "4321", "רגילה", 186.4, "₪",
                 None, None, dt.date(2026, 9, 10), "", ""])
max_rows.append([dt.date(2026, 8, 11), "סופר פארם דיזנגוף", "רפואה ובתי מרקחת", "4321", "רגילה", 186.4, "₪",
                 None, None, dt.date(2026, 9, 10), "", ""])
max_rows.append([dt.date(2026, 7, 2), "זיכוי איקאה נתניה", "עיצוב הבית", "4321", "זיכוי", -290.0, "₪", None, None,
                 dt.date(2026, 8, 10), "", ""])
hdr = ["תאריך עסקה", "שם בית העסק", "קטגוריה", "4 ספרות אחרונות של כרטיס האשראי", "סוג עסקה", "סכום חיוב",
       "מטבע חיוב", "סכום עסקה מקורי", "מטבע עסקה מקורי", "תאריך חיוב", "הערות", "תיוגים"]
foreign = [[dt.date(2026, mo - 1, 14), "OPENAI *CHATGPT SUBSCR", "שונות", "8765", "הוראת קבע", 74.5, "₪", 20.0,
            "USD", dt.date(2026, mo, 10), "", ""] for (_, mo) in MONTHS]
foreign += [[dt.date(2026, mo - 1, 18), "CAPCUT PRO", "שונות", "8765", "הוראת קבע", 36.9, "₪", 9.99,
             "USD", dt.date(2026, mo, 10), "", ""] for (_, mo) in MONTHS[2:]]
with pd.ExcelWriter(os.path.join(OUT, "transaction-details_export_max.xlsx")) as xw:
    for name, rows in (("עסקאות במועד החיוב", max_rows), ("עסקאות חו\"ל ומט\"ח", foreign)):
        top = pd.DataFrame([["כל המשתמשים (1)"], ["כל הכרטיסים (2)"], ["03/2026 - 09/2026"], [None]])
        top.to_excel(xw, sheet_name=name, header=False, index=False)
        body = pd.DataFrame([[r[0].strftime("%d-%m-%Y"), *r[1:9], r[9].strftime("%d-%m-%Y"), *r[10:]] for r in rows],
                            columns=hdr)
        body.to_excel(xw, sheet_name=name, startrow=4, index=False)
        pd.DataFrame([["סך הכל", None, None, None, None, round(sum(r[5] for r in rows), 2)]]).to_excel(
            xw, sheet_name=name, startrow=6 + len(rows), header=False, index=False)

# ---------- Isracard (HTML table saved as .xls, two sections per card) ----------
def table(rows):
    return "<table>" + "".join("<tr>" + "".join(f"<td>{'' if c is None else c}</td>" for c in r) + "</tr>"
                               for r in rows) + "</table>"


isr = [["ישראכרט - פירוט עסקאות"], ["כרטיס מסטרקארד המסתיים ב-1122"], ["עסקאות בארץ"],
       ["תאריך רכישה", "שם בית עסק", "סכום עסקה", "מטבע עסקה", "סכום חיוב", "מטבע חיוב", "מס' שובר", "פירוט נוסף"]]
for y, m in MONTHS:
    isr.append([day(y, m - 1, 8).strftime("%d/%m/%y"), "רמי לוי שיווק השקמה", f"{random.uniform(300, 700):.2f}",
                "₪", None, "₪", "123456", ""])
    isr[-1][4] = isr[-1][2]
    isr.append([day(y, m - 1, 21).strftime("%d/%m/%y"), "הולמס פלייס", "249.00", "₪", "249.00", "₪", "222", "הוראת קבע"])
    isr.append([day(y, m - 1, 25).strftime("%d/%m/%y"), "פנגו מוביליטי", f"{random.uniform(40, 120):.2f}", "₪", None, "₪", "", ""])
    isr[-1][4] = isr[-1][2]
isr += [["סך חיוב בש\"ח:", None, None, None, "12,345.00"], [None], ["עסקאות בחו\"ל"],
        ["תאריך רכישה", "תאריך חיוב", "שם בית עסק", "עיר", "סכום מקורי", "מטבע מקור", "סכום חיוב", "מטבע לחיוב"],
        ["14/06/26", "10/07/26", "BOOKING.COM HOTEL", "AMSTERDAM", "612.00", "EUR", "2,488.30", "₪"],
        ["15/06/26", "10/07/26", "ALBERT HEIJN", "AMSTERDAM", "48.20", "EUR", "196.10", "₪"],
        ["03/09/26", "10/10/26", "SOMETHING UNKNOWN LLC", "DOVER", "29.00", "USD", "107.90", "₪"]]
with open(os.path.join(OUT, "Export_Isracard_1122.xls"), "w", encoding="utf-8") as fh:
    fh.write("<html><head><meta charset='utf-8'></head><body>" + table(isr) + "</body></html>")

# ---------- Cal (xlsx, text amounts with ₪) ----------
cal = [["פירוט עסקאות לכרטיס ויזה המסתיים ב-5566"], [None],
       ["תאריך עסקה", "שם בית עסק", "סכום עסקה", "סכום חיוב", "סוג עסקה", "ענף", "הערות"]]
for y, m in MONTHS:
    cal.append([day(y, m - 1, 11).strftime("%d/%m/%Y"), "SPOTIFY P1A2B3", "₪ 23.90", "₪ 23.90", "הוראת קבע", "שונות", ""])
    cal.append([day(y, m - 1, 16).strftime("%d/%m/%Y"), "מסעדת הדסון", f"₪ {random.uniform(180, 420):,.2f}", None,
                "רגילה", "מסעדות", ""])
    cal[-1][3] = cal[-1][2]
    cal.append([day(y, m - 1, 19).strftime("%d/%m/%Y"), "גולדה גלידה", "₪ 42.00", "₪ 42.00", "רגילה", "מזון מהיר", ""])
cal.append(["22/08/2026", "קסטרו קניון עזריאלי", "₪ 1,260.00", "₪ 420.00", "תשלומים", "אופנה", "תשלום 1 מתוך 3"])
cal.append(["22/08/2026", "קסטרו קניון עזריאלי", "₪ 1,260.00", "₪ 420.00", "תשלומים", "אופנה", "תשלום 2 מתוך 3"])
pd.DataFrame(cal).to_excel(os.path.join(OUT, "cal_5566.xlsx"), header=False, index=False)

# ---------- bank current account (csv, debit/credit) ----------
bank = [["תאריך", "תאריך ערך", "תיאור", "אסמכתא", "חובה", "זכות", "יתרה בש\"ח"]]
bal = 18000.0
for y, m in MONTHS:
    for desc, deb, cre in (("משכורת חברת ABC", None, 14200.0), ("העברה מלקוח - סטודיו לוטוס", None, 9500.0),
                           ("ישראכרט", 2100.0, None), ("מקס איט פיננסים", 6800.0, None),
                           ("שכר דירה - הוראת קבע", 5200.0, None), ("ביטוח לאומי", 780.0, None),
                           ("עמלת פעולה", 6.9, None), ("ארנונה עיריית תל אביב", 640.0, None)):
        bal += (cre or 0) - (deb or 0)
        bank.append([day(y, m, 1).strftime("%d/%m/%Y"), day(y, m, 2).strftime("%d/%m/%Y"), desc, "99881",
                     f"{deb:,.2f}" if deb else "", f"{cre:,.2f}" if cre else "", f"{bal:,.2f}"])
pd.DataFrame(bank[1:], columns=bank[0]).to_csv(os.path.join(OUT, "bank_leumi.csv"), index=False, encoding="cp1255")
print("samples ->", OUT, sorted(os.listdir(OUT)))
