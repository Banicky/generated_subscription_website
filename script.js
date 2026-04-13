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

    // Helper: Map subscription names to FontAwesome icons
    function getIconForSub(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('netflix') || lowerName.includes('hulu') || lowerName.includes('disney')) return 'fa-brands fa-youtube';
        if (lowerName.includes('spotify') || lowerName.includes('apple music')) return 'fa-brands fa-spotify';
        if (lowerName.includes('gym') || lowerName.includes('fitness')) return 'fa-solid fa-dumbbell';
        if (lowerName.includes('aws') || lowerName.includes('cloud')) return 'fa-brands fa-aws';
        if (lowerName.includes('github')) return 'fa-brands fa-github';
        if (lowerName.includes('adobe')) return 'fa-solid fa-pen-nib';
        if (lowerName.includes('game') || lowerName.includes('xbox') || lowerName.includes('playstation')) return 'fa-solid fa-gamepad';
        return 'fa-solid fa-file-invoice-dollar'; // Default icon
    }

    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            showDashboard();
        } else {
            currentUser = null;
            authBtn.disabled = false;
            authBtn.innerHTML = isLoginMode ? '<span>Login</span> <i class="fa-solid fa-arrow-right"></i>' : '<span>Register</span> <i class="fa-solid fa-user-plus"></i>';
            showAuth();
        }
    });

    toggleAuthLink.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authError.classList.add("hidden");
        authSubtitle.textContent = isLoginMode ? "Sign in to manage your bills" : "Create an account to get started";
        authBtn.innerHTML = isLoginMode ? '<span>Login</span> <i class="fa-solid fa-arrow-right"></i>' : '<span>Register</span> <i class="fa-solid fa-user-plus"></i>';
        authToggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuthLink.textContent = isLoginMode ? "Register here" : "Login here";
    });

    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        authBtn.disabled = true;
        authBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Processing...</span>';
        authError.classList.add("hidden");

        const { error } = isLoginMode 
            ? await supabase.auth.signInWithPassword({ email, password })
            : await supabase.auth.signUp({ email, password });

        if (error) {
            authError.textContent = error.message;
            authError.classList.remove("hidden");
            authBtn.disabled = false;
            authBtn.innerHTML = isLoginMode ? '<span>Login</span> <i class="fa-solid fa-arrow-right"></i>' : '<span>Register</span> <i class="fa-solid fa-user-plus"></i>';
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
        welcomeMessage.textContent = `${currentUser.email.split('@')[0]}`;
        renderSubscriptions();
    }

    addSubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("sub-name").value.trim();
        const cost = parseFloat(document.getElementById("sub-cost").value);
        const cycle = document.getElementById("sub-cycle").value;

        const btn = addSubForm.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
        btn.disabled = true;

        const { error } = await supabase
            .from('subscriptions')
            .insert([{ user_id: currentUser.id, name, cost, cycle }]);

        btn.innerHTML = originalText;
        btn.disabled = false;

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
        subsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
        const { data: subs, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentUser.id);

        subsGrid.innerHTML = "";
        let monthlyTotal = 0;

        if (error || !subs || subs.length === 0) {
            subsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: var(--card-bg); border-radius: 20px; border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-muted); font-weight: 500;">No active subscriptions found. Add one above!</p>
                </div>`;
            totalMonthlyCost.textContent = `$0.00`;
            return;
        }

        subs.forEach(sub => {
            let monthly = parseFloat(sub.cost);
            if (sub.cycle === "Yearly") monthly /= 12;
            if (sub.cycle === "Weekly") monthly *= 4.33;
            monthlyTotal += monthly;

            const iconClass = getIconForSub(sub.name);

            const card = document.createElement("div");
            card.className = "sub-card";
            card.innerHTML = `
                <div class="sub-header">
                    <div class="brand-info">
                        <div class="brand-icon">
                            <i class="${iconClass}"></i>
                        </div>
                        <div>
                            <h3 class="sub-name">${sub.name}</h3>
                            <div class="sub-cycle-badge">${sub.cycle}</div>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteSubscription('${sub.id}')" title="Remove subscription">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <div class="sub-footer">
                    <div class="sub-price">$${parseFloat(sub.cost).toFixed(2)} <span>/ ${sub.cycle.toLowerCase()}</span></div>
                </div>
            `;
            subsGrid.appendChild(card);
        });
        totalMonthlyCost.textContent = `$${monthlyTotal.toFixed(2)}`;
    }
});
