/* =========================================================
   STOCKPILOT
   Inventory Intelligence Platform
   app.js V4
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "/api";

let productsCache = [];
let categoriesCache = [];
let suppliersCache = [];
let inventoryInsightsCache = [];
let supplierPerformanceCache = [];
let purchaseOrdersCache = [];

let inventoryValueChart = null;
let inventoryHealthChart = null;
let stockCoverageChart = null;


/* =========================================================
   AUTHENTICATION
========================================================= */

function getToken() {
    return localStorage.getItem("access_token");
}


function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    window.location.href = "/login/";

}


/* =========================================================
   API
========================================================= */

async function apiFetch(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };


    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }


    const response = await fetch(
        `${API_BASE}${endpoint}`,
        {
            ...options,
            headers
        }
    );


    if (response.status === 401) {

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        window.location.href = "/login/";

        throw new Error("Authentication expired.");

    }


    let data = null;

    const contentType =
        response.headers.get("content-type") || "";


    if (contentType.includes("application/json")) {

        try {
            data = await response.json();
        }

        catch (error) {
            data = null;
        }

    }


    if (!response.ok) {

        let message =
            `Request failed (${response.status})`;


        if (data) {

            if (typeof data === "string") {
                message = data;
            }

            else if (data.detail) {
                message = data.detail;
            }

            else {

                try {

                    message =
                        Object.entries(data)
                            .map(
                                ([key, value]) =>
                                    `${key}: ${value}`
                            )
                            .join(" | ");

                }

                catch (error) {

                    message =
                        `Request failed (${response.status})`;

                }

            }

        }


        throw new Error(message);

    }


    return data;

}


/* =========================================================
   RESPONSE HELPERS
========================================================= */

function normalizeList(data) {

    if (Array.isArray(data)) {
        return data;
    }


    if (
        data &&
        Array.isArray(data.results)
    ) {
        return data.results;
    }


    return [];

}


/* =========================================================
   DOM HELPERS
========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   NUMBER / CURRENCY HELPERS
========================================================= */

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


function formatNumber(value, decimals = 0) {

    const number =
        safeNumber(value);

    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: decimals
        }
    );

}


function formatCurrency(value) {

    const number =
        safeNumber(value);

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(number);

}


function formatCompactCurrency(value) {

    const number =
        safeNumber(value);


    if (number >= 10000000) {
        return `â‚¹${(
            number / 10000000
        ).toFixed(1)}Cr`;
    }


    if (number >= 100000) {
        return `â‚¹${(
            number / 100000
        ).toFixed(1)}L`;
    }


    if (number >= 1000) {
        return `â‚¹${(
            number / 1000
        ).toFixed(0)}K`;
    }


    return `â‚¹${number}`;

}


/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(value) {

    if (!value) {
        return "â€”";
    }


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {
        return String(value);
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function formatDateTime(value) {

    if (!value) {
        return "â€”";
    }


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {
        return String(value);
    }


    return date.toLocaleString(
        "en-IN"
    );

}


/* =========================================================
   PRODUCT STATUS
========================================================= */

function getProductStatus(product) {

    const quantity =
        safeNumber(product.quantity);


    const threshold =
        safeNumber(
            product.low_stock_threshold ??
            product.threshold
        );


    if (quantity <= 0) {

        return {
            label: "Stockout",
            className: "danger"
        };

    }


    if (quantity <= threshold) {

        return {
            label: "Low Stock",
            className: "warning"
        };

    }


    return {
        label: "Healthy",
        className: "healthy"
    };

}


/* =========================================================
   INVENTORY HEALTH
========================================================= */

function calculateInventoryHealthScore() {

    if (!productsCache.length) {
        return 0;
    }


    let totalScore = 0;


    productsCache.forEach(product => {

        const status =
            getProductStatus(product);


        if (status.label === "Healthy") {
            totalScore += 100;
        }

        else if (status.label === "Low Stock") {
            totalScore += 60;
        }

        else {
            totalScore += 0;
        }

    });


    return Math.round(
        totalScore /
        productsCache.length
    );

}


/* =========================================================
   INVENTORY METRICS
========================================================= */

function calculateInventoryMetrics() {

    let inventoryValue = 0;
    let healthy = 0;
    let lowStock = 0;
    let stockout = 0;


    productsCache.forEach(product => {

        const quantity =
            safeNumber(product.quantity);


        const price =
            safeNumber(product.price);


        inventoryValue +=
            quantity * price;


        const status =
            getProductStatus(product);


        if (status.label === "Healthy") {
            healthy++;
        }

        else if (status.label === "Low Stock") {
            lowStock++;
        }

        else {
            stockout++;
        }

    });


    return {

        inventoryValue,

        totalProducts:
            productsCache.length,

        healthy,

        lowStock,

        stockout,

        health:
            calculateInventoryHealthScore()

    };

}


/* =========================================================
   SECTION NAVIGATION
========================================================= */

function showSection(sectionName) {

    const sections = [

        "dashboard",

        "products",

        "categories",

        "suppliers",

        "supplierIntelligence",

        "movements",

        "purchaseOrders"

    ];


    sections.forEach(section => {

        const element =
            getElement(
                `${section}Section`
            );


        if (element) {

            element.style.display =
                section === sectionName
                    ? "block"
                    : "none";

        }

    });


    const navItems = [

        "dashboardNav",

        "productsNav",

        "categoriesNav",

        "suppliersNav",

        "supplierIntelligenceNav",

        "movementsNav",

        "purchaseOrdersNav"

    ];


    navItems.forEach(id => {

        const element =
            getElement(id);


        if (element) {

            element.classList.remove(
                "active"
            );

        }

    });


    const navMap = {

        dashboard:
            "dashboardNav",

        products:
            "productsNav",

        categories:
            "categoriesNav",

        suppliers:
            "suppliersNav",

        supplierIntelligence:
            "supplierIntelligenceNav",

        movements:
            "movementsNav",

        purchaseOrders:
            "purchaseOrdersNav"

    };


    const activeNav =
        getElement(
            navMap[sectionName]
        );


    if (activeNav) {
        activeNav.classList.add("active");
    }


    /* -----------------------------------------------------
       SECTION LOADERS
    ----------------------------------------------------- */

    if (sectionName === "dashboard") {

        loadDashboard();

        loadInventoryIntelligence();

        loadSupplierPerformance();

    }


    if (sectionName === "products") {
        loadProducts();
    }


    if (sectionName === "categories") {
        loadCategoryTable();
    }


    if (sectionName === "suppliers") {
        loadSupplierTable();
    }


    if (
        sectionName ===
        "supplierIntelligence"
    ) {
        loadSupplierPerformance();
    }


    if (
        sectionName ===
        "movements"
    ) {
        loadMovementTable();
    }


    if (
        sectionName ===
        "purchaseOrders"
    ) {
        loadPurchaseOrders();
    }

}


/* =========================================================
   CATEGORY MANAGEMENT
========================================================= */

async function loadCategories() {

    try {

        const data =
            await apiFetch(
                "/categories/"
            );


        categoriesCache =
            normalizeList(data);


        populateCategorySelect();

    }

    catch (error) {

        console.error(
            "Category loading error:",
            error
        );

    }

}


function populateCategorySelect() {

    const select =
        getElement(
            "productCategory"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select category
        </option>
    `;


    categoriesCache.forEach(category => {

        select.innerHTML += `
            <option value="${category.id}">
                ${escapeHtml(category.name)}
            </option>
        `;

    });

}


async function loadCategoryTable() {

    const tableBody =
        getElement(
            "categoryTableBody"
        );


    if (!tableBody) {
        return;
    }


    try {

        tableBody.innerHTML = "";


        if (
            categoriesCache.length === 0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="4"
                        class="text-center text-muted py-4">
                        No categories found.
                    </td>
                </tr>
            `;

            return;

        }


        categoriesCache.forEach(category => {

            const productCount =
                category.product_count ??
                category.products_count ??
                category.products?.length ??
                0;


            tableBody.innerHTML += `
                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(category.name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            category.description || "â€”"
                        )}
                    </td>

                    <td>
                        ${formatNumber(productCount)}
                    </td>

                    <td class="text-end">

                        <button
                            class="btn btn-sm btn-outline-danger"
                            onclick="deleteCategory(${category.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;

        });

    }

    catch (error) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="4"
                    class="text-center text-danger py-4">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

    }

}


function openAddCategoryModal() {

    const form =
        getElement("categoryForm");


    if (form) {
        form.reset();
    }


    const errorElement =
        getElement("categoryError");


    if (errorElement) {

        errorElement.style.display =
            "none";

        errorElement.textContent =
            "";

    }


    const modalElement =
        getElement("categoryModal");


    if (modalElement) {

        bootstrap.Modal
            .getOrCreateInstance(
                modalElement
            )
            .show();

    }

}


async function saveCategory() {

    const name =
        getElement(
            "categoryName"
        )?.value.trim();


    const description =
        getElement(
            "categoryDescription"
        )?.value.trim();


    const errorElement =
        getElement(
            "categoryError"
        );


    if (!name) {

        if (errorElement) {

            errorElement.textContent =
                "Category name is required.";

            errorElement.style.display =
                "block";

        }

        return;

    }


    try {

        await apiFetch(
            "/categories/",
            {
                method: "POST",

                body: JSON.stringify({
                    name,
                    description
                })
            }
        );


        const modalElement =
            getElement(
                "categoryModal"
            );


        if (modalElement) {

            bootstrap.Modal
                .getOrCreateInstance(
                    modalElement
                )
                .hide();

        }


        await loadCategories();
        await loadCategoryTable();

    }

    catch (error) {

        if (errorElement) {

            errorElement.textContent =
                error.message;

            errorElement.style.display =
                "block";

        }

    }

}


async function deleteCategory(id) {

    if (
        !confirm(
            "Delete this category?"
        )
    ) {
        return;
    }


    try {

        await apiFetch(
            `/categories/${id}/`,
            {
                method: "DELETE"
            }
        );


        await loadCategories();
        await loadCategoryTable();

        await loadProducts();

    }

    catch (error) {

        alert(
            `Unable to delete category: ${error.message}`
        );

    }

}


/* =========================================================
   SUPPLIER MANAGEMENT
========================================================= */

async function loadSuppliers() {

    try {

        const data =
            await apiFetch(
                "/suppliers/"
            );


        suppliersCache =
            normalizeList(data);


        populateSupplierSelect();

        populatePOSupplierSelect();

    }

    catch (error) {

        console.error(
            "Supplier loading error:",
            error
        );

    }

}


function populateSupplierSelect() {

    const select =
        getElement(
            "productSupplier"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            No supplier
        </option>
    `;


    suppliersCache.forEach(supplier => {

        select.innerHTML += `
            <option value="${supplier.id}">
                ${escapeHtml(supplier.name)}
            </option>
        `;

    });

}


function populatePOSupplierSelect() {

    const select =
        getElement(
            "purchaseOrderSupplier"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select supplier
        </option>
    `;


    suppliersCache.forEach(supplier => {

        select.innerHTML += `
            <option value="${supplier.id}">
                ${escapeHtml(supplier.name)}
            </option>
        `;

    });

}


async function loadSupplierTable() {

    const tableBody =
        getElement(
            "supplierTableBody"
        );


    if (!tableBody) {
        return;
    }


    try {

        tableBody.innerHTML = "";


        if (
            suppliersCache.length === 0
        ) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6"
                        class="text-center text-muted py-4">
                        No suppliers found.
                    </td>
                </tr>
            `;

            return;

        }


        suppliersCache.forEach(supplier => {

            const created =
                supplier.created_at
                    ? new Date(
                        supplier.created_at
                    ).toLocaleDateString(
                        "en-IN"
                    )
                    : "â€”";


            tableBody.innerHTML += `
                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                supplier.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.email || "â€”"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.phone || "â€”"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            supplier.address || "â€”"
                        )}
                    </td>

                    <td>
                        ${created}
                    </td>

                    <td class="text-end">

                        <button
                            class="btn btn-sm btn-outline-danger"
                            onclick="deleteSupplier(${supplier.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>
            `;

        });

    }

    catch (error) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-danger py-4">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

    }

}


async function saveSupplier() {

    const name =
        getElement(
            "supplierName"
        )?.value.trim();


    const email =
        getElement(
            "supplierEmail"
        )?.value.trim();


    const phone =
        getElement(
            "supplierPhone"
        )?.value.trim();


    const address =
        getElement(
            "supplierAddress"
        )?.value.trim();


    const errorElement =
        getElement(
            "supplierError"
        );


    if (!name) {

        if (errorElement) {

            errorElement.textContent =
                "Supplier name is required.";

            errorElement.style.display =
                "block";

        }

        return;

    }


    try {

        await apiFetch(
            "/suppliers/",
            {
                method: "POST",

                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    address
                })
            }
        );


        const modalElement =
            getElement(
                "supplierModal"
            );


        if (modalElement) {

            bootstrap.Modal
                .getOrCreateInstance(
                    modalElement
                )
                .hide();

        }


        await loadSuppliers();
        await loadSupplierTable();

        await loadProducts();

    }

    catch (error) {

        if (errorElement) {

            errorElement.textContent =
                error.message;

            errorElement.style.display =
                "block";

        }

    }

}


async function deleteSupplier(id) {

    if (
        !confirm(
            "Delete this supplier?"
        )
    ) {
        return;
    }


    try {

        await apiFetch(
            `/suppliers/${id}/`,
            {
                method: "DELETE"
            }
        );


        await loadSuppliers();
        await loadSupplierTable();

        await loadProducts();

    }

    catch (error) {

        alert(
            `Unable to delete supplier: ${error.message}`
        );

    }

}


/* =========================================================
   PRODUCT MANAGEMENT
========================================================= */

async function loadProducts() {

    try {

        const data =
            await apiFetch(
                "/products/"
            );


        productsCache =
            normalizeList(data);


        displayProducts(
            productsCache
        );


        updateDashboardMetrics();


        populateMovementProducts();

        populatePOProductSelect();


        renderInventoryValueChart();

        renderInventoryHealthChart();

        renderStockCoverageChart();

    }

    catch (error) {

        console.error(
            "Product loading error:",
            error
        );


        const tableBody =
            getElement(
                "productTableBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8"
                        class="text-center text-danger py-4">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;

        }

    }

}


function displayProducts(products) {

    const tableBody =
        getElement(
            "productTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = "";


    if (!products.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8"
                    class="text-center text-muted py-4">
                    No products found.
                </td>
            </tr>
        `;

        return;

    }


    products.forEach(product => {

        const status =
            getProductStatus(product);


        tableBody.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(product.name)}
                    </strong>
                </td>

                <td>
                    <span class="mono">
                        ${escapeHtml(product.sku)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        product.category_name || "â€”"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        product.supplier_name || "â€”"
                    )}
                </td>

                <td>
                    ${formatCurrency(product.price)}
                </td>

                <td>
                    ${formatNumber(product.quantity)}
                </td>

                <td>
                    <span
                        class="status-badge ${status.className}">
                        ${status.label}
                    </span>
                </td>

                <td class="text-end">

                    <button
                        class="btn btn-sm btn-outline-secondary me-1"
                        onclick="editProduct(${product.id})">
                        Edit
                    </button>

                    <button
                        class="btn btn-sm btn-outline-danger"
                        onclick="deleteProduct(${product.id})">
                        Delete
                    </button>

                </td>

            </tr>
        `;

    });

}


function searchProducts() {

    const input =
        getElement(
            "searchInput"
        );


    if (!input) {
        return;
    }


    const query =
        input.value
            .trim()
            .toLowerCase();


    if (!query) {

        displayProducts(
            productsCache
        );

        return;

    }


    const filtered =
        productsCache.filter(product => {

            return (

                String(product.name || "")
                    .toLowerCase()
                    .includes(query)

                ||

                String(product.sku || "")
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    product.category_name || ""
                )
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    product.supplier_name || ""
                )
                    .toLowerCase()
                    .includes(query)

            );

        });


    displayProducts(filtered);

}


function openAddProductModal() {

    const form =
        getElement(
            "productForm"
        );


    if (form) {
        form.reset();
    }


    const id =
        getElement(
            "productId"
        );


    if (id) {
        id.value = "";
    }


    const title =
        getElement(
            "productModalTitle"
        );


    if (title) {
        title.textContent = "Add Product";
    }


    const error =
        getElement(
            "productError"
        );


    if (error) {

        error.style.display = "none";
        error.textContent = "";

    }


    populateCategorySelect();
    populateSupplierSelect();


    const modal =
        getElement(
            "productModal"
        );


    if (modal) {

        bootstrap.Modal
            .getOrCreateInstance(modal)
            .show();

    }

}


async function saveProduct() {

    const id =
        getElement(
            "productId"
        )?.value;


    const payload = {

        name:
            getElement(
                "productName"
            )?.value.trim(),

        sku:
            getElement(
                "productSku"
            )?.value.trim(),

        description:
            getElement(
                "productDescription"
            )?.value.trim(),

        price:
            getElement(
                "productPrice"
            )?.value,

        quantity:
            getElement(
                "productQuantity"
            )?.value,

        low_stock_threshold:
            getElement(
                "productThreshold"
            )?.value,

        category:
            getElement(
                "productCategory"
            )?.value || null,

        supplier:
            getElement(
                "productSupplier"
            )?.value || null

    };


    const error =
        getElement(
            "productError"
        );


    if (
        !payload.name ||
        !payload.sku
    ) {

        if (error) {

            error.textContent =
                "Product name and SKU are required.";

            error.style.display =
                "block";

        }

        return;

    }


    try {

        await apiFetch(
            id
                ? `/products/${id}/`
                : "/products/",
            {
                method:
                    id ? "PUT" : "POST",

                body:
                    JSON.stringify(payload)
            }
        );


        const modal =
            getElement(
                "productModal"
            );


        if (modal) {

            bootstrap.Modal
                .getOrCreateInstance(modal)
                .hide();

        }


        await loadProducts();

        await loadInventoryIntelligence();

        await loadDashboard();

    }

    catch (errorObject) {

        if (error) {

            error.textContent =
                errorObject.message;

            error.style.display =
                "block";

        }

    }

}


function editProduct(id) {

    const product =
        productsCache.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!product) {
        return;
    }


    getElement("productId").value =
        product.id;


    getElement("productName").value =
        product.name || "";


    getElement("productSku").value =
        product.sku || "";


    getElement("productDescription").value =
        product.description || "";


    getElement("productPrice").value =
        product.price ?? "";


    getElement("productQuantity").value =
        product.quantity ?? "";


    getElement("productThreshold").value =
        product.low_stock_threshold ??
        product.threshold ??
        "";


    populateCategorySelect();
    populateSupplierSelect();


    getElement("productCategory").value =
        product.category ?? "";


    getElement("productSupplier").value =
        product.supplier ?? "";


    getElement("productModalTitle").textContent =
        "Edit Product";


    const error =
        getElement(
            "productError"
        );


    if (error) {

        error.style.display = "none";
        error.textContent = "";

    }


    const modal =
        getElement(
            "productModal"
        );


    if (modal) {

        bootstrap.Modal
            .getOrCreateInstance(modal)
            .show();

    }

}


async function deleteProduct(id) {

    if (
        !confirm(
            "Delete this product?"
        )
    ) {
        return;
    }


    try {

        await apiFetch(
            `/products/${id}/`,
            {
                method: "DELETE"
            }
        );


        await loadProducts();

        await loadInventoryIntelligence();

        await loadDashboard();

    }

    catch (error) {

        alert(
            `Unable to delete product: ${error.message}`
        );

    }

}


/* =========================================================
   STOCK MOVEMENTS
========================================================= */

function populateMovementProducts() {

    const select =
        getElement(
            "movementProduct"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select product
        </option>
    `;


    productsCache.forEach(product => {

        select.innerHTML += `
            <option value="${product.id}">
                ${escapeHtml(product.name)}
                â€” ${escapeHtml(product.sku)}
            </option>
        `;

    });

}


async function loadMovementProducts() {
    populateMovementProducts();
}


async function loadMovementTable() {

    const tableBody =
        getElement(
            "movementTableBody"
        );


    if (!tableBody) {
        return;
    }


    try {

        const data =
            await apiFetch(
                "/stock-movements/"
            );


        const movements =
            normalizeList(data);


        tableBody.innerHTML = "";


        if (!movements.length) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="text-center text-muted py-4">
                        No stock movements found.
                    </td>
                </tr>
            `;

            return;

        }


        movements.forEach(movement => {

            const type =
                String(
                    movement.movement_type || ""
                ).toUpperCase();


            const badgeClass =
                type === "IN"
                    ? "healthy"
                    : "danger";


            tableBody.innerHTML += `
                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                movement.product_name || "â€”"
                            )}
                        </strong>
                    </td>

                    <td>
                        <span
                            class="status-badge ${badgeClass}">
                            ${escapeHtml(type)}
                        </span>
                    </td>

                    <td>
                        ${formatNumber(
                            movement.quantity
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            movement.reason || "â€”"
                        )}
                    </td>

                    <td>
                        ${formatDateTime(
                            movement.created_at
                        )}
                    </td>

                </tr>
            `;

        });

    }

    catch (error) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center text-danger py-4">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;

    }

}


async function saveMovement() {

    const product =
        getElement(
            "movementProduct"
        )?.value;


    const movementType =
        getElement(
            "movementType"
        )?.value;


    const quantity =
        getElement(
            "movementQuantity"
        )?.value;


    const reason =
        getElement(
            "movementReason"
        )?.value.trim();


    const error =
        getElement(
            "movementError"
        );


    if (
        !product ||
        !movementType ||
        !quantity
    ) {

        if (error) {

            error.textContent =
                "Product, movement type, and quantity are required.";

            error.style.display =
                "block";

        }

        return;

    }


    try {

        await apiFetch(
            "/stock-movements/",
            {
                method: "POST",

                body: JSON.stringify({

                    product,

                    movement_type:
                        movementType,

                    quantity,

                    reason

                })
            }
        );


        const modal =
            getElement(
                "movementModal"
            );


        if (modal) {

            bootstrap.Modal
                .getOrCreateInstance(modal)
                .hide();

        }


        await loadProducts();

        await loadMovementTable();

        await loadInventoryIntelligence();

        await loadDashboard();

    }

    catch (errorObject) {

        if (error) {

            error.textContent =
                errorObject.message;

            error.style.display =
                "block";

        }

    }

}


/* =========================================================
   DASHBOARD METRICS
========================================================= */

function updateDashboardMetrics() {

    const metrics =
        calculateInventoryMetrics();


    const inventoryValue =
        getElement(
            "inventoryValue"
        );


    if (inventoryValue) {
        inventoryValue.textContent =
            formatCurrency(
                metrics.inventoryValue
            );
    }


    const totalProducts =
        getElement(
            "totalProducts"
        );


    if (totalProducts) {
        totalProducts.textContent =
            formatNumber(
                metrics.totalProducts
            );
    }


    const lowStockProducts =
        getElement(
            "lowStockProducts"
        );


    if (lowStockProducts) {
        lowStockProducts.textContent =
            formatNumber(
                metrics.lowStock
            );
    }


    const inventoryHealth =
        getElement(
            "inventoryHealth"
        );


    if (inventoryHealth) {
        inventoryHealth.textContent =
            metrics.health;
    }


    const healthyStockCount =
        getElement(
            "healthyStockCount"
        );


    if (healthyStockCount) {
        healthyStockCount.textContent =
            formatNumber(
                metrics.healthy
            );
    }


    const statusLowStockCount =
        getElement(
            "statusLowStockCount"
        );


    if (statusLowStockCount) {
        statusLowStockCount.textContent =
            formatNumber(
                metrics.lowStock
            );
    }


    const stockoutRiskCount =
        getElement(
            "stockoutRiskCount"
        );


    if (stockoutRiskCount) {
        stockoutRiskCount.textContent =
            formatNumber(
                metrics.stockout
            );
    }


    const healthLabel =
        getElement(
            "dashboardHealthLabel"
        );


    if (healthLabel) {
        healthLabel.textContent =
            `${metrics.health}%`;
    }


    const progress =
        getElement(
            "dashboardHealthProgress"
        );


    if (progress) {
        progress.style.width =
            `${metrics.health}%`;
    }


    renderInventoryHealthChart();

}


/* =========================================================
   DASHBOARD PRODUCT OVERVIEW
========================================================= */

function loadDashboardProducts() {

    const tableBody =
        getElement(
            "dashboardProductTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = "";


    if (!productsCache.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-muted py-4">
                    No products found.
                </td>
            </tr>
        `;

        return;

    }


    const products =
        [...productsCache]
            .sort(
                (a, b) =>
                    safeNumber(a.quantity) -
                    safeNumber(b.quantity)
            )
            .slice(0, 8);


    products.forEach(product => {

        const status =
            getProductStatus(product);


        const value =
            safeNumber(product.price) *
            safeNumber(product.quantity);


        tableBody.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(product.name)}
                    </strong>
                </td>

                <td>
                    <span class="mono">
                        ${escapeHtml(product.sku)}
                    </span>
                </td>

                <td>
                    ${escapeHtml(
                        product.category_name || "â€”"
                    )}
                </td>

                <td>
                    ${formatNumber(product.quantity)}
                </td>

                <td>
                    ${formatCurrency(value)}
                </td>

                <td>
                    <span
                        class="status-badge ${status.className}">
                        ${status.label}
                    </span>
                </td>

            </tr>
        `;

    });

}


/* =========================================================
   ATTENTION CENTER
========================================================= */

function renderAttentionCenter() {

    const container =
        getElement(
            "attentionCenter"
        );


    if (!container) {
        return;
    }


    const issues = [];


    productsCache.forEach(product => {

        const quantity =
            safeNumber(
                product.quantity
            );


        const threshold =
            safeNumber(
                product.low_stock_threshold ??
                product.threshold
            );


        if (quantity <= 0) {

            issues.push({

                priority: 1,

                icon: "!",

                title:
                    `${product.name} is out of stock`,

                description:
                    "Immediate replenishment is required."

            });

        }

        else if (
            quantity <= threshold
        ) {

            issues.push({

                priority: 2,

                icon: "â†‘",

                title:
                    `${product.name} needs replenishment`,

                description:
                    `${formatNumber(quantity)} units remaining against a threshold of ${formatNumber(threshold)}.`

            });

        }

    });


    inventoryInsightsCache.forEach(insight => {

        const risk =
            String(
                insight.risk_level ??
                insight.risk ??
                ""
            ).toUpperCase();


        const productName =
            insight.product_name ??
            insight.name ??
            "Product";


        if (
            risk === "HIGH" ||
            risk === "CRITICAL"
        ) {

            const exists =
                issues.some(
                    issue =>
                        issue.title.includes(
                            productName
                        )
                );


            if (!exists) {

                issues.push({

                    priority: 1,

                    icon: "!",

                    title:
                        `${productName} has elevated stockout risk`,

                    description:
                        insight.recommended_action ??
                        insight.action ??
                        "Review replenishment requirements."

                });

            }

        }

    });


    issues.sort(
        (a, b) =>
            a.priority -
            b.priority
    );


    const topIssues =
        issues.slice(0, 5);


    if (!topIssues.length) {

        container.innerHTML = `
            <div class="attention-item">

                <div
                    class="attention-icon"
                    style="
                        border-color:rgba(57,217,138,.2);
                        color:#39d98a;
                    "
                >
                    âœ“
                </div>

                <div class="attention-content">

                    <div class="attention-title">
                        Inventory is under control
                    </div>

                    <div class="attention-description">
                        No critical inventory actions were detected.
                    </div>

                </div>

            </div>
        `;

        return;

    }


    container.innerHTML =
        topIssues
            .map(issue => {

                return `
                    <div class="attention-item">

                        <div class="attention-icon">
                            ${issue.icon}
                        </div>

                        <div class="attention-content">

                            <div class="attention-title">
                                ${escapeHtml(
                                    issue.title
                                )}
                            </div>

                            <div class="attention-description">
                                ${escapeHtml(
                                    issue.description
                                )}
                            </div>

                        </div>

                    </div>
                `;

            })
            .join("");

}


/* =========================================================
   INVENTORY VALUE CHART
========================================================= */

function renderInventoryValueChart() {

    const canvas =
        getElement(
            "inventoryValueChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    const labels =
        productsCache.map(
            product =>
                product.name
        );


    const values =
        productsCache.map(
            product =>
                safeNumber(product.price) *
                safeNumber(product.quantity)
        );


    if (inventoryValueChart) {
        inventoryValueChart.destroy();
    }


    inventoryValueChart =
        new Chart(
            canvas,
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Inventory Value",

                            data:
                                values,

                            backgroundColor:
                                "rgba(37,137,255,.78)",

                            borderColor:
                                "#2589ff",

                            borderWidth:
                                1,

                            borderRadius:
                                5,

                            maxBarThickness:
                                80

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        intersect:
                            false,

                        mode:
                            "index"

                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        ` ${formatCurrency(
                                            context.raw
                                        )}`

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                color:
                                    "#66748a",

                                font: {

                                    family:
                                        "Inter",

                                    size:
                                        10

                                }

                            }

                        },

                        y: {

                            beginAtZero: true,

                            grid: {

                                color:
                                    "rgba(255,255,255,.045)"

                            },

                            ticks: {

                                color:
                                    "#66748a",

                                font: {

                                    family:
                                        "JetBrains Mono",

                                    size:
                                        9

                                },

                                callback:
                                    value =>
                                        formatCompactCurrency(
                                            value
                                        )

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   INVENTORY HEALTH CHART
========================================================= */

function renderInventoryHealthChart() {

    const canvas =
        getElement(
            "inventoryHealthChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    const metrics =
        calculateInventoryMetrics();


    if (inventoryHealthChart) {
        inventoryHealthChart.destroy();
    }


    inventoryHealthChart =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels: [

                        "Healthy",

                        "Low Stock",

                        "Stockout"

                    ],

                    datasets: [

                        {

                            data: [

                                metrics.healthy,

                                metrics.lowStock,

                                metrics.stockout

                            ],

                            backgroundColor: [

                                "#39d98a",

                                "#f5b942",

                                "#ff5d73"

                            ],

                            borderColor:
                                "#0e1219",

                            borderWidth:
                                4,

                            hoverOffset:
                                6

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "70%",

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                color:
                                    "#7d8ba0",

                                padding:
                                    16,

                                usePointStyle:
                                    true,

                                pointStyle:
                                    "circle",

                                font: {

                                    family:
                                        "Inter",

                                    size:
                                        10

                                }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   STOCK COVERAGE CHART
========================================================= */

function renderStockCoverageChart() {

    const canvas =
        getElement(
            "stockCoverageChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {
        return;
    }


    if (
        !inventoryInsightsCache.length
    ) {

        if (stockCoverageChart) {

            stockCoverageChart.destroy();

            stockCoverageChart =
                null;

        }

        return;

    }


    const labels =
        inventoryInsightsCache.map(
            insight =>
                insight.product_name ??
                insight.name ??
                "Product"
        );


    const coverage =
        inventoryInsightsCache.map(
            insight => {

                const value =
                    insight.days_of_stock ??
                    insight.days_of_stock_remaining ??
                    insight.stock_coverage_days ??
                    insight.coverage_days ??
                    insight.days_remaining;


                return safeNumber(
                    value,
                    0
                );

            }
        );


    if (stockCoverageChart) {
        stockCoverageChart.destroy();
    }


    stockCoverageChart =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Days of Stock",

                            data:
                                coverage,

                            backgroundColor:
                                "rgba(37,137,255,.72)",

                            borderColor:
                                "#2589ff",

                            borderWidth:
                                1,

                            borderRadius:
                                5,

                            maxBarThickness:
                                70

                        }

                    ]

                },

                options: {

                    indexAxis:
                        "y",

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        ` ${formatNumber(
                                            context.raw,
                                            1
                                        )} days`

                            }

                        }

                    },

                    scales: {

                        x: {

                            beginAtZero:
                                true,

                            grid: {

                                color:
                                    "rgba(255,255,255,.045)"

                            },

                            ticks: {

                                color:
                                    "#66748a",

                                font: {

                                    family:
                                        "JetBrains Mono",

                                    size:
                                        9

                                },

                                callback:
                                    value =>
                                        `${value}d`

                            }

                        },

                        y: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                color:
                                    "#7d8ba0",

                                font: {

                                    family:
                                        "Inter",

                                    size:
                                        10

                                }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   INVENTORY INTELLIGENCE
========================================================= */

async function loadInventoryIntelligence() {

    try {

        const data =
            await apiFetch(
                "/inventory-insights/"
            );


        inventoryInsightsCache =
            normalizeList(data);


        renderInventoryIntelligence();

        renderStockCoverageChart();

        renderAttentionCenter();

    }

    catch (error) {

        console.error(
            "Inventory intelligence error:",
            error
        );

    }

}


function renderInventoryIntelligence() {

    const tableBody =
        getElement(
            "inventoryIntelligenceTableBody"
        );


    if (!tableBody) {
        return;
    }


    const totalCount =
        getElement(
            "intelligenceProductsCount"
        );


    const riskCount =
        getElement(
            "intelligenceRiskCount"
        );


    const reorderCount =
        getElement(
            "intelligenceReorderCount"
        );


    if (totalCount) {

        totalCount.textContent =
            formatNumber(
                inventoryInsightsCache.length
            );

    }


    const highRisk =
        inventoryInsightsCache.filter(
            insight => {

                const risk =
                    String(
                        insight.risk_level ??
                        insight.risk ??
                        ""
                    ).toUpperCase();


                return (
                    risk === "HIGH" ||
                    risk === "CRITICAL"
                );

            }
        );


    if (riskCount) {

        riskCount.textContent =
            formatNumber(
                highRisk.length
            );

    }


    const reorderCountValue =
        inventoryInsightsCache.filter(
            insight => {

                const action =
                    String(
                        insight.recommended_action ??
                        insight.action ??
                        ""
                    ).toLowerCase();


                return (

                    action.includes("reorder")

                    ||

                    action.includes("restock")

                    ||

                    action.includes("purchase")

                );

            }
        ).length;


    if (reorderCount) {

        reorderCount.textContent =
            formatNumber(
                reorderCountValue
            );

    }


    tableBody.innerHTML = "";


    if (
        !inventoryInsightsCache.length
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-muted py-4">
                    No inventory intelligence available.
                </td>
            </tr>
        `;

        return;

    }


    inventoryInsightsCache.forEach(insight => {

        const productName =
            insight.product_name ??
            insight.name ??
            "Unknown Product";


        const stock =
            insight.current_stock ??
            insight.quantity ??
            insight.stock ??
            0;


        const demand =
            insight.average_daily_demand ??
            insight.daily_demand ??
            insight.demand_velocity ??
            0;


        const coverage =
            insight.days_of_stock ??
            insight.days_of_stock_remaining ??
            insight.stock_coverage_days ??
            insight.coverage_days ??
            insight.days_remaining;


        const risk =
            String(
                insight.risk_level ??
                insight.risk ??
                "UNKNOWN"
            ).toUpperCase();


        const action =
            insight.recommended_action ??
            insight.action ??
            "Monitor";


        let riskClass =
            "healthy";


        if (
            risk === "HIGH" ||
            risk === "CRITICAL"
        ) {
            riskClass = "danger";
        }

        else if (
            risk === "MEDIUM" ||
            risk === "MODERATE"
        ) {
            riskClass = "warning";
        }


        tableBody.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(productName)}
                    </strong>
                </td>

                <td>
                    ${formatNumber(stock)}
                </td>

                <td>
                    ${formatNumber(
                        demand,
                        2
                    )}
                </td>

                <td>
                    ${
                        coverage !== undefined &&
                        coverage !== null
                            ? `${formatNumber(
                                coverage,
                                1
                            )} days`
                            : "â€”"
                    }
                </td>

                <td>
                    <span
                        class="status-badge ${riskClass}">
                        ${escapeHtml(risk)}
                    </span>
                </td>

                <td>
                    <span
                        style="
                            color:#9aa8bb;
                            font-size:11px;
                        "
                    >
                        ${escapeHtml(action)}
                    </span>
                </td>

            </tr>
        `;

    });

}


/* =========================================================
   SUPPLIER INTELLIGENCE
========================================================= */

async function loadSupplierPerformance() {

    try {

        const data =
            await apiFetch(
                "/supplier-performance/"
            );


        supplierPerformanceCache =
            normalizeList(data);


        renderSupplierPerformance();

    }

    catch (error) {

        console.error(
            "Supplier performance error:",
            error
        );

    }

}


function renderSupplierPerformance() {

    const suppliers =
        supplierPerformanceCache;


    const total =
        suppliers.length;


    const healthy =
        suppliers.filter(
            supplier =>
                String(
                    supplier.risk_level || ""
                ).toUpperCase() ===
                "LOW"
        ).length;


    const atRisk =
        suppliers.filter(
            supplier => {

                const risk =
                    String(
                        supplier.risk_level || ""
                    ).toUpperCase();


                return (
                    risk === "HIGH" ||
                    risk === "MEDIUM"
                );

            }
        ).length;


    const scores =
        suppliers
            .map(
                supplier =>
                    safeNumber(
                        supplier.health_score,
                        null
                    )
            )
            .filter(
                score =>
                    score !== null
            );


    const averageHealth =
        scores.length
            ? Math.round(
                scores.reduce(
                    (sum, score) =>
                        sum + score,
                    0
                ) /
                scores.length
            )
            : 0;


    const totalElement =
        getElement(
            "supplierTotalCount"
        );


    const healthyElement =
        getElement(
            "supplierHealthyCount"
        );


    const riskElement =
        getElement(
            "supplierRiskCount"
        );


    const averageElement =
        getElement(
            "supplierAverageHealth"
        );


    if (totalElement) {
        totalElement.textContent =
            formatNumber(total);
    }


    if (healthyElement) {
        healthyElement.textContent =
            formatNumber(healthy);
    }


    if (riskElement) {
        riskElement.textContent =
            formatNumber(atRisk);
    }


    if (averageElement) {
        averageElement.textContent =
            formatNumber(
                averageHealth
            );
    }


    const dashboardTotal =
        getElement(
            "dashboardSupplierTotalCount"
        );


    const dashboardHealthy =
        getElement(
            "dashboardSupplierHealthyCount"
        );


    const dashboardRisk =
        getElement(
            "dashboardSupplierRiskCount"
        );


    const dashboardAverage =
        getElement(
            "dashboardSupplierAverageHealth"
        );


    if (dashboardTotal) {
        dashboardTotal.textContent =
            formatNumber(total);
    }


    if (dashboardHealthy) {
        dashboardHealthy.textContent =
            formatNumber(healthy);
    }


    if (dashboardRisk) {
        dashboardRisk.textContent =
            formatNumber(atRisk);
    }


    if (dashboardAverage) {
        dashboardAverage.textContent =
            formatNumber(averageHealth);
    }


    const tableBody =
        getElement(
            "supplierPerformanceTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = "";


    if (!suppliers.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="6"
                    class="text-center text-muted py-4">
                    No supplier performance data available.
                </td>
            </tr>
        `;


        renderSupplierAttention([]);

        return;

    }


    suppliers.forEach(supplier => {

        const health =
            safeNumber(
                supplier.health_score
            );


        const risk =
            String(
                supplier.risk_level ||
                "NO DATA"
            ).toUpperCase();


        let riskClass =
            "healthy";


        if (risk === "HIGH") {
            riskClass = "danger";
        }

        else if (risk === "MEDIUM") {
            riskClass = "warning";
        }


        tableBody.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(
                            supplier.supplier_name
                        )}
                    </strong>
                </td>

                <td>
                    <strong>
                        ${formatNumber(health)}
                    </strong>
                </td>

                <td>
                    ${formatNumber(
                        supplier.on_time_delivery_rate,
                        1
                    )}%
                </td>

                <td>
                    ${formatNumber(
                        supplier.average_lead_time_days,
                        1
                    )} days
                </td>

                <td>
                    ${formatNumber(
                        supplier.fulfillment_rate,
                        1
                    )}%
                </td>

                <td>
                    <span
                        class="status-badge ${riskClass}">
                        ${escapeHtml(risk)}
                    </span>
                </td>

            </tr>
        `;

    });


    renderSupplierAttention(
        suppliers
    );

}


function renderSupplierAttention(
    suppliers
) {

    const container =
        getElement(
            "supplierAttentionCenter"
        );


    if (!container) {
        return;
    }


    const riskySuppliers =
        suppliers.filter(
            supplier => {

                const risk =
                    String(
                        supplier.risk_level ||
                        ""
                    ).toUpperCase();


                return (
                    risk === "HIGH" ||
                    risk === "MEDIUM"
                );

            }
        );


    if (!riskySuppliers.length) {

        container.innerHTML = `
            <div class="attention-item">

                <div
                    class="attention-icon"
                    style="
                        border-color:rgba(57,217,138,.2);
                        color:#39d98a;
                    "
                >
                    âœ“
                </div>

                <div class="attention-content">

                    <div class="attention-title">
                        Supplier network is healthy
                    </div>

                    <div class="attention-description">
                        No suppliers currently require priority intervention.
                    </div>

                </div>

            </div>
        `;

        return;

    }


    container.innerHTML =
        riskySuppliers
            .slice(0, 4)
            .map(supplier => {

                return `
                    <div class="attention-item">

                        <div class="attention-icon">
                            !
                        </div>

                        <div class="attention-content">

                            <div class="attention-title">
                                ${escapeHtml(
                                    supplier.supplier_name
                                )}
                            </div>

                            <div class="attention-description">
                                Health score:
                                ${formatNumber(
                                    supplier.health_score
                                )}
                                Â· On-time delivery:
                                ${formatNumber(
                                    supplier.on_time_delivery_rate,
                                    1
                                )}%
                            </div>

                        </div>

                    </div>
                `;

            })
            .join("");

}


/* =========================================================
   PURCHASE ORDERS
========================================================= */


/* ---------------------------------------------------------
   Purchase Order Cache
--------------------------------------------------------- */

async function loadPurchaseOrders() {

    const tableBody =
        getElement(
            "purchaseOrderTableBody"
        );


    try {

        const data =
            await apiFetch(
                "/purchase-orders/"
            );


        purchaseOrdersCache =
            normalizeList(data);


        renderPurchaseOrderMetrics();

        renderPurchaseOrderTable();

        renderDashboardPurchaseOrders();

    }

    catch (error) {

        console.error(
            "Purchase order loading error:",
            error
        );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="9"
                        class="text-center text-danger py-4">
                        ${escapeHtml(
                            error.message
                        )}
                    </td>
                </tr>
            `;

        }

    }

}


/* ---------------------------------------------------------
   Purchase Order Helpers
--------------------------------------------------------- */

function getPOStatus(po) {

    return String(
        po.status ||
        "PENDING"
    ).toUpperCase();

}


function getPOStatusClass(status) {

    switch (
        String(status).toUpperCase()
    ) {

        case "RECEIVED":
            return "healthy";

        case "PARTIAL":
            return "warning";

        case "CANCELLED":
            return "danger";

        case "PENDING":
        default:
            return "info";

    }

}


function getPOItems(po) {

    return Array.isArray(po.items)
        ? po.items
        : [];

}


function getPOTotalOrdered(po) {

    if (
        po.total_ordered_quantity !==
        undefined
    ) {

        return safeNumber(
            po.total_ordered_quantity
        );

    }


    return getPOItems(po)
        .reduce(
            (total, item) =>
                total +
                safeNumber(item.quantity ?? item.ordered_quantity),
            0
        );

}


function getPOTotalReceived(po) {

    if (
        po.total_received_quantity !==
        undefined
    ) {

        return safeNumber(
            po.total_received_quantity
        );

    }


    return getPOItems(po)
        .reduce(
            (total, item) =>
                total +
                safeNumber(
                    item.received_quantity
                ),
            0
        );

}


function getPOTotalValue(po) {

    if (
        po.total_value !== undefined
    ) {

        return safeNumber(
            po.total_value
        );

    }


    return getPOItems(po)
        .reduce(
            (total, item) => {

                return total +
                    (
                        safeNumber(
                            item.quantity
                        ) *
                        safeNumber(
                            item.unit_cost
                        )
                    );

            },
            0
        );

}


function getPOFulfillment(po) {

    if (
        po.fulfillment_rate !==
        undefined
    ) {

        return safeNumber(
            po.fulfillment_rate
        );

    }


    const ordered =
        getPOTotalOrdered(po);


    const received =
        getPOTotalReceived(po);


    if (!ordered) {
        return 0;
    }


    return (
        received /
        ordered
    ) * 100;

}


function isPOOverdue(po) {

    const status =
        getPOStatus(po);


    if (
        status === "RECEIVED" ||
        status === "CANCELLED"
    ) {
        return false;
    }


    if (!po.expected_delivery) {
        return false;
    }


    const expected =
        new Date(
            `${po.expected_delivery}T23:59:59`
        );


    return expected < new Date();

}


/* ---------------------------------------------------------
   Purchase Order Metrics
--------------------------------------------------------- */

function calculatePurchaseOrderMetrics() {

    const orders =
        purchaseOrdersCache;


    const openOrders =
        orders.filter(po => {

            const status =
                getPOStatus(po);

            return (
                status === "PENDING" ||
                status === "PARTIAL"
            );

        });


    const overdueOrders =
        orders.filter(
            isPOOverdue
        );


    const partialOrders =
        orders.filter(
            po =>
                getPOStatus(po) ===
                "PARTIAL"
        );


    const totalValue =
        orders.reduce(
            (total, po) =>
                total +
                getPOTotalValue(po),
            0
        );


    return {

        totalOrders:
            orders.length,

        openOrders:
            openOrders.length,

        overdueOrders:
            overdueOrders.length,

        partialOrders:
            partialOrders.length,

        totalValue

    };

}


/* ---------------------------------------------------------
   Purchase Order KPI Rendering
--------------------------------------------------------- */

function renderPurchaseOrderMetrics() {

    const metrics =
        calculatePurchaseOrderMetrics();


    const map = {

        purchaseOrdersOpenCount:
            metrics.openOrders,

        purchaseOrdersOverdueCount:
            metrics.overdueOrders,

        purchaseOrdersPartialCount:
            metrics.partialOrders,

        purchaseOrdersValue:
            formatCurrency(
                metrics.totalValue
            )

    };


    Object.entries(map)
        .forEach(
            ([id, value]) => {

                const element =
                    getElement(id);


                if (element) {
                    element.textContent =
                        value;
                }

            }
        );

}


/* ---------------------------------------------------------
   Purchase Order Table
--------------------------------------------------------- */

function renderPurchaseOrderTable() {

    const tableBody =
        getElement(
            "purchaseOrderTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = "";


    if (
        !purchaseOrdersCache.length
    ) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9"
                    class="text-center text-muted py-5">

                    <div style="font-size:28px;margin-bottom:8px;">
                        â—«
                    </div>

                    <strong>
                        No purchase orders yet
                    </strong>

                    <div style="margin-top:5px;">
                        Create your first purchase order to start tracking procurement.
                    </div>

                </td>
            </tr>
        `;

        return;

    }


    purchaseOrdersCache.forEach(po => {

        const status =
            getPOStatus(po);


        const statusClass =
            getPOStatusClass(status);


        const ordered =
            getPOTotalOrdered(po);


        const received =
            getPOTotalReceived(po);


        const fulfillment =
            getPOFulfillment(po);


        const value =
            getPOTotalValue(po);


        const overdue =
            isPOOverdue(po);


        const supplierName =
            po.supplier_name ||
            suppliersCache.find(
                supplier =>
                    Number(supplier.id) ===
                    Number(po.supplier)
            )?.name ||
            "â€”";


        tableBody.innerHTML += `
            <tr>

                <td>

                    <button
                        class="btn btn-link p-0 po-number-link"
                        onclick="viewPurchaseOrder(${po.id})"
                    >
                        ${escapeHtml(
                            po.order_number ||
                            `PO-${po.id}`
                        )}
                    </button>

                </td>

                <td>
                    <strong>
                        ${escapeHtml(
                            supplierName
                        )}
                    </strong>
                </td>

                <td>
                    ${formatNumber(
                        ordered
                    )}
                </td>

                <td>
                    ${formatNumber(
                        received
                    )}
                </td>

                <td style="min-width:130px;">

                    <div
                        style="
                            display:flex;
                            align-items:center;
                            gap:8px;
                        "
                    >

                        <div
                            style="
                                height:5px;
                                flex:1;
                                background:rgba(255,255,255,.07);
                                border-radius:99px;
                                overflow:hidden;
                            "
                        >

                            <div
                                style="
                                    width:${Math.min(
                                        fulfillment,
                                        100
                                    )}%;
                                    height:100%;
                                    background:#2589ff;
                                    border-radius:99px;
                                "
                            ></div>

                        </div>

                        <span
                            style="
                                font-size:10px;
                                font-family:'JetBrains Mono',monospace;
                            "
                        >
                            ${formatNumber(
                                fulfillment,
                                0
                            )}%
                        </span>

                    </div>

                </td>

                <td>
                    ${formatCurrency(value)}
                </td>

                <td>

                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${escapeHtml(status)}
                    </span>

                    ${
                        overdue
                            ? `
                                <div
                                    style="
                                        color:#ff5d73;
                                        font-size:10px;
                                        margin-top:4px;
                                    "
                                >
                                    Overdue
                                </div>
                              `
                            : ""
                    }

                </td>

                <td>
                    ${formatDate(
                        po.expected_delivery
                    )}
                </td>

                <td class="text-end">

                    <button
                        class="btn btn-sm btn-outline-secondary"
                        onclick="viewPurchaseOrder(${po.id})"
                    >
                        View
                    </button>

                </td>

            </tr>
        `;

    });

}


/* ---------------------------------------------------------
   Dashboard PO Preview
--------------------------------------------------------- */

function renderDashboardPurchaseOrders() {

    const tableBody =
        getElement(
            "dashboardPurchaseOrderTableBody"
        );


    if (!tableBody) {
        return;
    }


    const orders =
        [...purchaseOrdersCache]
            .sort(
                (a, b) => {

                    const aDate =
                        a.expected_delivery
                            ? new Date(
                                a.expected_delivery
                            ).getTime()
                            : Infinity;


                    const bDate =
                        b.expected_delivery
                            ? new Date(
                                b.expected_delivery
                            ).getTime()
                            : Infinity;


                    return aDate - bDate;

                }
            )
            .slice(0, 5);


    tableBody.innerHTML = "";


    if (!orders.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center text-muted py-4">
                    No purchase orders.
                </td>
            </tr>
        `;

        return;

    }


    orders.forEach(po => {

        const status =
            getPOStatus(po);


        const statusClass =
            getPOStatusClass(status);


        const supplierName =
            po.supplier_name ||
            suppliersCache.find(
                supplier =>
                    Number(supplier.id) ===
                    Number(po.supplier)
            )?.name ||
            "â€”";


        tableBody.innerHTML += `
            <tr>

                <td>
                    <strong>
                        ${escapeHtml(
                            po.order_number ||
                            `PO-${po.id}`
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(
                        supplierName
                    )}
                </td>

                <td>
                    ${formatDate(
                        po.expected_delivery
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        getPOTotalValue(po)
                    )}
                </td>

                <td>
                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${escapeHtml(status)}
                    </span>
                </td>

            </tr>
        `;

    });

}


/* ---------------------------------------------------------
   Generate PO Number
--------------------------------------------------------- */

function generatePurchaseOrderNumber() {

    const year =
        new Date().getFullYear();


    const timestamp =
        Date.now()
            .toString()
            .slice(-6);


    return `PO-${year}-${timestamp}`;

}


/* ---------------------------------------------------------
   PO Product Select
--------------------------------------------------------- */

function populatePOProductSelect() {

    const select =
        getElement(
            "purchaseOrderProduct"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select product
        </option>
    `;


    productsCache.forEach(product => {

        select.innerHTML += `
            <option value="${product.id}">
                ${escapeHtml(product.name)}
                â€” ${escapeHtml(product.sku)}
            </option>
        `;

    });

}


/* ---------------------------------------------------------
   Add PO Item Row
--------------------------------------------------------- */

function addPurchaseOrderItemRow() {

    const container =
        getElement(
            "purchaseOrderItems"
        );


    if (!container) {
        return;
    }


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "purchase-order-item-row";


    row.style.cssText = `
        display:grid;
        grid-template-columns:2fr 1fr 1fr auto;
        gap:10px;
        align-items:end;
        margin-bottom:10px;
    `;


    row.innerHTML = `

        <div>

            <label
                style="
                    font-size:10px;
                    text-transform:uppercase;
                    letter-spacing:.08em;
                    color:#66748a;
                    margin-bottom:5px;
                    display:block;
                "
            >
                Product
            </label>

            <select
                class="form-select po-item-product"
            >

                <option value="">
                    Select product
                </option>

                ${productsCache.map(
                    product => `
                        <option value="${product.id}">
                            ${escapeHtml(product.name)}
                            â€” ${escapeHtml(product.sku)}
                        </option>
                    `
                ).join("")}

            </select>

        </div>


        <div>

            <label
                style="
                    font-size:10px;
                    text-transform:uppercase;
                    letter-spacing:.08em;
                    color:#66748a;
                    margin-bottom:5px;
                    display:block;
                "
            >
                Quantity
            </label>

            <input
                type="number"
                min="1"
                value="1"
                class="form-control po-item-quantity"
            >

        </div>


        <div>

            <label
                style="
                    font-size:10px;
                    text-transform:uppercase;
                    letter-spacing:.08em;
                    color:#66748a;
                    margin-bottom:5px;
                    display:block;
                "
            >
                Unit Cost
            </label>

            <input
                type="number"
                min="0.01"
                step="0.01"
                class="form-control po-item-cost"
                placeholder="â‚¹"
            >

        </div>


        <div>

            <button
                type="button"
                class="btn btn-sm btn-outline-danger po-remove-item"
                title="Remove item"
            >
                Ã—
            </button>

        </div>

    `;


    container.appendChild(row);


    const removeButton =
        row.querySelector(
            ".po-remove-item"
        );


    if (removeButton) {

        removeButton.addEventListener(
            "click",
            () => {

                row.remove();

                updatePurchaseOrderDraftTotal();

            }
        );

    }


    const inputs =
        row.querySelectorAll(
            "input"
        );


    inputs.forEach(input => {

        input.addEventListener(
            "input",
            updatePurchaseOrderDraftTotal
        );

    });

}


/* ---------------------------------------------------------
   PO Draft Total
--------------------------------------------------------- */

function calculatePurchaseOrderDraftTotal() {

    const rows =
        document.querySelectorAll(
            ".purchase-order-item-row"
        );


    let total = 0;


    rows.forEach(row => {

        const quantity =
            safeNumber(
                row.querySelector(
                    ".po-item-quantity"
                )?.value
            );


        const cost =
            safeNumber(
                row.querySelector(
                    ".po-item-cost"
                )?.value
            );


        total +=
            quantity * cost;

    });


    return total;

}


function updatePurchaseOrderDraftTotal() {

    const total =
        calculatePurchaseOrderDraftTotal();


    const element =
        getElement(
            "purchaseOrderDraftTotal"
        );


    if (element) {

        element.textContent =
            formatCurrency(total);

    }

}


/* ---------------------------------------------------------
   Open Create PO Modal
--------------------------------------------------------- */

function openCreatePurchaseOrderModal() {

    const form =
        getElement(
            "purchaseOrderForm"
        );


    if (form) {
        form.reset();
    }


    const error =
        getElement(
            "purchaseOrderError"
        );


    if (error) {

        error.style.display =
            "none";

        error.textContent =
            "";

    }


    const orderNumber =
        getElement(
            "purchaseOrderNumber"
        );


    if (orderNumber) {

        orderNumber.value =
            generatePurchaseOrderNumber();

    }


    const status =
        getElement(
            "purchaseOrderStatus"
        );


    if (status) {

        status.value =
            "PENDING";

    }


    populatePOSupplierSelect();


    populatePOProductSelect();


    const container =
        getElement(
            "purchaseOrderItems"
        );


    if (container) {

        container.innerHTML = "";

        addPurchaseOrderItemRow();

    }


    updatePurchaseOrderDraftTotal();


    const modal =
        getElement(
            "purchaseOrderModal"
        );


    if (modal) {

        bootstrap.Modal
            .getOrCreateInstance(modal)
            .show();

    }

}


/* ---------------------------------------------------------
   Collect PO Items
--------------------------------------------------------- */

function collectPurchaseOrderItems() {

    const rows =
        document.querySelectorAll(
            ".purchase-order-item-row"
        );


    const items = [];


    rows.forEach(row => {

        const product =
            row.querySelector(
                ".po-item-product"
            )?.value;


        const quantity =
            row.querySelector(
                ".po-item-quantity"
            )?.value;


        const unitCost =
            row.querySelector(
                ".po-item-cost"
            )?.value;


        if (
            product &&
            quantity &&
            unitCost
        ) {

            items.push({

                product:
                    Number(product),

                quantity:
                    Number(quantity),

                received_quantity:
                    0,

                unit_cost:
                    Number(unitCost)

            });

        }

    });


    return items;

}


/* ---------------------------------------------------------
   Save Purchase Order
--------------------------------------------------------- */

async function savePurchaseOrder() {

    const supplier =
        getElement(
            "purchaseOrderSupplier"
        )?.value;


    const orderNumber =
        getElement(
            "purchaseOrderNumber"
        )?.value.trim();


    const expectedDelivery =
        getElement(
            "purchaseOrderExpectedDelivery"
        )?.value;


    const status =
        getElement(
            "purchaseOrderStatus"
        )?.value ||
        "PENDING";


    const notes =
        getElement(
            "purchaseOrderNotes"
        )?.value.trim();


    const error =
        getElement(
            "purchaseOrderError"
        );


    const items =
        collectPurchaseOrderItems();


    if (!supplier) {

        if (error) {

            error.textContent =
                "Please select a supplier.";

            error.style.display =
                "block";

        }

        return;

    }


    if (!orderNumber) {

        if (error) {

            error.textContent =
                "Purchase order number is required.";

            error.style.display =
                "block";

        }

        return;

    }


    if (!items.length) {

        if (error) {

            error.textContent =
                "Add at least one valid product item.";

            error.style.display =
                "block";

        }

        return;

    }


    try {

        await apiFetch(
            "/purchase-orders/",
            {
                method: "POST",

                body: JSON.stringify({

                    supplier:
                        Number(supplier),

                    order_number:
                        orderNumber,

                    expected_delivery:
                        expectedDelivery ||
                        null,

                    status,

                    notes,

                    items

                })
            }
        );


        const modal =
            getElement(
                "purchaseOrderModal"
            );


        if (modal) {

            bootstrap.Modal
                .getOrCreateInstance(modal)
                .hide();

        }


        await loadPurchaseOrders();

    }

    catch (errorObject) {

        if (error) {

            error.textContent =
                errorObject.message;

            error.style.display =
                "block";

        }

    }

}


/* ---------------------------------------------------------
   View Purchase Order
--------------------------------------------------------- */

async function viewPurchaseOrder(id) {

    let po =
        purchaseOrdersCache.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    try {

        const fresh =
            await apiFetch(
                `/purchase-orders/${id}/`
            );


        if (fresh) {
            po = fresh;
        }

    }

    catch (error) {

        console.warn(
            "Unable to refresh purchase order:",
            error
        );

    }


    if (!po) {
        return;
    }


    const container =
        getElement(
            "purchaseOrderDetailBody"
        );


    if (!container) {

        alert(
            "Purchase order detail panel is not available in the current dashboard."
        );

        return;

    }


    const supplierName =
        po.supplier_name ||
        suppliersCache.find(
            supplier =>
                Number(supplier.id) ===
                Number(po.supplier)
        )?.name ||
        "â€”";


    const status =
        getPOStatus(po);


    const statusClass =
        getPOStatusClass(status);


    const ordered =
        getPOTotalOrdered(po);


    const received =
        getPOTotalReceived(po);


    const pending =
        Math.max(
            0,
            ordered - received
        );


    const fulfillment =
        getPOFulfillment(po);


    const value =
        getPOTotalValue(po);


    const items =
        getPOItems(po);


    container.innerHTML = `

        <div
            style="
                display:flex;
                justify-content:space-between;
                gap:20px;
                align-items:flex-start;
                margin-bottom:24px;
            "
        >

            <div>

                <div
                    style="
                        color:#66748a;
                        font-size:10px;
                        text-transform:uppercase;
                        letter-spacing:.12em;
                        margin-bottom:6px;
                    "
                >
                    Purchase Order
                </div>

                <h3
                    style="
                        margin:0;
                        font-size:22px;
                    "
                >
                    ${escapeHtml(
                        po.order_number ||
                        `PO-${po.id}`
                    )}
                </h3>

                <div
                    style="
                        color:#7d8ba0;
                        font-size:12px;
                        margin-top:5px;
                    "
                >
                    ${escapeHtml(supplierName)}
                </div>

            </div>


            <span
                class="status-badge ${statusClass}"
            >
                ${escapeHtml(status)}
            </span>

        </div>


        <div
            style="
                display:grid;
                grid-template-columns:repeat(4,1fr);
                gap:10px;
                margin-bottom:24px;
            "
        >

            <div class="po-detail-stat">

                <span>Ordered</span>

                <strong>
                    ${formatNumber(ordered)}
                </strong>

            </div>


            <div class="po-detail-stat">

                <span>Received</span>

                <strong>
                    ${formatNumber(received)}
                </strong>

            </div>


            <div class="po-detail-stat">

                <span>Pending</span>

                <strong>
                    ${formatNumber(pending)}
                </strong>

            </div>


            <div class="po-detail-stat">

                <span>Order Value</span>

                <strong>
                    ${formatCurrency(value)}
                </strong>

            </div>

        </div>


        <div
            style="
                margin-bottom:24px;
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:8px;
                    font-size:11px;
                "
            >

                <span>
                    Fulfillment
                </span>

                <strong>
                    ${formatNumber(
                        fulfillment,
                        1
                    )}%
                </strong>

            </div>


            <div
                style="
                    height:8px;
                    background:rgba(255,255,255,.07);
                    border-radius:99px;
                    overflow:hidden;
                "
            >

                <div
                    style="
                        width:${Math.min(
                            fulfillment,
                            100
                        )}%;
                        height:100%;
                        background:#2589ff;
                    "
                ></div>

            </div>

        </div>


        <div
            style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:16px;
                margin-bottom:24px;
            "
        >

            <div>

                <div class="po-detail-label">
                    Expected Delivery
                </div>

                <div class="po-detail-value">
                    ${formatDate(
                        po.expected_delivery
                    )}
                </div>

            </div>


            <div>

                <div class="po-detail-label">
                    Received At
                </div>

                <div class="po-detail-value">
                    ${formatDateTime(
                        po.received_at
                    )}
                </div>

            </div>

        </div>


        <div>

            <div
                style="
                    font-size:11px;
                    font-weight:600;
                    margin-bottom:10px;
                "
            >
                Order Items
            </div>


            <div
                style="
                    overflow-x:auto;
                "
            >

                <table class="table table-dark align-middle">

                    <thead>

                        <tr>

                            <th>Product</th>

                            <th>SKU</th>

                            <th>Ordered</th>

                            <th>Received</th>

                            <th>Pending</th>

                            <th>Unit Cost</th>

                            <th>Fulfillment</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            items.length

                                ?

                            items.map(item => {

                                const itemOrdered =
                                    safeNumber(
                                        item.quantity ??
                                        item.ordered_quantity
                                    );


                                const itemReceived =
                                    safeNumber(
                                        item.received_quantity
                                    );


                                const itemPending =
                                    item.pending_quantity ??
                                    Math.max(
                                        0,
                                        itemOrdered -
                                        itemReceived
                                    );


                                const itemFulfillment =
                                    item.fulfillment_rate ??
                                    (
                                        itemOrdered
                                            ? (
                                                itemReceived /
                                                itemOrdered
                                            ) * 100
                                            : 0
                                    );


                                return `

                                    <tr>

                                        <td>
                                            <strong>
                                                ${escapeHtml(
                                                    item.product_name ||
                                                    item.product ||
                                                    "Product"
                                                )}
                                            </strong>
                                        </td>

                                        <td>
                                            <span class="mono">
                                                ${escapeHtml(
                                                    item.sku || "â€”"
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            ${formatNumber(
                                                itemOrdered
                                            )}
                                        </td>

                                        <td>
                                            ${formatNumber(
                                                itemReceived
                                            )}
                                        </td>

                                        <td>
                                            ${formatNumber(
                                                itemPending
                                            )}
                                        </td>

                                        <td>
                                            ${formatCurrency(
                                                item.unit_cost
                                            )}
                                        </td>

                                        <td>
                                            ${formatNumber(
                                                itemFulfillment,
                                                1
                                            )}%
                                        </td>

                                    </tr>

                                `;

                            }).join("")

                                :

                            `
                                <tr>
                                    <td colspan="7"
                                        class="text-center text-muted py-4">
                                        No items found.
                                    </td>
                                </tr>
                            `
                        }

                    </tbody>

                </table>

            </div>

        </div>


        ${
            po.notes
                ? `
                    <div
                        style="
                            margin-top:20px;
                            padding:14px;
                            border:1px solid rgba(255,255,255,.07);
                            border-radius:10px;
                            background:rgba(255,255,255,.02);
                        "
                    >

                        <div class="po-detail-label">
                            Notes
                        </div>

                        <div class="po-detail-value">
                            ${escapeHtml(po.notes)}
                        </div>

                    </div>
                  `
                : ""
        }

    `;


    const modal =
        getElement(
            "purchaseOrderDetailModal"
        );


    if (modal) {

        bootstrap.Modal
            .getOrCreateInstance(modal)
            .show();

    }

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const input =
        getElement(
            "searchInput"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        searchProducts
    );

}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */


function setupCopilotInput() {

    const input =
        getElement("copilotInput");

    if (!input) {
        return;
    }

    input.addEventListener("keydown", event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();
            sendCopilotMessage();
        }

    });

}


function setupRefreshButtons() {

    document
        .querySelectorAll("[data-refresh-dashboard]")
        .forEach(button => {

            button.addEventListener(
                "click",
                refreshDashboard
            );

        });

}


function setupNavigation() {

    const navigation = {

        dashboardNav:
            "dashboard",

        productsNav:
            "products",

        categoriesNav:
            "categories",

        suppliersNav:
            "suppliers",

        supplierIntelligenceNav:
            "supplierIntelligence",

        movementsNav:
            "movements",

        purchaseOrdersNav:
            "purchaseOrders"

    };


    Object.entries(
        navigation
    ).forEach(
        ([id, section]) => {

            const element =
                getElement(id);


            if (!element) {
                return;
            }


            element.addEventListener(
                "click",
                () =>
                    showSection(
                        section
                    )
            );

        }
    );

}


/* =========================================================
   MODAL RESET
========================================================= */

function setupModalReset() {

    const modalMap = {

        productModal:
            "productError",

        categoryModal:
            "categoryError",

        supplierModal:
            "supplierError",

        movementModal:
            "movementError",

        purchaseOrderModal:
            "purchaseOrderError"

    };


    Object.entries(
        modalMap
    ).forEach(
        ([modalId, errorId]) => {

            const modal =
                getElement(
                    modalId
                );


            if (!modal) {
                return;
            }


            modal.addEventListener(
                "hidden.bs.modal",
                () => {

                    const errorElement =
                        getElement(
                            errorId
                        );


                    if (errorElement) {

                        errorElement.style.display =
                            "none";

                        errorElement.textContent =
                            "";

                    }

                }
            );

        }
    );

}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {

    const refreshButtons =
        document.querySelectorAll(
            "[data-refresh-dashboard]"
        );


    refreshButtons.forEach(button => {

        button.disabled = true;

        button.classList.add(
            "loading"
        );

    });


    try {

        await loadProducts();

        await loadInventoryIntelligence();

        await loadSupplierPerformance();

        await loadPurchaseOrders();

        await loadMovementTable();

        await loadDashboard();

    }

    catch (error) {

        console.error(
            "Refresh error:",
            error
        );

    }

    finally {

        refreshButtons.forEach(button => {

            button.disabled = false;

            button.classList.remove(
                "loading"
            );

        });

    }

}


/* =========================================================
   MAIN DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        if (
            !productsCache.length
        ) {

            await loadProducts();

        }


        updateDashboardMetrics();

        loadDashboardProducts();

        renderAttentionCenter();

        renderInventoryValueChart();

        renderInventoryHealthChart();

        renderStockCoverageChart();

        renderDashboardPurchaseOrders();

    }

    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }

}




/* =========================================================
   COPILOT
========================================================= */

function openCopilot() {

    const drawer =
        getElement("copilotDrawer");

    if (!drawer) {
        return;
    }

    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");

}


function closeCopilot() {

    const drawer =
        getElement("copilotDrawer");

    if (!drawer) {
        return;
    }

    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");

}


function setCopilotPrompt(prompt) {

    const input =
        getElement("copilotInput");

    if (!input) {
        return;
    }

    input.value = prompt;
    input.focus();

}


function renderCopilotMessage(role, text) {

    const response =
        getElement("copilotResponse");

    if (!response) {
        return;
    }

    const message =
        document.createElement("div");

    message.className =
        `sp-copilot-message ${role}`;

    message.innerHTML = `
        <div class="sp-copilot-message-label">
            ${role === "user" ? "You" : "StockPilot Copilot"}
        </div>
        <div class="sp-copilot-message-text"></div>
    `;

    message
        .querySelector(".sp-copilot-message-text")
        .textContent = text;

    response.appendChild(message);
    response.scrollTop = response.scrollHeight;

}


async function sendCopilotMessage() {

    const input =
        getElement("copilotInput");

    const response =
        getElement("copilotResponse");

    if (!input || !response) {
        return;
    }

    const question =
        input.value.trim();

    if (!question) {
        return;
    }

    renderCopilotMessage("user", question);
    input.value = "";

    const loading =
        document.createElement("div");

    loading.className =
        "sp-copilot-message assistant";

    loading.innerHTML = `
        <div class="sp-copilot-message-label">
            StockPilot Copilot
        </div>
        <div class="sp-copilot-message-text">
            Analysing live inventory data...
        </div>
    `;

    response.appendChild(loading);
    response.scrollTop = response.scrollHeight;

    try {

        const data =
            await apiFetch(
                "/copilot/",
                {
                    method: "POST",
                    body: JSON.stringify({
                        question
                    })
                }
            );

        loading
            .querySelector(".sp-copilot-message-text")
            .textContent =
                data?.answer ||
                data?.response ||
                data?.message ||
                "The Copilot returned no answer.";

    }

    catch (error) {

        loading
            .querySelector(".sp-copilot-message-text")
            .textContent =
                error.message ||
                "Unable to connect to StockPilot Copilot.";

    }

    response.scrollTop = response.scrollHeight;

}


/* =========================================================
   INITIAL APPLICATION LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupNavigation();
        setupRefreshButtons();
        setupCopilotInput();

        setupSearch();

        setupModalReset();


        try {

            /*
             * Reference data
             */

            await loadCategories();

            await loadSuppliers();


            /*
             * Products
             */

            await loadProducts();

            await loadMovementProducts();


            /*
             * Operational data
             */

            await loadMovementTable();

            await loadInventoryIntelligence();

            await loadSupplierPerformance();

            await loadPurchaseOrders();


            /*
             * Dashboard
             */

            await loadDashboard();

        }

        catch (error) {

            console.error(
                "StockPilot initialization error:",
                error
            );

        }

    }
);
