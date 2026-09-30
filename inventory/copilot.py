"""
=========================================================
STOCKPILOT COPILOT
Inventory Intelligence Platform

AI layer for explaining real StockPilot operational data.

The database and deterministic calculation engines remain
the source of truth. OpenAI is used for interpretation,
prioritization, and natural-language explanation.
=========================================================
"""

import json
import os
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from openai import OpenAI

from .models import (
    Product,
    Supplier,
    StockMovement,
    PurchaseOrder,
)


# =========================================================
# CONFIGURATION
# =========================================================

OPENAI_MODEL = os.environ.get(
    "STOCKPILOT_OPENAI_MODEL",
    "gpt-5.6-luna",
)


# =========================================================
# INVENTORY STATUS
# =========================================================

def get_product_status(product):
    """
    Determine the current inventory status of a product.
    """

    quantity = float(
        product.quantity or 0
    )

    threshold = float(
        product.low_stock_threshold or 0
    )

    if quantity <= 0:
        return "STOCKOUT"

    if quantity <= threshold:
        return "LOW STOCK"

    return "HEALTHY"


# =========================================================
# INVENTORY SUMMARY
# =========================================================

def get_inventory_summary():
    """
    Return high-level inventory metrics.
    """

    products = (
        Product.objects
        .select_related(
            "category",
            "supplier",
        )
        .all()
    )

    total_products = products.count()

    inventory_value = 0

    healthy = 0
    low_stock = 0
    stockout = 0

    for product in products:

        quantity = float(
            product.quantity or 0
        )

        price = float(
            product.price or 0
        )

        inventory_value += (
            quantity * price
        )

        status = get_product_status(
            product
        )

        if status == "HEALTHY":
            healthy += 1

        elif status == "LOW STOCK":
            low_stock += 1

        elif status == "STOCKOUT":
            stockout += 1

    if total_products:

        health_score = round(
            (
                (
                    healthy * 100
                )
                +
                (
                    low_stock * 60
                )
                +
                (
                    stockout * 0
                )
            )
            / total_products
        )

    else:
        health_score = 0

    return {
        "total_products": total_products,

        "inventory_value": round(
            inventory_value,
            2,
        ),

        "healthy_products": healthy,

        "low_stock_products": low_stock,

        "stockout_products": stockout,

        "inventory_health_score": health_score,
    }


# =========================================================
# INVENTORY RISK ENGINE
# =========================================================

def get_inventory_risks():
    """
    Calculate deterministic inventory risk.

    Uses the previous 30 days of outbound stock movement
    to estimate average daily demand and days of stock.
    """

    products = (
        Product.objects
        .select_related(
            "category",
            "supplier",
        )
        .all()
    )

    today = timezone.now()

    start_date = (
        today - timedelta(days=30)
    )

    results = []

    for product in products:

        outbound_quantity = (
            StockMovement.objects
            .filter(
                product=product,
                movement_type="OUT",
                created_at__gte=start_date,
            )
            .aggregate(
                total=Sum("quantity")
            )
            .get("total")
            or 0
        )

        outbound_quantity = float(
            outbound_quantity
        )

        average_daily_demand = (
            outbound_quantity / 30
        )

        current_stock = float(
            product.quantity or 0
        )

        if average_daily_demand > 0:

            days_of_stock = (
                current_stock
                /
                average_daily_demand
            )

        else:

            days_of_stock = None

        threshold = float(
            product.low_stock_threshold or 0
        )

        # -------------------------------------------------
        # Risk classification
        # -------------------------------------------------

        if current_stock <= 0:

            risk_level = "CRITICAL"

            recommended_action = (
                "Immediate replenishment required."
            )

        elif (
            days_of_stock is not None
            and days_of_stock <= 7
        ):

            risk_level = "HIGH"

            recommended_action = (
                "Reorder soon to avoid a potential stockout."
            )

        elif current_stock <= threshold:

            risk_level = "HIGH"

            recommended_action = (
                "Stock is below the configured threshold."
            )

        elif (
            days_of_stock is not None
            and days_of_stock <= 14
        ):

            risk_level = "MEDIUM"

            recommended_action = (
                "Monitor demand and prepare the next replenishment."
            )

        else:

            risk_level = "LOW"

            recommended_action = (
                "Inventory position is currently healthy."
            )

        results.append(
            {
                "product_id": product.id,

                "product_name": product.name,

                "sku": product.sku,

                "category": (
                    product.category.name
                    if product.category
                    else None
                ),

                "supplier": (
                    product.supplier.name
                    if product.supplier
                    else None
                ),

                "current_stock": current_stock,

                "low_stock_threshold": threshold,

                "outbound_last_30_days": (
                    outbound_quantity
                ),

                "average_daily_demand": round(
                    average_daily_demand,
                    2,
                ),

                "days_of_stock": (
                    round(
                        days_of_stock,
                        1,
                    )
                    if days_of_stock is not None
                    else None
                ),

                "risk_level": risk_level,

                "recommended_action": (
                    recommended_action
                ),
            }
        )

    return results


# =========================================================
# REORDER RECOMMENDATIONS
# =========================================================

def get_reorder_recommendations():
    """
    Return products that currently warrant replenishment.
    """

    risks = get_inventory_risks()

    recommendations = []

    for item in risks:

        risk = item["risk_level"]

        if risk not in (
            "CRITICAL",
            "HIGH",
            "MEDIUM",
        ):
            continue

        current_stock = float(
            item["current_stock"]
        )

        threshold = float(
            item["low_stock_threshold"]
        )

        average_daily_demand = float(
            item["average_daily_demand"]
        )

        days_of_stock = item[
            "days_of_stock"
        ]

        # -------------------------------------------------
        # Target stock
        # -------------------------------------------------

        if average_daily_demand > 0:

            target_stock = (
                average_daily_demand * 30
            )

        else:

            target_stock = max(
                threshold * 2,
                threshold + 1,
            )

        recommended_quantity = max(
            0,
            round(
                target_stock
                -
                current_stock
            ),
        )

        if recommended_quantity <= 0:

            recommended_quantity = max(
                1,
                round(threshold),
            )

        recommendations.append(
            {
                "product_id": (
                    item["product_id"]
                ),

                "product_name": (
                    item["product_name"]
                ),

                "sku": item["sku"],

                "supplier": (
                    item["supplier"]
                ),

                "current_stock": (
                    current_stock
                ),

                "average_daily_demand": (
                    average_daily_demand
                ),

                "days_of_stock": (
                    days_of_stock
                ),

                "recommended_quantity": (
                    recommended_quantity
                ),

                "risk_level": risk,

                "reason": (
                    item[
                        "recommended_action"
                    ]
                ),
            }
        )

    # Critical first
    # High second
    # Medium third

    risk_order = {
        "CRITICAL": 0,
        "HIGH": 1,
        "MEDIUM": 2,
    }

    recommendations.sort(
        key=lambda item: risk_order.get(
            item["risk_level"],
            99,
        )
    )

    return recommendations


# =========================================================
# SUPPLIER PERFORMANCE
# =========================================================

def get_supplier_performance():
    """
    Calculate supplier health from purchase-order history.
    """

    suppliers = Supplier.objects.all()

    results = []

    for supplier in suppliers:

        orders = (
            PurchaseOrder.objects
            .filter(
                supplier=supplier
            )
        )

        total_orders = orders.count()

        completed_orders = (
            orders
            .filter(
                status=PurchaseOrder.STATUS_RECEIVED
            )
            .count()
        )

        late_orders = 0

        total_ordered_quantity = 0

        total_received_quantity = 0

        lead_times = []

        for order in orders:

            ordered_quantity = (
                order.total_ordered_quantity
            )

            received_quantity = (
                order.total_received_quantity
            )

            total_ordered_quantity += (
                ordered_quantity
            )

            total_received_quantity += (
                received_quantity
            )

            # -------------------------------------------------
            # Late delivery
            # -------------------------------------------------

            if (
                order.expected_delivery
                and order.received_at
                and (
                    order.received_at.date()
                    >
                    order.expected_delivery
                )
            ):

                late_orders += 1

            # -------------------------------------------------
            # Lead time
            # -------------------------------------------------

            if (
                order.received_at
                and order.ordered_at
            ):

                lead_time = (
                    order.received_at.date()
                    -
                    order.ordered_at.date()
                ).days

                if lead_time >= 0:

                    lead_times.append(
                        lead_time
                    )

        # -------------------------------------------------
        # On-time delivery
        # -------------------------------------------------

        if total_orders:

            on_time_delivery_rate = (
                (
                    total_orders
                    -
                    late_orders
                )
                /
                total_orders
            ) * 100

        else:

            on_time_delivery_rate = 0

        # -------------------------------------------------
        # Average lead time
        # -------------------------------------------------

        if lead_times:

            average_lead_time_days = (
                sum(lead_times)
                /
                len(lead_times)
            )

        else:

            average_lead_time_days = 0

        # -------------------------------------------------
        # Fulfillment
        # -------------------------------------------------

        if total_ordered_quantity:

            fulfillment_rate = (
                total_received_quantity
                /
                total_ordered_quantity
            ) * 100

        else:

            fulfillment_rate = 0

        # -------------------------------------------------
        # Supplier health score
        # -------------------------------------------------

        if total_orders:

            health_score = round(
                (
                    on_time_delivery_rate
                    * 0.5
                )
                +
                (
                    fulfillment_rate
                    * 0.5
                )
            )

        else:

            health_score = 0

        # -------------------------------------------------
        # Supplier risk
        # -------------------------------------------------

        if not total_orders:

            risk_level = "NO DATA"

        elif health_score >= 90:

            risk_level = "LOW"

        elif health_score >= 70:

            risk_level = "MEDIUM"

        else:

            risk_level = "HIGH"

        results.append(
            {
                "supplier_id": supplier.id,

                "supplier_name": supplier.name,

                "total_orders": total_orders,

                "completed_orders": (
                    completed_orders
                ),

                "late_orders": late_orders,

                "on_time_delivery_rate": round(
                    on_time_delivery_rate,
                    2,
                ),

                "average_lead_time_days": round(
                    average_lead_time_days,
                    2,
                ),

                "total_ordered_quantity": (
                    total_ordered_quantity
                ),

                "total_received_quantity": (
                    total_received_quantity
                ),

                "fulfillment_rate": round(
                    fulfillment_rate,
                    2,
                ),

                "health_score": health_score,

                "risk_level": risk_level,
            }
        )

    return results


# =========================================================
# PURCHASE ORDERS
# =========================================================

def get_purchase_orders():
    """
    Return operational purchase-order information.
    """

    orders = (
        PurchaseOrder.objects
        .select_related(
            "supplier"
        )
        .prefetch_related(
            "items__product"
        )
        .order_by(
            "-created_at"
        )
    )

    results = []

    today = timezone.localdate()

    for order in orders:

        items = []

        for item in order.items.all():

            items.append(
                {
                    "product": (
                        item.product.name
                        if item.product
                        else None
                    ),

                    "sku": (
                        item.product.sku
                        if item.product
                        else None
                    ),

                    "ordered_quantity": (
                        item.quantity
                    ),

                    "received_quantity": (
                        item.received_quantity
                    ),

                    "pending_quantity": (
                        item.pending_quantity
                    ),

                    "unit_cost": float(
                        item.unit_cost
                    ),
                }
            )

        expected_delivery = (
            order.expected_delivery
        )

        overdue = False

        if (
            expected_delivery
            and order.status
            not in (
                PurchaseOrder.STATUS_RECEIVED,
                PurchaseOrder.STATUS_CANCELLED,
            )
        ):

            overdue = (
                expected_delivery
                <
                today
            )

        results.append(
            {
                "id": order.id,

                "order_number": (
                    order.order_number
                ),

                "supplier": (
                    order.supplier.name
                    if order.supplier
                    else None
                ),

                "status": order.status,

                "ordered_at": (
                    order.ordered_at.isoformat()
                    if order.ordered_at
                    else None
                ),

                "expected_delivery": (
                    expected_delivery.isoformat()
                    if expected_delivery
                    else None
                ),

                "received_at": (
                    order.received_at.isoformat()
                    if order.received_at
                    else None
                ),

                "total_ordered_quantity": (
                    order.total_ordered_quantity
                ),

                "total_received_quantity": (
                    order.total_received_quantity
                ),

                "pending_quantity": max(
                    0,
                    (
                        order.total_ordered_quantity
                        -
                        order.total_received_quantity
                    ),
                ),

                "fulfillment_rate": round(
                    order.fulfillment_rate,
                    2,
                ),

                "lead_time_days": (
                    order.lead_time_days
                ),

                "overdue": overdue,

                "notes": order.notes,

                "items": items,
            }
        )

    return results


# =========================================================
# COPILOT CONTEXT
# =========================================================

def build_copilot_context(question):
    """
    Build a controlled server-generated context package.

    The AI model never receives direct database access.
    """

    question = (
        str(question or "")
        .strip()
    )

    return {
        "question": question,

        "inventory_summary": (
            get_inventory_summary()
        ),

        "inventory_risks": (
            get_inventory_risks()
        ),

        "reorder_recommendations": (
            get_reorder_recommendations()
        ),

        "supplier_performance": (
            get_supplier_performance()
        ),

        "purchase_orders": (
            get_purchase_orders()
        ),
    }


# =========================================================
# SYSTEM INSTRUCTIONS
# =========================================================

COPILOT_INSTRUCTIONS = """
You are StockPilot Copilot.

You are an AI inventory operations assistant
inside StockPilot, an inventory intelligence platform.

Your job is to answer questions using the
StockPilot operational data supplied to you.

=========================================================
DATA RULES
=========================================================

1. Use ONLY the StockPilot data provided in the context.

2. Never invent:
   - products
   - inventory quantities
   - prices
   - suppliers
   - purchase orders
   - dates
   - demand numbers
   - risk scores
   - supplier metrics

3. The database-derived calculations are the
   source of truth.

4. If the data does not contain enough information,
   clearly say that the available data is insufficient.

5. Never pretend that an assumption is a database fact.

6. When making a recommendation, explain the reason.

=========================================================
INVENTORY RULES
=========================================================

When discussing inventory:

- CRITICAL means immediate attention is required.
- HIGH means the product should be reviewed soon.
- MEDIUM means the product should be monitored.
- LOW means the current inventory position is healthy.

Use the actual:
- current stock
- average daily demand
- days of stock
- low-stock threshold
- risk level

from the supplied data.

=========================================================
PURCHASE ORDER RULES
=========================================================

When discussing purchase orders:

Pay attention to:

- overdue orders
- expected delivery date
- pending quantity
- fulfillment rate
- supplier
- order status

An order is overdue only when the supplied
"overdue" field is true.

Do not invent overdue orders.

=========================================================
SUPPLIER RULES
=========================================================

When discussing suppliers:

Use:

- health score
- on-time delivery rate
- fulfillment rate
- late orders
- average lead time

Explain how supplier performance can affect
inventory availability when relevant.

=========================================================
READ-ONLY RULE
=========================================================

StockPilot Copilot is currently READ-ONLY.

Never claim that you:

- created an order
- changed an order
- cancelled an order
- received an order
- updated inventory
- changed a supplier
- changed a product

unless the application explicitly provides such
an action.

=========================================================
RESPONSE STYLE
=========================================================

Always answer the user's question directly.

Use this structure when appropriate:

Answer:
[direct answer]

Why it matters:
[important evidence]

Recommended action:
[action based only on the data]

Keep responses concise and easy to read
inside a dashboard interface.

If the user asks:

"What should I reorder this week?"

Look at:
reorder_recommendations.

If the user asks:

"Which products are at highest risk?"

Look at:
inventory_risks.

If the user asks:

"Which purchase orders are overdue?"

Look at:
purchase_orders where overdue = true.

If the user asks:

"What should operations focus on today?"

Prioritize:
1. CRITICAL inventory
2. HIGH inventory risk
3. overdue purchase orders
4. supplier problems
5. replenishment recommendations

Do not make up information when a category has
no data.
"""


# =========================================================
# QUESTION NORMALIZATION
# =========================================================

def normalize_question(question, context=None):
    """
    Safely extract the user's question.

    This prevents accidental empty-question errors
    when the caller passes a string, dictionary,
    or context object.
    """

    # Direct string
    if isinstance(question, str):

        cleaned = question.strip()

        if cleaned:
            return cleaned

    # Dictionary/context
    if isinstance(question, dict):

        possible_keys = (
            "question",
            "message",
            "prompt",
            "query",
        )

        for key in possible_keys:

            value = question.get(key)

            if value:

                value = str(
                    value
                ).strip()

                if value:
                    return value

    # Try context
    if isinstance(context, dict):

        possible_keys = (
            "question",
            "message",
            "prompt",
            "query",
        )

        for key in possible_keys:

            value = context.get(key)

            if value:

                value = str(
                    value
                ).strip()

                if value:
                    return value

    return ""


# =========================================================
# OPENAI RESPONSE
# =========================================================

def generate_copilot_response(
    question,
    context=None,
):
    """
    Generate the StockPilot Copilot response.

    The model receives:
    - the user's question
    - controlled database-derived context
    """

    # -----------------------------------------------------
    # Normalize question
    # -----------------------------------------------------

    question = normalize_question(
        question,
        context,
    )

    if not question:

        raise ValueError(
            "Please provide a question."
        )

    # -----------------------------------------------------
    # Build context if not supplied
    # -----------------------------------------------------

    if not isinstance(
        context,
        dict,
    ):

        context = build_copilot_context(
            question
        )

    else:

        context = dict(
            context
        )

        context["question"] = question

    # -----------------------------------------------------
    # API key
    # -----------------------------------------------------

    api_key = os.environ.get(
        "OPENAI_API_KEY"
    )

    if not api_key:

        raise RuntimeError(
            "OPENAI_API_KEY is not configured."
        )

    # -----------------------------------------------------
    # OpenAI client
    # -----------------------------------------------------

    client = OpenAI(
        api_key=api_key
    )

    # -----------------------------------------------------
    # Serialize controlled context
    # -----------------------------------------------------

    context_json = json.dumps(
        context,
        indent=2,
        default=str,
    )

    # -----------------------------------------------------
    # User input
    # -----------------------------------------------------

    user_input = f"""
USER QUESTION
=============

{question}


STOCKPILOT OPERATIONAL DATA
===========================

{context_json}
"""

    # -----------------------------------------------------
    # Responses API
    # -----------------------------------------------------

    response = client.responses.create(
        model=OPENAI_MODEL,

        instructions=(
            COPILOT_INSTRUCTIONS
        ),

        input=user_input,
    )

    # -----------------------------------------------------
    # Extract response
    # -----------------------------------------------------

    text = (
        response.output_text
        or ""
    ).strip()

    if not text:

        raise RuntimeError(
            "The Copilot returned an empty response."
        )

    return text