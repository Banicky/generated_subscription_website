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