document.addEventListener("DOMContentLoaded", () => {
    // --- State Management ---
    let isLoginMode = true;
    let currentUser = localStorage.getItem("subtrack_current_user");

    // --- DOM Elements ---
    const authView = document.getElementById("auth-view");
    const authForm = document.getElementById("auth-form");
    const authSubtitle = document.getElementById("auth-subtitle");
    const authBtn = document.getElementById("auth-btn");
    const toggleAuthLink = document.getElementById("toggle-auth-link");
    const authToggleText = document.getElementById("auth-toggle-text");
    const authError = document.getElementById("auth-error");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

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
        updateAuthUI(); // Moved UI updates to a dedicated function
    });

    // Helper to keep UI in sync with state
    function updateAuthUI() {
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
    }

    authForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const users = JSON.parse(localStorage.getItem("subtrack_users")) || {};

        if (isLoginMode) {
            if (users[username] && users[username] === password) {
                currentUser = username;
                localStorage.setItem("subtrack_current_user", username);
                showDashboard();
            } else {
                showError("Invalid username or password.");
            }
        } else {
            if (users[username]) {
                showError("Username already exists.");
            } else {
                users[username] = password;
                localStorage.setItem("subtrack_users", JSON.stringify(users));
                currentUser = username;
                localStorage.setItem("subtrack_current_user", username);
                showDashboard();
            }
        }
    });

    function showError(msg) {
        authError.textContent = msg;
        authError.classList.remove("hidden");
    }

    // FIXED: Logout now resets the login mode state and UI properly
    logoutBtn.addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem("subtrack_current_user");
        
        // Reset state and UI
        isLoginMode = true; 
        updateAuthUI();
        
        authForm.reset();
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
        const key = `subtrack_subs_${currentUser}`;
        return JSON.parse(localStorage.getItem(key)) || [];
    }

    function saveSubscriptions(subs) {
        const key = `subtrack_subs_${currentUser}`;
        localStorage.setItem(key, JSON.stringify(subs));
    }

    addSubForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("sub-name").value.trim();
        const cost = parseFloat(document.getElementById("sub-cost").value);
        const cycle = document.getElementById("sub-cycle").value;

        if (!name || isNaN(cost) || !cycle) return;

        const newSub = { id: Date.now().toString(), name, cost, cycle };
        const subs = getSubscriptions();
        subs.push(newSub);
        saveSubscriptions(subs);
        
        addSubForm.reset();
        renderSubscriptions();
    });

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
            subsGrid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">No subscriptions added yet.</p>`;
            totalMonthlyCost.textContent = `Total: $0.00 / mo`;
            return;
        }

        subs.forEach(sub => {
            let normalizedMonthly = sub.cost;
            if (sub.cycle === "Yearly") normalizedMonthly = sub.cost / 12;
            if (sub.cycle === "Weekly") normalizedMonthly = sub.cost * 4.33;
            monthlyTotal += normalizedMonthly;

            const card = document.createElement("div");
            card.className = "sub-card";
            card.innerHTML = `
                <div class="sub-header">
                    <h3 class="sub-name">${sub.name}</h3>
                    <button class="delete-btn" onclick="deleteSubscription('${sub.id}')">&times;</button>
                </div>
                <div class="sub-price">$${sub.cost.toFixed(2)} <span class="sub-cycle">/ ${sub.cycle.toLowerCase()}</span></div>
            `;
            subsGrid.appendChild(card);
        });
        totalMonthlyCost.textContent = `Total: $${monthlyTotal.toFixed(2)} / mo`;
    }
});


/*

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
    'https://honudnbnumkoytlygbhx.supabase.co',
    'sb_publishable_eHzVx9-Sq0hdiepUnxgcPQ_Ti0437dl'
)

document.addEventListener("DOMContentLoaded", () => {
    let isLoginMode = true;
    let currentUser = null;

    // DOM Elements
    const authView = document.getElementById("auth-view");
    const authForm = document.getElementById("auth-form");
    const authSubtitle = document.getElementById("auth-subtitle");
    const authBtn = document.getElementById("auth-btn");
    const toggleAuthLink = document.getElementById("toggle-auth-link");
    const authToggleText = document.getElementById("auth-toggle-text");
    const authError = document.getElementById("auth-error");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const dashboardView = document.getElementById("dashboard-view");
    const welcomeMessage = document.getElementById("welcome-message");
    const logoutBtn = document.getElementById("logout-btn");
    const addSubForm = document.getElementById("add-sub-form");
    const subsGrid = document.getElementById("subs-grid");
    const totalMonthlyCost = document.getElementById("total-monthly-cost");

    // Listen for Auth State Changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            showDashboard();
        } else {
            currentUser = null;
            // Reset login mode's text to ensure consistency when user logs out
            authBtn.textContent = isLoginMode ? "Login" : "Register";
            showAuth();
        }
    });

    toggleAuthLink.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authError.classList.add("hidden");
        authSubtitle.textContent = isLoginMode ? "Sign in to manage your bills" : "Create an account to get started";
        authBtn.textContent = isLoginMode ? "Login" : "Register";
        authToggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuthLink.textContent = isLoginMode ? "Register here" : "Login here";
    });

    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        authBtn.disabled = true;
        authBtn.textContent = "Processing...";
        authError.classList.add("hidden");

        const { error } = isLoginMode 
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        if (error) {
            authError.textContent = error.message;
            authError.classList.remove("hidden");
            authBtn.disabled = false;
            authBtn.textContent = isLoginMode ? "Login" : "Register";
        }
    });

    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
    });

    function showAuth() {
        dashboardView.classList.add("hidden");
        authView.classList.remove("hidden");
        authForm.reset();
    }

    function showDashboard() {
        authView.classList.add("hidden");
        dashboardView.classList.remove("hidden");
        welcomeMessage.textContent = `Welcome, ${currentUser.email.split('@')[0]}`;
        renderSubscriptions();
    }

    addSubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("sub-name").value.trim();
        const cost = parseFloat(document.getElementById("sub-cost").value);
        const cycle = document.getElementById("sub-cycle").value;

        const { error } = await supabase
            .from('subscriptions')
            .insert([{ user_id: currentUser.id, name, cost, cycle }]);

        if (!error) {
            addSubForm.reset();
            renderSubscriptions();
        }
    });

    window.deleteSubscription = async function(id) {
        const { error } = await supabase.from('subscriptions').delete().eq('id', id);
        if (!error) renderSubscriptions();
    };

    async function renderSubscriptions() {
        subsGrid.innerHTML = "Loading...";
        const { data: subs, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentUser.id);

        subsGrid.innerHTML = "";
        let monthlyTotal = 0;

        if (error || !subs || subs.length === 0) {
            subsGrid.innerHTML = `<p style="color: var(--text-muted);">No subscriptions found.</p>`;
            totalMonthlyCost.textContent = `Total: $0.00 / mo`;
            return;
        }

        subs.forEach(sub => {
            let monthly = parseFloat(sub.cost);
            if (sub.cycle === "Yearly") monthly /= 12;
            if (sub.cycle === "Weekly") monthly *= 4.33;
            monthlyTotal += monthly;

            const card = document.createElement("div");
            card.className = "sub-card";
            card.innerHTML = `
                <div class="sub-header">
                    <h3 class="sub-name">${sub.name}</h3>
                    <button class="delete-btn" onclick="deleteSubscription('${sub.id}')">&times;</button>
                </div>
                <div class="sub-price">$${parseFloat(sub.cost).toFixed(2)} <span class="sub-cycle">/ ${sub.cycle.toLowerCase()}</span></div>
            `;
            subsGrid.appendChild(card);
        });
        totalMonthlyCost.textContent = `Total: $${monthlyTotal.toFixed(2)} / mo`;
    }
});

*/
