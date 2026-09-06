const API_BASE = "/api";


/* =========================
   AUTHENTICATION
========================= */

function getToken() {
    return localStorage.getItem("access_token");
}


function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    window.location.href = "/login/";
}


/* =========================
   SECTION NAVIGATION
========================= */

function showSection(sectionName) {

    const sections = [
        "dashboard",
        "products",
        "categories",
        "suppliers",
        "movements"
    ];

    sections.forEach(section => {

        const element =
            document.getElementById(`${section}Section`);

        if (element) {
            element.classList.add("d-none");
        }

    });


    const selectedSection =
        document.getElementById(`${sectionName}Section`);

    if (selectedSection) {
        selectedSection.classList.remove("d-none");
    }


    const navigationButtons = [
        "dashboardNav",
        "productsNav",
        "categoriesNav",
        "suppliersNav",
        "movementsNav"
    ];

    navigationButtons.forEach(buttonId => {

        const button =
            document.getElementById(buttonId);

        if (button) {
            button.classList.remove("active");
        }

    });


    const selectedButton =
        document.getElementById(`${sectionName}Nav`);

    if (selectedButton) {
        selectedButton.classList.add("active");
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

    if (sectionName === "movements") {
        loadMovementTable();
    }

}


/* =========================
   CATEGORIES
========================= */

async function loadCategories() {

    const token = getToken();

    try {

        const response = await fetch(
            `${API_BASE}/categories/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();

        const categories = data.results || data;


        const select =
            document.getElementById("productCategory");


        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                Select category
            </option>
        `;


        categories.forEach(category => {

            const option =
                document.createElement("option");

            option.value = category.id;
            option.textContent = category.name;

            select.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Error loading categories:",
            error
        );

    }

}


async function loadCategoryTable() {

    const token = getToken();

    try {

        const response = await fetch(
            `${API_BASE}/categories/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();

        const categories = data.results || data;


        const tableBody =
            document.getElementById("categoryTableBody");


        tableBody.innerHTML = "";


        categories.forEach(category => {

            const row =
                document.createElement("tr");


            row.innerHTML = `
                <td>${category.id}</td>

                <td>${category.name}</td>

                <td>${category.description || "N/A"}</td>

                <td>
                    <button
                        class="btn btn-sm btn-danger"
                        onclick="deleteCategory(${category.id})"
                    >
                        Delete
                    </button>
                </td>
            `;


            tableBody.appendChild(row);

        });


    } catch (error) {

        console.error(
            "Error loading category table:",
            error
        );

    }

}


function openAddCategoryModal() {

    document.getElementById("categoryForm").reset();

    document
        .getElementById("categoryError")
        .classList.add("d-none");

}


async function saveCategory() {

    const token = getToken();


    const categoryData = {

        name:
            document.getElementById("categoryName").value,

        description:
            document.getElementById("categoryDescription").value

    };


    try {

        const response = await fetch(
            `${API_BASE}/categories/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify(categoryData)
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                JSON.stringify(data)
            );

        }


        const modalElement =
            document.getElementById("categoryModal");


        const modal =
            bootstrap.Modal.getInstance(modalElement);


        modal.hide();


        await loadCategoryTable();

        await loadCategories();


    } catch (error) {

        const errorBox =
            document.getElementById("categoryError");


        errorBox.textContent =
            error.message;


        errorBox.classList.remove("d-none");

    }

}


async function deleteCategory(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this category?"
        );


    if (!confirmed) {
        return;
    }


    const token = getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/categories/${id}/`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                JSON.stringify(data)
            );

        }


        await loadCategoryTable();

        await loadCategories();


    } catch (error) {

        alert(
            `Unable to delete category: ${error.message}`
        );

    }

}


/* =========================
   SUPPLIERS
========================= */

async function loadSuppliers() {

    const token = getToken();

    try {

        const response = await fetch(
            `${API_BASE}/suppliers/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();

        const suppliers = data.results || data;


        const select =
            document.getElementById("productSupplier");


        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                No supplier
            </option>
        `;


        suppliers.forEach(supplier => {

            const option =
                document.createElement("option");

            option.value = supplier.id;
            option.textContent = supplier.name;

            select.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Error loading suppliers:",
            error
        );

    }

}


async function loadSupplierTable() {

    const token = getToken();

    try {

        const response = await fetch(
            `${API_BASE}/suppliers/`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (response.status === 401) {
            logout();
            return;
        }


        const data = await response.json();

        const suppliers = data.results || data;


        const tableBody =
            document.getElementById("supplierTableBody");


        tableBody.innerHTML = "";


        suppliers.forEach(supplier => {

            const row =
                document.createElement("tr");


            row.innerHTML = `
                <td>${supplier.id}</td>

                <td>${supplier.name}</td>

                <td>${supplier.email || "N/A"}</td>

                <td>${supplier.phone || "N/A"}</td>

                <td>${supplier.address || "N/A"}</td>

                <td>
                    <button
                        class="btn btn-sm btn-danger"
                        onclick="deleteSupplier(${supplier.id})"
                    >
                        Delete
                    </button>
                </td>
            `;


            tableBody.appendChild(row);

        });


    } catch (error) {

        console.error(
            "Error loading supplier table:",
            error
        );

    }

}


async function saveSupplier() {

    const token = getToken();


    const supplierData = {

        name:
            document.getElementById("supplierName").value,

        email:
            document.getElementById("supplierEmail").value,

        phone:
            document.getElementById("supplierPhone").value,

        address:
            document.getElementById("supplierAddress").value

    };


    try {

        const response = await fetch(
            `${API_BASE}/suppliers/`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify(supplierData)
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                JSON.stringify(data)
            );

        }


        const modalElement =
            document.getElementById("supplierModal");


        const modal =
            bootstrap.Modal.getInstance(modalElement);


        modal.hide();


        document.getElementById("supplierForm").reset();


        await loadSupplierTable();

        await loadSuppliers();


    } catch (error) {

        const errorBox =
            document.getElementById("supplierError");


        errorBox.textContent =
            error.message;


        errorBox.classList.remove("d-none");

    }

}


async function deleteSupplier(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this supplier?"
        );


    if (!confirmed) {
        return;
    }


    const token = getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/suppliers/${id}/`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                JSON.stringify(data)
            );

        }


        await loadSupplierTable();

        await loadSuppliers();


    } catch (error) {

        alert(
            `Unable to delete supplier: ${error.message}`
        );

    }

}


/* =========================
   PRODUCTS
========================= */

async function loadProducts(search = "") {

    const token = getToken();


    if (!token) {

        window.location.href = "/login/";

        return;
    }


    let url =
        `${API_BASE}/products/`;


    if (search) {

        url +=
            `?search=${encodeURIComponent(search)}`;

    }


    try {

        const response =
            await fetch(
                url,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (response.status === 401) {

            logout();

            return;
        }


        const data =
            await response.json();


        const products =
            data.results || data;


        displayProducts(products);


    } catch (error) {

        console.error(
            "Error loading products:",
            error
        );

    }

}


function displayProducts(products) {

    const tableBody =
        document.getElementById(
            "productTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = "";


    document.getElementById(
        "totalProducts"
    ).textContent =
        products.length;


    let lowStockCount = 0;


    products.forEach(product => {

        if (product.low_stock) {
            lowStockCount++;
        }


        const row =
            document.createElement("tr");


        row.innerHTML = `
            <td>${product.id}</td>

            <td>${product.name}</td>

            <td>${product.sku}</td>

            <td>${product.category_name}</td>

            <td>${product.supplier_name || "N/A"}</td>

            <td>₹${product.price}</td>

            <td>${product.quantity}</td>

            <td>
                ${
                    product.low_stock
                    ? '<span class="badge bg-danger">Low Stock</span>'
                    : '<span class="badge bg-success">In Stock</span>'
                }
            </td>

            <td>

                <button
                    class="btn btn-sm btn-warning me-1"
                    onclick="editProduct(${product.id})"
                >
                    Edit
                </button>

                <button
                    class="btn btn-sm btn-danger"
                    onclick="deleteProduct(${product.id})"
                >
                    Delete
                </button>

            </td>
        `;


        tableBody.appendChild(row);

    });


    document.getElementById(
        "lowStockProducts"
    ).textContent =
        lowStockCount;

}


function searchProducts() {

    const search =
        document.getElementById(
            "searchInput"
        ).value;


    loadProducts(search);

}


function openAddProductModal() {

    document.getElementById(
        "productModalTitle"
    ).textContent =
        "Add Product";


    document.getElementById(
        "productForm"
    ).reset();


    document.getElementById(
        "productId"
    ).value = "";


    document.getElementById(
        "productThreshold"
    ).value = 5;


    document
        .getElementById("productError")
        .classList.add("d-none");

}


async function saveProduct() {

    const token =
        getToken();


    const productId =
        document.getElementById(
            "productId"
        ).value;


    const productData = {

        name:
            document.getElementById(
                "productName"
            ).value,

        sku:
            document.getElementById(
                "productSku"
            ).value,

        description:
            document.getElementById(
                "productDescription"
            ).value,

        price:
            document.getElementById(
                "productPrice"
            ).value,

        quantity:
            document.getElementById(
                "productQuantity"
            ).value,

        low_stock_threshold:
            document.getElementById(
                "productThreshold"
            ).value,

        category:
            document.getElementById(
                "productCategory"
            ).value,

        supplier:
            document.getElementById(
                "productSupplier"
            ).value || null

    };


    const url =
        productId
        ? `${API_BASE}/products/${productId}/`
        : `${API_BASE}/products/`;


    const method =
        productId
        ? "PATCH"
        : "POST";


    try {

        const response =
            await fetch(
                url,
                {
                    method: method,

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify(
                            productData
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                JSON.stringify(data)
            );

        }


        const modalElement =
            document.getElementById(
                "productModal"
            );


        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );


        modal.hide();


        await loadProducts();

    } catch (error) {

        const errorBox =
            document.getElementById(
                "productError"
            );


        errorBox.textContent =
            error.message;


        errorBox.classList.remove(
            "d-none"
        );

    }

}


async function editProduct(id) {

    const token =
        getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/products/${id}/`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        const product =
            await response.json();


        if (!response.ok) {

            throw new Error(
                "Unable to load product."
            );

        }


        document.getElementById(
            "productModalTitle"
        ).textContent =
            "Edit Product";


        document.getElementById(
            "productId"
        ).value =
            product.id;


        document.getElementById(
            "productName"
        ).value =
            product.name;


        document.getElementById(
            "productSku"
        ).value =
            product.sku;


        document.getElementById(
            "productDescription"
        ).value =
            product.description;


        document.getElementById(
            "productPrice"
        ).value =
            product.price;


        document.getElementById(
            "productQuantity"
        ).value =
            product.quantity;


        document.getElementById(
            "productThreshold"
        ).value =
            product.low_stock_threshold;


        document.getElementById(
            "productCategory"
        ).value =
            product.category;


        document.getElementById(
            "productSupplier"
        ).value =
            product.supplier || "";


        document
            .getElementById("productError")
            .classList.add("d-none");


        const modal =
            new bootstrap.Modal(
                document.getElementById(
                    "productModal"
                )
            );


        modal.show();


    } catch (error) {

        console.error(error);

    }

}


async function deleteProduct(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this product?"
        );


    if (!confirmed) {
        return;
    }


    const token =
        getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/products/${id}/`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                JSON.stringify(data)
            );

        }


        await loadProducts();


    } catch (error) {

        console.error(
            "Error deleting product:",
            error
        );

    }

}


/* =========================
   STOCK MOVEMENTS
========================= */

async function loadMovementProducts() {

    const token = getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/products/`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (response.status === 401) {

            logout();

            return;
        }


        const data =
            await response.json();


        const products =
            data.results || data;


        const select =
            document.getElementById(
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


        products.forEach(product => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                product.id;


            option.textContent =
                `${product.name} (${product.sku})`;


            select.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Error loading movement products:",
            error
        );

    }

}


async function loadMovementTable() {

    const token =
        getToken();


    try {

        const response =
            await fetch(
                `${API_BASE}/stock-movements/`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


        if (response.status === 401) {

            logout();

            return;
        }


        const data =
            await response.json();


        const movements =
            data.results || data;


        const tableBody =
            document.getElementById(
                "movementTableBody"
            );


        tableBody.innerHTML = "";


        movements.forEach(movement => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `
                <td>${movement.id}</td>

                <td>${movement.product_name}</td>>
                
                <td>
                    ${
                        movement.movement_type === "IN"
                        ? '<span class="badge bg-success">Stock In</span>'
                        : '<span class="badge bg-danger">Stock Out</span>'
                    }
                </td>

                <td>${movement.quantity}</td>

                <td>${movement.reason || "N/A"}</td>

                <td>${new Date(
                    movement.created_at
                ).toLocaleString()}</td>
            `;


            tableBody.appendChild(row);

        });


    } catch (error) {

        console.error(
            "Error loading stock movements:",
            error
        );

    }

}


async function saveMovement() {

    const token =
        getToken();


    const movementData = {

        product:
            document.getElementById(
                "movementProduct"
            ).value,

        movement_type:
            document.getElementById(
                "movementType"
            ).value,

        quantity:
            document.getElementById(
                "movementQuantity"
            ).value,

        reason:
            document.getElementById(
                "movementReason"
            ).value

    };


    try {

        const response =
            await fetch(
                `${API_BASE}/stock-movements/`,
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify(
                            movementData
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                JSON.stringify(data)
            );

        }


        const modalElement =
            document.getElementById(
                "movementModal"
            );


        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );


        modal.hide();


        document.getElementById(
            "movementForm"
        ).reset();


        await loadMovementTable();

        await loadProducts();


    } catch (error) {

        const errorBox =
            document.getElementById(
                "movementError"
            );


        errorBox.textContent =
            error.message;


        errorBox.classList.remove(
            "d-none"
        );

    }

}


/* =========================
   INITIAL PAGE LOAD
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadCategories();

        loadSuppliers();

        loadProducts();

        loadMovementProducts();

    }
);