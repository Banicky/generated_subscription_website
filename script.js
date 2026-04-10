import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
    'https://honudnbnumkoytlygbhx.supabase.co',
    'sb_publishable_eHzVx9-Sq0hdiepUnxgcPQ_Ti0437dl'
)

document.addEventListener("DOMContentLoaded", () => {
    // --- State Management ---
    let isLoginMode = true;
    let currentUser = localStorage.getItem("membershipt_current_user");

    // --- DOM Elements ---
    // Auth
    const authView = document.getElementById("auth-view");
    const authForm = document.getElementById("auth-form");
    const authSubtitle = document.getElementById("auth-subtitle");
    const authBtn = document.getElementById("auth-btn");
    const toggleAuthLink = document.getElementById("toggle-auth-link");
    const authToggleText = document.getElementById("auth-toggle-text");
    const authError = document.getElementById("auth-error");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    // Dashboard
    const dashboardView = document.getElementById("dashboard-view");
    const welcomeMessage = document.getElementById("welcome-message");
    const logoutBtn = document.getElementById("logout-btn");
    const addSubForm = document.getElementById("add-sub-form");
    const subsGrid = document.getElementById("subs-grid");
    const totalMonthlyCost = document.getElementById("total-monthly-cost");

    // --- Initialization ---
    if (currentUser) {
        showDashboard();
    }

    // --- Auth Logic ---
    toggleAuthLink.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authError.classList.add("hidden");
        
        if (isLoginMode) {
            authSubtitle.textContent = "Sign in to manage your bills";
            authBtn.textContent = "Login";
            authToggleText.textContent = "Don't have an account?";
            toggleAuthLink.textContent = "Register here";
        } else {
            authSubtitle.textContent = "Create an account to get started";
            authBtn.textContent = "Register";
            authToggleText.textContent = "Already have an account?";
            toggleAuthLink.textContent = "Login here";
        }
    });

    authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const users = JSON.parse(localStorage.getItem("membershipt_users")) || {};

        if (isLoginMode) {
            // Login
            if (users[username] && users[username] === password) {
                currentUser = username;
                localStorage.setItem("membershipt_current_user", username);
                showDashboard();
            } else {
                showError("Invalid username or password.");
            }
        } else {
            // Register
            if (users[username]) {
                showError("Username already exists.");
            } else {
                users[username] = password;
                localStorage.setItem("membershipt_users", JSON.stringify(users));
                // Auto-login after registration
                currentUser = username;
                localStorage.setItem("membershipt_current_user", username);
                showDashboard();
            }
        }
    });

    function showError(msg) {
        authError.textContent = msg;
        authError.classList.remove("hidden");
    }

    logoutBtn.addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem("membershipt_current_user");
        authForm.reset();
        authError.classList.add("hidden");
        authView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
    });

    // --- Dashboard Logic ---
    function showDashboard() {
        authView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        welcomeMessage.textContent = `Welcome, ${currentUser}`;
        renderSubscriptions();
    }

    function getSubscriptions() {
        const key = `membershipt_subs_${currentUser}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function saveSubscriptions(subs) {
        const key = `membershipt_subs_${currentUser}`;
        localStorage.setItem(key, JSON.stringify(subs));
    }

    addSubForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const name = document.getElementById("sub-name").value.trim();
        const cost = parseFloat(document.getElementById("sub-cost").value);
        const cycle = document.getElementById("sub-cycle").value;

        if (!name || isNaN(cost) || !cycle) return;

        const newSub = {
            id: Date.now().toString(),
            name,
            cost,
            cycle
        };

        const subs = getSubscriptions();
        subs.push(newSub);
        saveSubscriptions(subs);
        
        addSubForm.reset();
        renderSubscriptions();
    });

    // Make delete globally accessible for inline HTML onclick handler
    window.deleteSubscription = function(id) {
        let subs = getSubscriptions();
        subs = subs.filter(sub => sub.id !== id);
        saveSubscriptions(subs);
        renderSubscriptions();
    };

    function renderSubscriptions() {
        const subs = getSubscriptions();
        subsGrid.innerHTML = "";
        let monthlyTotal = 0;

        if (subs.length === 0) {
            subsGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No subscriptions added yet. Start by adding one above!</p>`;
            totalMonthlyCost.textContent = `Total: $0.00 / mo`;
            return;
        }

        subs.forEach(sub => {
            // Calculate normalized monthly cost for the dashboard overview
            let normalizedMonthly = sub.cost;
            if (sub.cycle === "Yearly") normalizedMonthly = sub.cost / 12;
            if (sub.cycle === "Weekly") normalizedMonthly = sub.cost * 4.33;
            monthlyTotal += normalizedMonthly;

            const card = document.createElement("div");
            card.className = "sub-card";
            card.innerHTML = `
                <div class="sub-header">
                    <h3 class="sub-name">${sub.name}</h3>
                    <button class="delete-btn" onclick="deleteSubscription('${sub.id}')" title="Delete Plan">&times;</button>
                </div>
                <div class="sub-details">
                    <div class="sub-price">$${sub.cost.toFixed(2)} <span class="sub-cycle">/ ${sub.cycle.toLowerCase()}</span></div>
                </div>
            `;
            subsGrid.appendChild(card);
        });

        totalMonthlyCost.textContent = `Total: $${monthlyTotal.toFixed(2)} / mo`;
    }
});
