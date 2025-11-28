// ======= FEES MANAGEMENT SYSTEM =======

let feesData = {
    categories: [],
    studentFees: [],
    payments: []
};

// Load all fees data
async function loadFeesData() {
    if (!window.db) {
        console.error("Firestore not initialized");
        return;
    }
    
    try {
        // Load fee categories
        feesData.categories = await getFirestoreDocs("feeCategories");
        
        // Load student fees
        feesData.studentFees = await getFirestoreDocs("studentFees");
        
        // Load payments
        feesData.payments = await getFirestoreDocs("payments");
        
        // Render fees dashboard
        renderFeesDashboard();
    } catch (error) {
        console.error("Error loading fees data:", error);
        alert("Error loading fees data. Please check your connection.");
    }
}

// Render fees dashboard
function renderFeesDashboard() {
    const feesTab = document.getElementById("feesTab");
    if (!feesTab) return;
    
    // Calculate totals
    const totalPending = feesData.studentFees
        .filter(f => f.status === "pending")
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    
    const totalPaid = feesData.payments
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    const totalFees = feesData.studentFees
        .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    
    feesTab.innerHTML = `
        <div class="fees-container">
            <div class="fees-header">
                <h2 style="text-align: center; color: #667eea; margin-bottom: 20px;">Fees Management</h2>
                <div class="fees-stats-grid">
                    <div class="fees-stat-card">
                        <h3>Total Fees</h3>
                        <div class="stat-value">$${totalFees.toFixed(2)}</div>
                    </div>
                    <div class="fees-stat-card pending">
                        <h3>Pending Fees</h3>
                        <div class="stat-value">$${totalPending.toFixed(2)}</div>
                    </div>
                    <div class="fees-stat-card paid">
                        <h3>Collected Fees</h3>
                        <div class="stat-value">$${totalPaid.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            <div class="fees-tabs">
                <button class="fees-tab-btn active" onclick="switchFeesTab('overview', this)">Overview</button>
                <button class="fees-tab-btn" onclick="switchFeesTab('categories', this)">Categories</button>
                <button class="fees-tab-btn" onclick="switchFeesTab('assign', this)">Assign Fees</button>
                <button class="fees-tab-btn" onclick="switchFeesTab('payments', this)">Payments</button>
                <button class="fees-tab-btn" onclick="switchFeesTab('history', this)">Payment History</button>
            </div>
            
            <div id="feesOverviewTab" class="fees-content-tab">
                ${renderFeesOverview()}
            </div>
            
            <div id="feesCategoriesTab" class="fees-content-tab" style="display:none;">
                ${renderFeeCategories()}
            </div>
            
            <div id="feesAssignTab" class="fees-content-tab" style="display:none;">
                ${renderAssignFees()}
            </div>
            
            <div id="feesPaymentsTab" class="fees-content-tab" style="display:none;">
                ${renderPayments()}
            </div>
            
            <div id="feesHistoryTab" class="fees-content-tab" style="display:none;">
                ${renderPaymentHistory()}
            </div>
        </div>
    `;
    
    // Render charts
    renderFeesCharts();
}

// Switch fees tabs
function switchFeesTab(tab, eventElement = null) {
    // Update tab buttons
    document.querySelectorAll(".fees-tab-btn").forEach(btn => btn.classList.remove("active"));
    if (eventElement) {
        eventElement.classList.add("active");
    } else {
        // Find button by tab name
        const buttons = document.querySelectorAll(".fees-tab-btn");
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tab.toLowerCase())) {
                btn.classList.add("active");
            }
        });
    }
    
    // Hide all content tabs
    document.querySelectorAll(".fees-content-tab").forEach(t => t.style.display = "none");
    
    // Show selected tab
    const targetTab = document.getElementById(`fees${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`);
    if (targetTab) {
        targetTab.style.display = "block";
    }
    
    // Reload data if needed
    if (tab === "overview") {
        renderFeesCharts();
    }
}

// Render fees overview
function renderFeesOverview() {
    const pendingFees = feesData.studentFees.filter(f => f.status === "pending");
    const paidFees = feesData.studentFees.filter(f => f.status === "paid");
    
    return `
        <div class="fees-overview">
            <div class="fees-charts-container">
                <div class="chart-card">
                    <h3>Fees Status Distribution</h3>
                    <canvas id="feesStatusChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3>Monthly Collection</h3>
                    <canvas id="feesMonthlyChart"></canvas>
                </div>
            </div>
            
            <div class="fees-summary">
                <div class="summary-card">
                    <h3>Pending Fees (${pendingFees.length})</h3>
                    <div class="pending-list">
                        ${pendingFees.slice(0, 10).map(fee => `
                            <div class="fee-item">
                                <span><strong>${getStudentName(fee.studentUID)}</strong> - ${getCategoryName(fee.categoryId)}</span>
                                <span>$${parseFloat(fee.amount || 0).toFixed(2)}</span>
                                <button class="btn-small" onclick="recordPayment('${fee.id}')">Record Payment</button>
                            </div>
                        `).join("")}
                        ${pendingFees.length > 10 ? `<p style="text-align: center; color: #666;">... and ${pendingFees.length - 10} more</p>` : ""}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render fee categories
function renderFeeCategories() {
    return `
        <div class="fee-categories-section">
            <div class="section-header">
                <h3>Fee Categories</h3>
                <button class="btn-primary" onclick="showAddCategoryForm()">+ Add Category</button>
            </div>
            
            <div id="addCategoryForm" style="display:none;" class="form-card">
                <h4>Add New Fee Category</h4>
                <input type="text" id="categoryName" placeholder="Category Name" required>
                <textarea id="categoryDescription" placeholder="Description (optional)"></textarea>
                <div class="form-actions">
                    <button class="btn-primary" onclick="addFeeCategory()">Add Category</button>
                    <button class="btn-secondary" onclick="hideAddCategoryForm()">Cancel</button>
                </div>
            </div>
            
            <div class="categories-grid">
                ${feesData.categories.map(cat => `
                    <div class="category-card">
                        <h4>${cat.name}</h4>
                        <p>${cat.description || "No description"}</p>
                        <div class="category-actions">
                            <button class="btn-small" onclick="editCategory('${cat.id}')">Edit</button>
                            <button class="btn-small btn-danger" onclick="deleteCategory('${cat.id}')">Delete</button>
                        </div>
                    </div>
                `).join("")}
                ${feesData.categories.length === 0 ? "<p style='text-align: center; color: #666; padding: 40px;'>No categories yet. Add one to get started!</p>" : ""}
            </div>
        </div>
    `;
}

// Render assign fees form
function renderAssignFees() {
    const students = adminData.students || [];
    
    return `
        <div class="assign-fees-section">
            <h3>Assign Fees to Student</h3>
            <div class="form-card">
                <select id="assignStudentSelect" required>
                    <option value="">Select Student</option>
                    ${students.map(s => `<option value="${s.uid || s.id}">${s.name || s.email || s.uid}</option>`).join("")}
                </select>
                <select id="assignCategorySelect" required>
                    <option value="">Select Category</option>
                    ${feesData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
                </select>
                <input type="number" id="assignAmount" placeholder="Amount" step="0.01" min="0" required>
                <input type="date" id="assignDueDate" required>
                <textarea id="assignNotes" placeholder="Notes (optional)"></textarea>
                <button class="btn-primary" onclick="assignFeeToStudent()">Assign Fee</button>
            </div>
        </div>
    `;
}

// Render payments section
function renderPayments() {
    const pendingFees = feesData.studentFees.filter(f => f.status === "pending");
    
    return `
        <div class="payments-section">
            <h3>Record Payment</h3>
            <div class="form-card">
                <select id="paymentStudentSelect" onchange="loadStudentPendingFees()" required>
                    <option value="">Select Student</option>
                    ${(adminData.students || []).map(s => `<option value="${s.uid || s.id}">${s.name || s.email || s.uid}</option>`).join("")}
                </select>
                <div id="pendingFeesList"></div>
                <input type="number" id="paymentAmount" placeholder="Payment Amount" step="0.01" min="0" required>
                <input type="date" id="paymentDate" value="${new Date().toISOString().split('T')[0]}" required>
                <select id="paymentMethod">
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="online">Online</option>
                </select>
                <textarea id="paymentNotes" placeholder="Payment Notes (optional)"></textarea>
                <button class="btn-primary" onclick="recordPayment()">Record Payment</button>
            </div>
        </div>
    `;
}

// Render payment history
function renderPaymentHistory() {
    const sortedPayments = [...feesData.payments].sort((a, b) => {
        const dateA = new Date(a.paymentDate || a.createdAt || 0);
        const dateB = new Date(b.paymentDate || b.createdAt || 0);
        return dateB - dateA;
    });
    
    return `
        <div class="payment-history-section">
            <h3>Payment History</h3>
            <div class="history-filters">
                <input type="text" id="historySearch" placeholder="Search by student name..." onkeyup="filterPaymentHistory()">
                <input type="date" id="historyDateFrom" onchange="filterPaymentHistory()">
                <input type="date" id="historyDateTo" onchange="filterPaymentHistory()">
            </div>
            <div class="payments-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Student</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Receipt</th>
                        </tr>
                    </thead>
                    <tbody id="paymentsTableBody">
                        ${sortedPayments.map(payment => `
                            <tr>
                                <td>${formatDate(payment.paymentDate || payment.createdAt)}</td>
                                <td>${getStudentName(payment.studentUID)}</td>
                                <td>${getCategoryName(payment.categoryId)}</td>
                                <td>$${parseFloat(payment.amount || 0).toFixed(2)}</td>
                                <td>${payment.method || "N/A"}</td>
                                <td><button class="btn-small" onclick="printReceipt('${payment.id}')">Print</button></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                ${sortedPayments.length === 0 ? "<p style='text-align: center; color: #666; padding: 40px;'>No payment history yet.</p>" : ""}
            </div>
        </div>
    `;
}

// Render fees charts
function renderFeesCharts() {
    // Status chart
    const pendingCount = feesData.studentFees.filter(f => f.status === "pending").length;
    const paidCount = feesData.studentFees.filter(f => f.status === "paid").length;
    
    const statusCtx = document.getElementById("feesStatusChart");
    if (statusCtx) {
        new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Paid'],
                datasets: [{
                    data: [pendingCount, paidCount],
                    backgroundColor: ['#ffc107', '#28a745']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true
            }
        });
    }
    
    // Monthly collection chart
    const monthlyData = calculateMonthlyCollection();
    const monthlyCtx = document.getElementById("feesMonthlyChart");
    if (monthlyCtx) {
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [{
                    label: 'Collection ($)',
                    data: monthlyData.amounts,
                    backgroundColor: '#667eea'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Calculate monthly collection
function calculateMonthlyCollection() {
    const monthlyMap = {};
    feesData.payments.forEach(payment => {
        const date = new Date(payment.paymentDate || payment.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyMap[monthKey]) {
            monthlyMap[monthKey] = 0;
        }
        monthlyMap[monthKey] += parseFloat(payment.amount || 0);
    });
    
    const sortedMonths = Object.keys(monthlyMap).sort();
    return {
        labels: sortedMonths.map(m => {
            const [year, month] = m.split('-');
            return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        amounts: sortedMonths.map(m => monthlyMap[m])
    };
}

// Add fee category
async function addFeeCategory() {
    const name = document.getElementById("categoryName").value.trim();
    const description = document.getElementById("categoryDescription").value.trim();
    
    if (!name) {
        alert("Please enter a category name.");
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        await window.db.collection("feeCategories").add({
            name: name,
            description: description,
            createdAt: new Date().toISOString()
        });
        
        alert("Category added successfully!");
        document.getElementById("categoryName").value = "";
        document.getElementById("categoryDescription").value = "";
        hideAddCategoryForm();
        loadFeesData();
    } catch (error) {
        console.error("Error adding category:", error);
        alert("Error adding category. Please try again.");
    }
}

// Assign fee to student
async function assignFeeToStudent() {
    const studentUID = document.getElementById("assignStudentSelect").value;
    const categoryId = document.getElementById("assignCategorySelect").value;
    const amount = parseFloat(document.getElementById("assignAmount").value);
    const dueDate = document.getElementById("assignDueDate").value;
    const notes = document.getElementById("assignNotes").value.trim();
    
    if (!studentUID || !categoryId || !amount || !dueDate) {
        alert("Please fill in all required fields.");
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        await window.db.collection("studentFees").add({
            studentUID: studentUID,
            categoryId: categoryId,
            amount: amount,
            dueDate: dueDate,
            status: "pending",
            notes: notes,
            createdAt: new Date().toISOString()
        });
        
        alert("Fee assigned successfully!");
        // Clear form
        document.getElementById("assignStudentSelect").value = "";
        document.getElementById("assignCategorySelect").value = "";
        document.getElementById("assignAmount").value = "";
        document.getElementById("assignDueDate").value = "";
        document.getElementById("assignNotes").value = "";
        loadFeesData();
    } catch (error) {
        console.error("Error assigning fee:", error);
        alert("Error assigning fee. Please try again.");
    }
}

// Record payment
async function recordPayment(feeId = null) {
    const studentUID = document.getElementById("paymentStudentSelect")?.value;
    let selectedFeeId = feeId || document.getElementById("selectedFeeId")?.value;
    const amount = parseFloat(document.getElementById("paymentAmount")?.value);
    const paymentDate = document.getElementById("paymentDate")?.value;
    const method = document.getElementById("paymentMethod")?.value || "cash";
    const notes = document.getElementById("paymentNotes")?.value?.trim() || "";
    
    if (!studentUID || !selectedFeeId || !amount || !paymentDate) {
        alert("Please fill in all required fields.");
        return;
    }
    
    if (!window.db) {
        alert("Firestore not initialized.");
        return;
    }
    
    try {
        // Get the fee document
        const fee = feesData.studentFees.find(f => f.id === selectedFeeId);
        if (!fee) {
            alert("Fee not found.");
            return;
        }
        
        // Create payment record
        const paymentData = {
            studentUID: studentUID,
            feeId: selectedFeeId,
            categoryId: fee.categoryId,
            amount: amount,
            paymentDate: paymentDate,
            method: method,
            notes: notes,
            createdAt: new Date().toISOString()
        };
        
        const paymentRef = await window.db.collection("payments").add(paymentData);
        
        // Update fee status
        const remainingAmount = parseFloat(fee.amount) - amount;
        if (remainingAmount <= 0) {
            await window.db.collection("studentFees").doc(selectedFeeId).update({
                status: "paid",
                paidDate: paymentDate
            });
        } else {
            // Partial payment - update amount
            await window.db.collection("studentFees").doc(selectedFeeId).update({
                amount: remainingAmount.toString()
            });
        }
        
        alert("Payment recorded successfully!");
        
        // Clear form
        if (document.getElementById("paymentStudentSelect")) document.getElementById("paymentStudentSelect").value = "";
        if (document.getElementById("paymentAmount")) document.getElementById("paymentAmount").value = "";
        if (document.getElementById("paymentNotes")) document.getElementById("paymentNotes").value = "";
        
        loadFeesData();
    } catch (error) {
        console.error("Error recording payment:", error);
        alert("Error recording payment. Please try again.");
    }
}

// Load student pending fees
function loadStudentPendingFees() {
    const studentUID = document.getElementById("paymentStudentSelect").value;
    if (!studentUID) {
        document.getElementById("pendingFeesList").innerHTML = "";
        return;
    }
    
    const pendingFees = feesData.studentFees.filter(f => 
        f.studentUID === studentUID && f.status === "pending"
    );
    
    if (pendingFees.length === 0) {
        document.getElementById("pendingFeesList").innerHTML = "<p style='color: #666;'>No pending fees for this student.</p>";
        return;
    }
    
    document.getElementById("pendingFeesList").innerHTML = `
        <label>Select Fee to Pay:</label>
        <select id="selectedFeeId" onchange="updatePaymentAmount()" required>
            <option value="">Select Fee</option>
            ${pendingFees.map(f => `
                <option value="${f.id}" data-amount="${f.amount}">
                    ${getCategoryName(f.categoryId)} - $${parseFloat(f.amount || 0).toFixed(2)} (Due: ${formatDate(f.dueDate)})
                </option>
            `).join("")}
        </select>
    `;
}

// Update payment amount based on selected fee
function updatePaymentAmount() {
    const select = document.getElementById("selectedFeeId");
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.dataset.amount) {
        document.getElementById("paymentAmount").value = selectedOption.dataset.amount;
    }
}

// Print receipt
async function printReceipt(paymentId) {
    const payment = feesData.payments.find(p => p.id === paymentId);
    if (!payment) {
        alert("Payment not found.");
        return;
    }
    
    const student = adminData.students.find(s => (s.uid || s.id) === payment.studentUID);
    const category = feesData.categories.find(c => c.id === payment.categoryId);
    
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
                .receipt-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .receipt-header h1 { margin: 0; color: #667eea; }
                .receipt-info { margin: 20px 0; }
                .receipt-info p { margin: 5px 0; }
                .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .receipt-table th, .receipt-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                .receipt-table th { background: #f5f5f5; }
                .receipt-footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h1>TNHA School</h1>
                <p>Payment Receipt</p>
            </div>
            <div class="receipt-info">
                <p><strong>Receipt #:</strong> ${paymentId}</p>
                <p><strong>Date:</strong> ${formatDate(payment.paymentDate || payment.createdAt)}</p>
                <p><strong>Student:</strong> ${student ? (student.name || student.email || payment.studentUID) : payment.studentUID}</p>
                <p><strong>Category:</strong> ${category ? category.name : "N/A"}</p>
            </div>
            <table class="receipt-table">
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
                <tr>
                    <td>${category ? category.name : "Fee Payment"}</td>
                    <td>$${parseFloat(payment.amount || 0).toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>$${parseFloat(payment.amount || 0).toFixed(2)}</strong></td>
                </tr>
            </table>
            <div class="receipt-info">
                <p><strong>Payment Method:</strong> ${payment.method || "N/A"}</p>
                ${payment.notes ? `<p><strong>Notes:</strong> ${payment.notes}</p>` : ""}
            </div>
            <div class="receipt-footer">
                <p>Thank you for your payment!</p>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open("", "_blank");
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
}

// Helper functions
function getStudentName(uid) {
    const student = adminData.students.find(s => (s.uid || s.id) === uid);
    return student ? (student.name || student.email || uid) : uid;
}

function getCategoryName(categoryId) {
    const category = feesData.categories.find(c => c.id === categoryId);
    return category ? category.name : "Unknown Category";
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showAddCategoryForm() {
    document.getElementById("addCategoryForm").style.display = "block";
}

function hideAddCategoryForm() {
    document.getElementById("addCategoryForm").style.display = "none";
}

function filterPaymentHistory() {
    const search = document.getElementById("historySearch")?.value.toLowerCase() || "";
    const dateFrom = document.getElementById("historyDateFrom")?.value || "";
    const dateTo = document.getElementById("historyDateTo")?.value || "";
    
    const filtered = feesData.payments.filter(payment => {
        const studentName = getStudentName(payment.studentUID).toLowerCase();
        const matchesSearch = !search || studentName.includes(search);
        
        const paymentDate = new Date(payment.paymentDate || payment.createdAt);
        const matchesDateFrom = !dateFrom || paymentDate >= new Date(dateFrom);
        const matchesDateTo = !dateTo || paymentDate <= new Date(dateTo + "T23:59:59");
        
        return matchesSearch && matchesDateFrom && matchesDateTo;
    });
    
    const tbody = document.getElementById("paymentsTableBody");
    if (tbody) {
        tbody.innerHTML = filtered.map(payment => `
            <tr>
                <td>${formatDate(payment.paymentDate || payment.createdAt)}</td>
                <td>${getStudentName(payment.studentUID)}</td>
                <td>${getCategoryName(payment.categoryId)}</td>
                <td>$${parseFloat(payment.amount || 0).toFixed(2)}</td>
                <td>${payment.method || "N/A"}</td>
                <td><button class="btn-small" onclick="printReceipt('${payment.id}')">Print</button></td>
            </tr>
        `).join("");
    }
}

// Make functions globally accessible
window.loadFeesData = loadFeesData;
window.switchFeesTab = switchFeesTab;
window.addFeeCategory = addFeeCategory;
window.assignFeeToStudent = assignFeeToStudent;
window.recordPayment = recordPayment;
window.loadStudentPendingFees = loadStudentPendingFees;
window.updatePaymentAmount = updatePaymentAmount;
window.printReceipt = printReceipt;
window.showAddCategoryForm = showAddCategoryForm;
window.hideAddCategoryForm = hideAddCategoryForm;
window.filterPaymentHistory = filterPaymentHistory;

