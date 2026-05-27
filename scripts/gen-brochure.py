"""
Génère la brochure commerciale E-Samba en PDF (A4 paysage).
Données harmonisées avec le site www.e-samba.com :
  - Tarifs : Gratuit 0 FCFA / Starter 15 000 FCFA / Pro 21 000 FCFA / Enterprise Sur devis
  - Contact : +237 6 41 34 18 57 | contact@e-samba.com | www.e-samba.com
"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_CENTER, TA_LEFT

OUTPUT = r"C:\Users\cnoah\Documents\GitHub\smart-fleet-africa\public\E-Samba_Brochure_Commerciale.pdf"

# ── Palette ─────────────────────────────────────────────────────────────────
GREEN      = colors.HexColor("#1D9E75")
GREEN_DARK = colors.HexColor("#0F6E56")
GREEN_LIGHT= colors.HexColor("#E1F5EE")
DARK       = colors.HexColor("#0f172a")
SURFACE    = colors.HexColor("#1e293b")
CARD       = colors.HexColor("#1a2844")
MUTED      = colors.HexColor("#94a3b8")
WHITE      = colors.white
AMBER      = colors.HexColor("#f59e0b")
BLUE       = colors.HexColor("#3b82f6")

PW, PH = landscape(A4)   # 297 × 210 mm → 841 × 595 pt
M  = 18 * mm              # marges
IW = PW - 2 * M           # inner width


def rr(c, x, y, w, h, r=4, fill=None, stroke=None, lw=0.5):
    """Rect arrondi."""
    if fill:    c.setFillColor(fill)
    if stroke:  c.setStrokeColor(stroke)
    else:       c.setStrokeColor(colors.transparent)
    c.setLineWidth(lw)
    c.roundRect(x, y, w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)


def txt(c, text, x, y, size=10, color=WHITE, bold=False, align="L"):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.setFillColor(color)
    if align == "C":
        c.drawCentredString(x, y, text)
    elif align == "R":
        c.drawRightString(x, y, text)
    else:
        c.drawString(x, y, text)


def draw_page(c):
    # ── Fond ────────────────────────────────────────────────────────────────
    c.setFillColor(DARK)
    c.rect(0, 0, PW, PH, fill=1, stroke=0)

    # ── Bande verte latérale gauche ─────────────────────────────────────────
    c.setFillColor(GREEN)
    c.rect(0, 0, 5, PH, fill=1, stroke=0)

    top = PH - M

    # ── LOGO / TITRE ────────────────────────────────────────────────────────
    txt(c, "E-Samba", M + 2, top - 14, size=22, bold=True)

    # Pastille verte
    c.setFillColor(GREEN)
    c.circle(M + 2 + 8, top - 14 + 7, 5, fill=1, stroke=0)

    txt(c, "Contrôlez. Optimisez. Sécurisez.", M + 2, top - 28, size=11, color=GREEN)
    txt(c, "Solution de gestion de flotte  –  Cameroun · Congo · RCA · Gabon · Tchad", M + 2, top - 40, size=8, color=MUTED)

    # ── STATS (4 blocs) ─────────────────────────────────────────────────────
    stats = [
        ("500+", "véhicules gérés"),
        ("3",    "pays CEMAC"),
        ("< 5 min", "installation"),
        ("99,9%", "uptime garanti"),
    ]
    sw = IW / 4
    sy = top - 70
    for i, (val, lbl) in enumerate(stats):
        sx = M + i * sw
        rr(c, sx + 2, sy - 28, sw - 4, 36, r=6, fill=SURFACE)
        txt(c, val, sx + sw/2, sy - 6, size=14, bold=True, color=GREEN, align="C")
        txt(c, lbl, sx + sw/2, sy - 19, size=7, color=MUTED, align="C")

    # ── SÉPARATEUR ──────────────────────────────────────────────────────────
    c.setStrokeColor(SURFACE)
    c.setLineWidth(0.5)
    c.line(M, top - 108, PW - M, top - 108)

    # ── SECTION : Pourquoi E-Samba ? ────────────────────────────────────────
    gy = top - 118
    txt(c, "Pourquoi E-Samba ?", M + 2, gy, size=10, bold=True)

    col_w = IW / 2 - 3
    # Sans E-Samba
    rr(c, M, gy - 84, col_w, 80, r=5, fill=colors.HexColor("#1c1c2e"), stroke=colors.HexColor("#3b2a2a"), lw=0.5)
    txt(c, "✗  Sans E-Samba", M + 6, gy - 10, size=8, bold=True, color=colors.HexColor("#f87171"))
    sans = ["Suivi manuel = pertes de recettes", "Pannes imprévues et coûteuses",
            "Conducteurs non encadrés", "Zéro visibilité sur la flotte"]
    for j, l in enumerate(sans):
        txt(c, "–  " + l, M + 8, gy - 24 - j * 14, size=7.5, color=MUTED)

    # Avec E-Samba
    ax = M + col_w + 6
    rr(c, ax, gy - 84, col_w, 80, r=5, fill=colors.HexColor("#0d2b22"), stroke=GREEN, lw=0.5)
    txt(c, "✓  Avec E-Samba", ax + 6, gy - 10, size=8, bold=True, color=GREEN)
    avec = ["Dashboard temps réel, mobile & desktop", "Alertes maintenance automatiques",
            "Coaching vocal post-trajet", "Rapports consolidés multi-pays"]
    for j, l in enumerate(avec):
        txt(c, "✓  " + l, ax + 8, gy - 24 - j * 14, size=7.5, color=colors.HexColor("#86efac"))

    # ── SECTION : 6 modules ─────────────────────────────────────────────────
    my = gy - 98
    txt(c, "6 modules. 1 plateforme.", M + 2, my, size=10, bold=True)

    modules = [
        ("Suivi temps réel",      "GPS live, kilométrage auto,\nalertes hors-zone"),
        ("Maintenance prédictive","Planification km/date, suivi\npièces, rapports conducteur"),
        ("Coaching vocal",        "Audio post-trajet FR/EN/Lingala,\nscores conducteur"),
        ("Dashcam IA",            "Fatigue, téléphone, excès vitesse\n→ alertes push"),
        ("Analytics & Rapports",  "KPI flotte, export PDF/CSV,\nmulti-agences"),
        ("App conducteur",        "Mobile offline-first,\nWhatsApp Bot, sans formation"),
    ]
    mw = IW / 3
    mh = 44
    for i, (name, desc) in enumerate(modules):
        col = i % 3
        row = i // 3
        mx = M + col * mw
        mry = my - 18 - row * (mh + 4)
        rr(c, mx + 1, mry - mh, mw - 2, mh, r=5, fill=SURFACE)
        # Pastille
        c.setFillColor(GREEN)
        c.circle(mx + 10, mry - 10, 4, fill=1, stroke=0)
        txt(c, name, mx + 18, mry - 8, size=8, bold=True)
        for k, line in enumerate(desc.split("\n")):
            txt(c, line, mx + 8, mry - 20 - k * 11, size=7, color=MUTED)

    # ── SECTION : Tarification ──────────────────────────────────────────────
    ty = my - 116
    txt(c, "Tarification — sans engagement", M + 2, ty, size=10, bold=True)

    plans = [
        {
            "name": "Gratuit",
            "price": "0 FCFA",
            "period": "jusqu'à 3 véhicules",
            "features": ["GPS & Suivi temps réel", "Dashboard basique", "Sans coaching ni dashcam"],
            "color": MUTED,
            "popular": False,
        },
        {
            "name": "Starter",
            "price": "15 000 FCFA",
            "period": "/ véhicule / mois",
            "features": ["Jusqu'à 25 véhicules", "Samba-Fleet complet", "Samba-Cash essentiel", "Support e-mail"],
            "color": colors.HexColor("#60a5fa"),
            "popular": False,
        },
        {
            "name": "Pro",
            "price": "21 000 FCFA",
            "period": "/ véhicule / mois",
            "features": ["Jusqu'à 75 véhicules", "Suite complète Samba", "Coaching · Dashcam IA", "Alertes push/SMS · prioritaire"],
            "color": GREEN,
            "popular": True,
        },
        {
            "name": "Enterprise",
            "price": "Sur devis",
            "period": "50+ véhicules",
            "features": ["Véhicules illimités", "Multi-pays · SLA dédié", "API & intégrations", "Formation sur site"],
            "color": AMBER,
            "popular": False,
        },
    ]

    pw2 = IW / 4
    ph2 = 90
    for i, plan in enumerate(plans):
        px = M + i * pw2
        py = ty - 100
        border = GREEN if plan["popular"] else SURFACE
        bg = colors.HexColor("#0d2b22") if plan["popular"] else SURFACE
        rr(c, px + 2, py, pw2 - 4, ph2, r=6, fill=bg, stroke=border, lw=1 if plan["popular"] else 0.5)

        if plan["popular"]:
            rr(c, px + pw2/2 - 20, py + ph2 - 2, 40, 12, r=6, fill=GREEN)
            txt(c, "Populaire", px + pw2/2, py + ph2 + 4, size=7, bold=True, color=WHITE, align="C")

        txt(c, plan["name"], px + pw2/2, py + ph2 - 16, size=10, bold=True, color=plan["color"], align="C")
        txt(c, plan["price"], px + pw2/2, py + ph2 - 32, size=11, bold=True, align="C")
        txt(c, plan["period"], px + pw2/2, py + ph2 - 43, size=6.5, color=MUTED, align="C")

        for j, feat in enumerate(plan["features"]):
            txt(c, "v  " + feat, px + 8, py + ph2 - 50 - j * 11, size=6.5, color=colors.HexColor("#86efac") if plan["popular"] else MUTED)

    # ── CTA + CONTACT ────────────────────────────────────────────────────────
    cy = ty - 114
    rr(c, M, cy - 28, IW, 34, r=8, fill=GREEN_DARK)
    txt(c, "Demandez une démo gratuite — réponse sous 24 h", PW/2, cy - 8, size=11, bold=True, align="C")
    txt(c, "WhatsApp : +237 6 41 34 18 57   ·   contact@e-samba.com   ·   www.e-samba.com", PW/2, cy - 22, size=8.5, color=GREEN_LIGHT, align="C")

    # ── FOOTER ───────────────────────────────────────────────────────────────
    rr(c, 0, 0, PW, 16, fill=SURFACE)
    txt(c, "contact@e-samba.com   ·   WhatsApp +237 6 41 34 18 57   ·   www.e-samba.com   ·   © 2026 E-Samba",
        PW/2, 5, size=7, color=MUTED, align="C")


c = canvas.Canvas(OUTPUT, pagesize=landscape(A4))
c.setTitle("E-Samba — Brochure Commerciale 2026")
c.setAuthor("E-Samba")
c.setSubject("Solution de gestion de flotte Afrique Centrale")

draw_page(c)
c.save()
print(f"✅ Brochure générée → {OUTPUT}")
