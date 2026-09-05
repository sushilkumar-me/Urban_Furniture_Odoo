# ============================================================
# services/__init__.py
#
# WHY THIS FILE EXISTS:
#   Registers the "services" folder as a Python package.
#   This allows routers to import business logic with:
#       from app.services.invoice_service import get_all_invoices
#
#   Services contain the actual logic — calculations, rules,
#   database queries. Routers should stay thin and delegate
#   all real work to services.
#   We will add services in Phase 3.
# ============================================================
