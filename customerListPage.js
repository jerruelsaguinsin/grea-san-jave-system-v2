function customerListGuard() {
    if (!currentUser || currentActorType !== ACTOR_TYPES.STAFF) {
        window.location.href = getDashboardUrlForCurrentUser();
        return false;
    }

    if (currentUser.mustChangePassword === true) {
        window.location.href = "change-password.html";
        return false;
    }

    return true;
}

function renderCustomerList() {
    let body = document.getElementById("customerBody");
    body.innerHTML = "";

    let q = document.getElementById("customerSearch").value.trim();
    let list = searchRecordsByKeyword(
        customers,
        ["customerName", "username", "email", "messengerHandle"],
        q
    );
    bubbleSortByField(list, "customerName", "asc");

    if (list.length === 0) {
        body.innerHTML =
            '<tr class="empty-row"><td colspan="7">No customers found.</td></tr>';
        return;
    }

    for (let i = 0; i < list.length; i++) {
        let c = list[i];
        let row = document.createElement("tr");
        row.innerHTML =
            '<td data-label="ID">' +
            c.customerId +
            '</td><td data-label="Name">' +
            escapeCustomer(c.customerName) +
            '</td><td data-label="Username">' +
            escapeCustomer(c.username) +
            '</td><td data-label="Email">' +
            escapeCustomer(c.email || "—") +
            '</td><td data-label="Messenger">' +
            escapeCustomer(c.messengerHandle || "—") +
            '</td><td data-label="Suki">' +
            (c.isRegular ? "Yes" : "No") +
            '</td><td data-label="Status">' +
            (c.isActive ? "Active" : "Suspended") +
            "</td>";
        body.appendChild(row);
    }
}

function escapeCustomer(v) {
    let d = document.createElement("div");
    d.textContent = v;
    return d.innerHTML;
}

function initCustomerList() {
    if (!customerListGuard()) {
        return;
    }

    document.getElementById("currentUserLabel").textContent =
        currentUser.fullName + " (Staff)";
    document.getElementById("dashboardNav").href = getDashboardUrlForCurrentUser();
    document
        .getElementById("customerSearch")
        .addEventListener("input", renderCustomerList);
    document.getElementById("logoutBtn").addEventListener("click", function () {
        logoutCurrentUser();
        window.location.href = "login-signup.html";
    });
    renderCustomerList();
}

document.addEventListener("DOMContentLoaded", initCustomerList);
