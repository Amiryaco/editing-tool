"""Categories and merchant rules for Israeli card statements.

Order of precedence when categorising a transaction (see categorize()):
  1. the user's merchant_rules in finance/config.json (learned over time; always win)
  2. RULES below (keyword in the normalised merchant name)
  3. the issuer's own category column (Max "קטגוריה", Cal "ענף") via ISSUER_MAP
  4. "לא מסווג" - listed in the report for the assistant to resolve with the user.

Each category has a nature used by the plan:
  fixed        - same every month, contract-bound (rent, insurance, phone, standing orders)
  essential    - variable but needed (groceries, fuel, health)
  lifestyle    - variable and discretionary (restaurants, delivery, shopping, leisure)
  business     - cost of running the business
  financial    - fees, interest, cash, transfers (worth a separate look)
  excluded     - not spending (card bill paid from the bank, transfers between own accounts)
"""
import re

CATEGORIES = {
    "סופר ומזון": "essential",
    "מסעדות ובתי קפה": "lifestyle",
    "משלוחי אוכל": "lifestyle",
    "דלק": "essential",
    "חניה וכבישי אגרה": "essential",
    "רכב - ביטוח, טיפולים ורישוי": "fixed",
    "תחבורה ציבורית ומוניות": "essential",
    "סלולר, אינטרנט וטלוויזיה": "fixed",
    "מנויים דיגיטליים": "lifestyle",
    "תוכנה וכלי AI לעסק": "business",
    "פרסום ושיווק": "business",
    "אחסון, דומיינים ואתרים": "business",
    "ציוד משרדי ומחשבים": "business",
    "שירותים מקצועיים (רו\"ח, עו\"ד)": "business",
    "חשמל, מים וגז": "fixed",
    "ארנונה ומיסים": "fixed",
    "שכירות ומשכנתא": "fixed",
    "ביטוחים": "fixed",
    "בריאות ופארם": "essential",
    "טיפוח וקוסמטיקה": "lifestyle",
    "כושר וספורט": "lifestyle",
    "ביגוד והנעלה": "lifestyle",
    "בית, ריהוט ואלקטרוניקה": "lifestyle",
    "קניות אונליין": "lifestyle",
    "פנאי ובילוי": "lifestyle",
    "טיסות, נופש ומלונות": "lifestyle",
    "חינוך, קורסים וספרים": "essential",
    "ילדים": "essential",
    "חיות מחמד": "essential",
    "מתנות ותרומות": "lifestyle",
    "העברות (ביט/פייבוקס)": "financial",
    "משיכת מזומן": "financial",
    "עמלות, ריבית ודמי כרטיס": "financial",
    "מס הכנסה, מע\"מ וביטוח לאומי": "fixed",
    "הלוואות": "fixed",
    "חיסכון והשקעות": "financial",
    "הכנסות": "excluded",
    "תשלום כרטיס אשראי": "excluded",
    "לא מסווג": "lifestyle",
}

# (keywords, category, business_hint). Keywords are matched as substrings of the normalised name
# (upper-cased, Hebrew quotes removed). business_hint marks merchants that are usually business
# costs; they are suggested as business, never assumed.
RULES = [
    # specific names that contain a broader keyword ("סופר", "שוק") go first
    (["סופר-פארם", "סופר פארם", "SUPER-PHARM", "SUPERPHARM", "SUPER PHARM"], "בריאות ופארם", False),
    (["סופרגז", "SUPERGAS"], "חשמל, מים וגז", False),
    (["SUPERNET", "סופרנט"], "סלולר, אינטרנט וטלוויזיה", False),
    (["מס הכנסה", "מע\"מ", "מעמ ", "ביטוח לאומי", "מקדמות", "פקיד שומה"],
     "מס הכנסה, מע\"מ וביטוח לאומי", True),
    (["שופרסל", "רמי לוי", "יוחננוף", "ויקטורי", "טיב טעם", "מגה בעיר", "אושר עד", "יינות ביתן",
      "חצי חינם", "קרפור", "CARREFOUR", "AM:PM", "AMPM", "סופר", "מכולת", "קשת טעמים", "פרש מרקט",
      "סטופמרקט", "זול ובגדול", "מחסני השוק", "שוק ", "ירקות", "פירות", "מאפיה", "קצביה", "נטו מרקט",
      "SUPER", "דוכן"], "סופר ומזון", False),
    (["WOLT", "וולט", "תן ביס", "10BIS", "TENBIS", "משלוחה", "MISHLOHA", "CIBUS", "סיבוס"],
     "משלוחי אוכל", False),
    (["ארומה", "AROMA", "קפה קפה", "לנדוור", "גרג", "CAFE", "קפה", "מסעדה", "מסעדת", "פיצה", "PIZZA",
      "מקדונלד", "MCDONALD", "בורגר", "BURGER", "BBB", "דומינו", "שיפודי", "סושי", "SUSHI", "בר ",
      "פאב", "PUB", "גלידה", "רולדין", "אגדיר", "מוזס", "BISTRO", "RESTAURANT", "STARBUCKS", "KFC", "COFFEE"],
     "מסעדות ובתי קפה", False),
    (["פז ", "PAZ", "דלק ", "DELEK", "סונול", "SONOL", "דור אלון", "DOR ALON", "TEN ", "YELLOW",
      "ילו", "תחנת דלק", "סד\"ש", "GAS STATION", "SHELL"], "דלק", False),
    (["פנגו", "PANGO", "סלופארק", "CELLOPARK", "אחוזות החוף", "חניון", "חניה", "PARKING", "כביש 6",
      "דרך ארץ", "נתיבי איילון", "מנהרות הכרמל", "EASY PARK", "איזי פארק"], "חניה וכבישי אגרה", False),
    (["מוסך", "צמיגים", "משרד הרישוי", "רישוי", "טסט", "שלמה SIXT", "שלמה סיקסט", "אלדן", "באדג'ט",
      "ליסינג", "LEASING", "קאר וואש", "שטיפת"], "רכב - ביטוח, טיפולים ורישוי", False),
    (["רב קו", "רב-קו", "RAV KAV", "GETT", "גט טקסי", "יאנגו", "YANGO", "רכבת ישראל", "אגד",
      "דן ", "מוניות", "מונית", "UBER", "BOLT", "LIME", "BIRD"], "תחבורה ציבורית ומוניות", False),
    (["פלאפון", "PELEPHONE", "סלקום", "CELLCOM", "פרטנר", "PARTNER", "הוט ", "HOT ", "HOT MOBILE",
      "הוט מובייל", "בזק", "BEZEQ", "גולן טלקום", "GOLAN", "019 ", "012 ", "רמי לוי תקשורת",
      "WE4G", "וי קום", "XFONE", "אקספון", "YES ", "יס ", "סטינג", "STING", "NEXT TV", "FREETV",
      "אינטרנט רימון", "TRIPLE C", "SUPERNET"], "סלולר, אינטרנט וטלוויזיה", False),
    (["NETFLIX", "נטפליקס", "SPOTIFY", "ספוטיפיי", "APPLE.COM", "ITUNES", "APPLE ", "GOOGLE ONE",
      "YOUTUBE", "DISNEY", "AMAZON PRIME", "PRIME VIDEO", "HBO", "AUDIBLE", "STORYTEL", "PLAYSTATION",
      "XBOX", "STEAM", "TINDER", "PATREON", "ONLYFANS", "DEEZER", "APPLE MUSIC"], "מנויים דיגיטליים", False),
    (["OPENAI", "CHATGPT", "ANTHROPIC", "CLAUDE.AI", "CLAUDE", "CANVA", "ADOBE", "MICROSOFT",
      "MSFT", "OFFICE 365", "NOTION", "ZOOM", "DROPBOX", "MONDAY.COM", "MONDAY", "FIGMA", "SLACK",
      "HIGGSFIELD", "ELEVENLABS", "ELEVEN LABS", "MIDJOURNEY", "CAPCUT", "HEYGEN", "RUNWAY",
      "SYNTHESIA", "KLING", "PIKA", "SUNO", "LEONARDO", "FREEPIK", "ENVATO", "EPIDEMIC SOUND",
      "ARTLIST", "GRAMMARLY", "CALENDLY", "MAILCHIMP", "ACTIVETRAIL", "אקטיב טרייל", "MAKE.COM",
      "ZAPIER", "MANYCHAT", "AIRTABLE", "CLICKUP", "GITHUB", "CURSOR", "PERPLEXITY", "GEMINI",
      "GOOGLE WORKSPACE", "GSUITE", "GOOGLE*GSUITE", "חשבונית ירוקה", "GREENINVOICE", "MORNING",
      "ICOUNT", "איזי קאונט", "ריווחית", "SUMIT", "CARDCOM", "קארדקום", "PAYPLUS", "TRANZILA",
      "OPUSCLIP", "OPUS CLIP", "DESCRIPT", "VEED", "INVIDEO", "PICTORY", "SUBMAGIC", "METRICOOL",
      "LATER.COM", "BUFFER", "HOOTSUITE", "LINKTREE", "STAN STORE", "BEACONS"], "תוכנה וכלי AI לעסק", True),
    (["FACEBK", "FACEBOOK", "META ADS", "META PLATFORMS", "INSTAGRAM", "GOOGLE ADS", "GOOGLE*ADS",
      "TIKTOK ADS", "TIKTOK", "LINKEDIN", "TABOOLA", "OUTBRAIN", "FIVERR", "UPWORK", "פרסום"],
     "פרסום ושיווק", True),
    (["WIX", "GODADDY", "NAMECHEAP", "SHOPIFY", "WORDPRESS", "WP ENGINE", "SITEGROUND", "HOSTINGER",
      "CLOUDFLARE", "AWS", "AMAZON WEB", "GOOGLE CLOUD", "GOOGLE*CLOUD", "VERCEL", "NETLIFY",
      "DIGITALOCEAN", "HEROKU", "SUPABASE", "BOX.COM", "ICLOUD", "דומיין"], "אחסון, דומיינים ואתרים", True),
    (["KSP", "ק.ס.פ", "באג", "BUG ", "איביי", "IVORY", "אייבורי", "OFFICE DEPOT", "אופיס דיפו",
      "מחסני חשמל", "LASTPRICE", "זאפ", "ZAP", "B&H", "BHPHOTO", "LOGITECH", "דפוס", "קרביץ",
      "כתר פלסטיק"], "ציוד משרדי ומחשבים", True),
    (["רואה חשבון", "רו\"ח", "רוח ", "עורך דין", "עו\"ד", "ייעוץ", "יועץ", "הנהלת חשבונות",
      "LAWYER", "ACCOUNTANT", "CPA"], "שירותים מקצועיים (רו\"ח, עו\"ד)", True),
    (["חברת החשמל", "חשמל לישראל", "IEC", "אלקטרה פאוור", "פזגז", "PAZGAS", "סופרגז", "SUPERGAS",
      "אמישראגז", "AMISRAGAS", "מי אביבים", "הגיחון", "מי שבע", "מי כרמל", "מי רעננה", "מי נתניה",
      "מי הרצליה", "מי מודיעין", "מי ציונה", "מניב ראשון", "מי רקת", "עין אפק", "מי עדן", "מי שקמה",
      "פלגי מוצקין", "מי בית שמש", "תאגיד מים", "תאגיד המים", "סלקום אנרג", "בזק אנרגיה", "אמפא",
      "חשבון מים", "מי לוד"], "חשמל, מים וגז", False),
    (["ארנונה", "עירית", "עיריית", "עיריה", "מועצה אזורית", "מועצה מקומית", "רשות המסים",
      "אגרת", "משרד הפנים", "רשות האוכלוסין"], "ארנונה ומיסים", False),
    (["שכר דירה", "שכירות", "משכנתא", "ועד בית", "דמי ניהול"], "שכירות ומשכנתא", False),
    (["הראל", "HAREL", "מגדל", "MIGDAL", "הפניקס", "PHOENIX", "כלל ביטוח", "כלל חברה", "מנורה",
      "MENORA", "איילון", "AYALON", "AIG ", "ליברה", "LIBRA", "ביטוח ישיר", "DIRECT INSURANCE",
      "שירביט", "9 מיליון", "WOBI", "ווביט", "הכשרה ביטוח", "שומרה", "ביטוח"], "ביטוחים", False),
    (["סופר-פארם", "סופר פארם", "SUPER-PHARM", "SUPERPHARM", "BE ", "גוד פארם", "GOOD PHARM",
      "בית מרקחת", "PHARM", "מכבי", "כללית", "מאוחדת", "לאומית", "רופא", "שיניים", "מרפאה",
      "אופטיקה", "OPTICA", "הלפרין", "אסותא", "ASSUTA", "קופת חולים", "פיזיותרפיה", "פסיכולוג"], "בריאות ופארם", False),
    (["מספרה", "מניקור", "קוסמטיקה", "קוסמטיק", "SEPHORA", "ספורה", "MAC COSMETICS",
      "לייזר", "טיפוח", "BARBER", "ציפורניים", "LUSH", "רבקה זהבי", "כרמית"], "טיפוח וקוסמטיקה", False),
    (["הולמס פלייס", "HOLMES PLACE", "גו אקטיב", "GO ACTIVE", "ספייס", "SPACE FITNESS", "קאנטרי",
      "חדר כושר", "GYM", "FITNESS", "פילאטיס", "PILATES", "יוגה", "YOGA", "קרוספיט", "CROSSFIT",
      "דקאטלון", "DECATHLON", "STRAVA", "CLASSPASS", "בריכה"], "כושר וספורט", False),
    (["זארה", "ZARA", "H&M", "H & M", "קסטרו", "CASTRO", "פוקס", "FOX ", "טרמינל X", "TERMINAL X",
      "TERMINALX", "ASOS", "NEXT ", "רנואר", "RENUAR", "גולף", "GOLF", "אמריקן איגל", "AMERICAN EAGLE",
      "נעלי", "SHOES", "ADIDAS", "אדידס", "NIKE", "נייקי", "PULL&BEAR", "ברשקה", "BERSHKA", "מנגו",
      "MANGO", "UNIQLO", "SHEIN", "שיין", "LEVI", "TOMMY", "המשביר", "MASHBIR", "לי קופר", "OVS",
      "יוניקלו", "אורבניקה", "URBANICA", "הודיס", "HOODIES", "TWENTYFOURSEVEN"], "ביגוד והנעלה", False),
    (["איקאה", "IKEA", "ACE ", "אייס", "הום סנטר", "HOME CENTER", "ביתילי", "BEITILI", "פוקס הום",
      "FOX HOME", "גולף אנד קו", "ורדינון", "נעמן", "NAAMAN", "המשביר לצרכן", "אלקטרה", "ELECTRA",
      "שקם אלקטריק", "מחסני חשמל", "באג", "IDIGITAL", "איידיגיטל", "סמארט בוי", "MAX STOCK",
      "מקס סטוק", "ריהוט", "רהיטים", "טמבור", "צבע", "ע.ב. אגם"], "בית, ריהוט ואלקטרוניקה", False),
    (["AMAZON", "אמזון", "ALIEXPRESS", "עליאקספרס", "ALIPAY", "TEMU", "טמו", "EBAY", "IHERB",
      "אייהרב", "ETSY", "WISH.COM", "PAYPAL", "פייפאל"], "קניות אונליין", False),
    (["סינמה סיטי", "CINEMA CITY", "יס פלאנט", "YES PLANET", "רב חן", "לב סינמה", "תיאטרון", "הבימה",
      "קאמרי", "לאן ", "LEAAN", "EVENTIM", "איוונטים", "הופעה", "כרטיסים", "TICKET", "מוזיאון",
      "לונה פארק", "ספארי", "ESCAPE", "בריכה", "קזינו", "WINNER", "ווינר", "לוטו", "מפעל הפיס"],
     "פנאי ובילוי", False),
    (["אל על", "EL AL", "ELAL", "ישראייר", "ISRAIR", "ארקיע", "ARKIA", "WIZZ", "RYANAIR", "EASYJET",
      "TURKISH", "AEGEAN", "BOOKING", "AIRBNB", "EXPEDIA", "AGODA", "HOTEL", "מלון", "HOTELS.COM",
      "איסתא", "ISSTA", "גוליבר", "דיזנהויז", "רכב שכור", "HERTZ", "AVIS", "EUROPCAR", "RENTALCARS",
      "DUTY FREE", "דיוטי פרי", "JAMES RICHARDSON", "SKYSCANNER", "KIWI.COM", "TRIP.COM"],
     "טיסות, נופש ומלונות", False),
    (["סטימצקי", "STEIMATZKY", "צומת ספרים", "ספרים", "UDEMY", "COURSERA", "SKILLSHARE",
      "MASTERCLASS", "קורס", "סדנה", "אוניברסיט", "מכללה", "האוניברסיטה הפתוחה", "בית ספר",
      "גן ילדים", "חוג", "שכר לימוד", "KINDLE"], "חינוך, קורסים וספרים", False),
    (["שילב", "SHILAV", "טויס אר אס", "TOYS R US", "כפר השעשועים", "צעצוע", "מעון", "צהרון",
      "בייביסיטר", "MOTHERCARE"], "ילדים", False),
    (["וטרינר", "VET", "פט שופ", "PET ", "זוולנד", "ZOOLAND", "אניפט", "חיות"], "חיות מחמד", False),
    (["פרחים", "FLOWERS", "תרומה", "עמותת", "עמותה", "DONATION", "מתנה", "GIFT", "בית חב\"ד",
      "BUYME", "ביי מי", "תו הזהב", "וואלה שופס", "תו פלוס"], "מתנות ותרומות", False),
    (["ביט ", "BIT ", "BIT-", "BIT ", "פייבוקס", "PAYBOX", "פיי בוקס", "PEPPER PAY", "העברה ב"],
     "העברות (ביט/פייבוקס)", False),
    (["משיכת מזומן", "משיכה מכספומט", "כספומט", "ATM ", "מזומן", "CASH"], "משיכת מזומן", False),
    (["עמלה", "עמלת", "ריבית", "דמי כרטיס", "דמי מנוי כרטיס", "דמי ניהול חשבון", "FEE ", "INTEREST",
      "דמי שימוש", "עמ' ", "דמי טיפול"], "עמלות, ריבית ודמי כרטיס", False),
    (["הלוואה", "החזר הלוואה", "הלוואת", "LOAN"], "הלוואות", False),
    (["קרן השתלמות", "קופת גמל", "פנסיה", "חיסכון", "פיקדון", "פקדון", "ני\"ע", "ניירות ערך",
      "אקסלנס", "מיטב", "אלטשולר", "IBI ", "INTERACTIVE BROKERS", "קופ\"ג"], "חיסכון והשקעות", False),
    # bank-side lines for the card bill; excluded when card files are present (double counting)
    (["ישראכרט", "ISRACARD", "מקס איט", "MAX IT", "לאומי קארד", "כאל ", "כ.א.ל", "ויזה כאל",
      "אמריקן אקספרס", "AMERICAN EXPRESS", "דיינרס", "DINERS", "חיוב כרטיס", "כרטיסי אשראי",
      "חיוב לכרטיס"], "תשלום כרטיס אשראי", False),
    (["משכורת", "שכר ", "העברה מ", "זיכוי מ", "הפקדה", "תקבול", "SALARY", "PAYROLL"],
     "הכנסות", False),
]

# issuer category / branch wording -> our category
ISSUER_MAP = [
    (["מזון", "סופרמרקט", "צריכה", "מכולת"], "סופר ומזון"),
    (["מסעד", "קפה", "בר", "מזון מהיר"], "מסעדות ובתי קפה"),
    (["דלק", "תחנות"], "דלק"),
    (["תחבורה", "רכב", "חניה", "תחבורה ורכבים"], "תחבורה ציבורית ומוניות"),
    (["תקשורת", "סלולר", "טלפון", "אינטרנט"], "סלולר, אינטרנט וטלוויזיה"),
    (["ביטוח"], "ביטוחים"),
    (["רפואה", "מרקחת", "בריאות", "אופטיקה"], "בריאות ופארם"),
    (["אופנה", "הלבשה", "ביגוד", "הנעלה"], "ביגוד והנעלה"),
    (["עיצוב הבית", "ריהוט", "חשמל ומחשבים", "מוצרי חשמל", "בית וגן", "כלי בית"], "בית, ריהוט ואלקטרוניקה"),
    (["טיסות", "תיירות", "מלונ", "נופש", "תעופה"], "טיסות, נופש ומלונות"),
    (["פנאי", "בידור", "תרבות", "ספורט"], "פנאי ובילוי"),
    (["קוסמטיקה", "טיפוח"], "טיפוח וקוסמטיקה"),
    (["ספרים", "דפוס", "חינוך", "לימוד"], "חינוך, קורסים וספרים"),
    (["עירייה", "ממשלה", "מוסדות"], "ארנונה ומיסים"),
    (["חיות"], "חיות מחמד"),
    (["ילדים", "תינוק", "צעצוע"], "ילדים"),
    (["חשמל, גז", "דלק, חשמל וגז", "גז"], "חשמל, מים וגז"),
    (["תרומ", "מתנ"], "מתנות ותרומות"),
]


def norm_name(s):
    s = str(s or "").upper()
    s = re.sub(r"[\"'״׳`]", "", s)
    return " " + re.sub(r"\s+", " ", s).strip() + " "


def merchant_key(s):
    """Group key for one merchant across months: drop reference numbers, card digits, city tails."""
    k = norm_name(s)
    k = re.sub(r"\d{4,}", " ", k)
    k = re.sub(r"[*#.,_/\\|-]+", " ", k)
    k = re.sub(r"\b(בעמ|בע מ|LTD|INC|LLC|IL|ISRAEL|ישראל|תא|ת א|תל אביב|ירושלים|חיפה)\b", " ", k)
    k = re.sub(r"\s+", " ", k).strip()
    return k or norm_name(s).strip()


def _hit(name, kw):
    kw_n = norm_name(kw)
    # keywords with a trailing space ("פז ") must match a whole word
    return kw_n.strip() in name if not kw.endswith(" ") else kw_n.rstrip() + " " in name


def categorize(merchant, issuer_category="", user_rules=()):
    """Return (category, business_hint, source)."""
    name = norm_name(merchant)
    for r in user_rules:
        if norm_name(r["match"]).strip() in name:
            return r.get("category") or "לא מסווג", r.get("scope") == "business", "user"
    for words, cat, biz in RULES:
        if any(_hit(name, w) for w in words):
            return cat, biz, "rule"
    ic = norm_name(issuer_category)
    if ic.strip():
        for words, cat in ISSUER_MAP:
            if any(w in ic for w in words):
                return cat, False, "issuer"
    return "לא מסווג", False, "none"
