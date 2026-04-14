import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
    'https://honudnbnumkoytlygbhx.supabase.co',
    'sb_publishable_eHzVx9-Sq0hdiepUnxgcPQ_Ti0437dl'
)

// Service → emoji map for card badges
const SERVICE_EMOJI = {
    netflix:    '🎬', spotify:   '🎵', hulu:       '📺', youtube:   '▶️',
    amazon:     '📦', prime:     '📦', disney:     '✨', apple:     '🍎',
    hbo:        '🎭', max:       '🎭', gym:        '💪', fitness:   '💪',
    adobe:      '🎨', figma:     '🎨', notion:     '📝', slack:     '💬',
    zoom:       '📹', dropbox:   '☁️', github:     '⚙️', linkedin:  '💼',
    news:       '📰', times:     '📰', wsj:        '📰', nyt:       '📰',
    icloud:     '☁️', google:    '☁️', microsoft:  '🖥️', xbox:      '🎮',
    playstation:'🎮', ps:        '🎮', nintendo:   '🎮', twitch:    '🎮',
    audible:    '🎧', kindle:    '📖', duolingo:   '🦜', grammarly: '✍️',
};

function getEmoji(name) {
    const lower = name.toLowerCase();
    for (const [key, emoji] of Object.entries(SERVICE_EMOJI)) {
        if (lower.includes(key)) return emoji;
    }
    return name.trim().charAt(0).toUpperCase();
}

const COLORS = ['0', '1', '2', '3', '4', '5'];

function getMonthlyEquiv(cost, cycle) {
    if (cycle === 'Yearly')  return cost / 12;
    if (cycle === 'Weekly')  return cost * 4.33;
    return cost; // Monthly
}

document.addEventListener("DOMContentLoaded", () => {
    let isLoginMode = true;
    let currentUser = null;

    // DOM
    const authView        = document.getElementById("auth-view");
    const authForm        = document.getElementById("auth-form");
    const authSubtitle    = document.getElementById("auth-subtitle");
    const authBtn         = document.getElementById("auth-btn");
    const toggleAuthLink  = document.getElementById("toggle-auth-link");
    const authToggleText  = document.getElementById("auth-toggle-text");
    const authError       = document.getElementById("auth-error");
    const emailInput      = document.getElementById("email");
    const passwordInput   = document.getElementById("password");

    const dashboardView     = document.getElementById("dashboard-view");
    const welcomeMessage    = document.getElementById("welcome-message");
    const logoutBtn         = document.getElementById("logout-btn");
    const addSubForm        = document.getElementById("add-sub-form");
    const subsGrid          = document.getElementById("subs-grid");
    const totalMonthlyCost  = document.getElementById("total-monthly-cost");

    // Stat elements
    const statMonthly = document.getElementById("stat-monthly");
    const statAnnual  = document.getElementById("stat-annual");
    const statCount   = document.getElementById("stat-count");

    // Auth state
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            showDashboard();
        } else {
            currentUser = null;
            authBtn.disabled = false;
            authBtn.textContent = isLoginMode ? "Login" : "Register";
            showAuth();
        }
    });

    toggleAuthLink.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authError.classList.add("hidden");
        authSubtitle.textContent = isLoginMode ? "Sign in to manage your bills" : "Create an account to get started";
        authBtn.textContent      = isLoginMode ? "Login" : "Create Account";
        authToggleText.textContent  = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuthLink.textContent  = isLoginMode ? "Register here" : "Login here";
    });

    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email    = emailInput.value.trim();
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
            authBtn.textContent = isLoginMode ? "Login" : "Create Account";
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
        const name = currentUser.email.split('@')[0];
        welcomeMessage.innerHTML = `Welcome, <strong>${name}</strong>`;
        renderSubscriptions();
    }

    addSubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name  = document.getElementById("sub-name").value.trim();
        const cost  = parseFloat(document.getElementById("sub-cost").value);
        const cycle = document.getElementById("sub-cycle").value;

        const submitBtn = addSubForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Adding...";

        const { error } = await supabase
            .from('subscriptions')
            .insert([{ user_id: currentUser.id, name, cost, cycle }]);

        submitBtn.disabled = false;
        submitBtn.textContent = "Add Plan";

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
        // Show skeleton loaders
        subsGrid.innerHTML = `
            ${Array(3).fill(`
                <div class="skeleton-card">
                    <div class="skeleton-line" style="width:40px;height:40px;border-radius:10px;margin-bottom:1rem"></div>
                    <div class="skeleton-line" style="width:55%;height:14px;margin-bottom:0.6rem"></div>
                    <div class="skeleton-line" style="width:30%;height:12px;margin-bottom:1.5rem"></div>
                    <div class="skeleton-line" style="width:40%;height:22px"></div>
                </div>
            `).join('')}
        `;

        const { data: subs, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        subsGrid.innerHTML = "";

        if (error || !subs || subs.length === 0) {
            subsGrid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🗂️</span>
                    <p>No subscriptions yet — add your first plan above.</p>
                </div>
            `;
            updateStats(0, 0);
            return;
        }

        let monthlyTotal = 0;

        subs.forEach((sub, idx) => {
            const monthly = getMonthlyEquiv(parseFloat(sub.cost), sub.cycle);
            monthlyTotal += monthly;

            const colorIdx  = idx % COLORS.length;
            const badgeChar = getEmoji(sub.name);
            const isEmoji   = badgeChar.length > 1 || badgeChar.charCodeAt(0) > 127;

            // If not yearly, show monthly equiv note
            let monthlyNote = '';
            if (sub.cycle === 'Yearly') {
                monthlyNote = `≈ $${monthly.toFixed(2)} / mo`;
            } else if (sub.cycle === 'Weekly') {
                monthlyNote = `≈ $${monthly.toFixed(2)} / mo`;
            }

            const card = document.createElement("div");
            card.className = "sub-card";
            card.setAttribute("data-color", colorIdx);
            card.style.animationDelay = `${idx * 60}ms`;

            card.innerHTML = `
                <div class="sub-header">
                    <div class="sub-header-left">
                        <div class="sub-card-badge">${badgeChar}</div>
                        <div class="sub-info">
                            <p class="sub-name">${sub.name}</p>
                            <span class="sub-cycle-badge">${sub.cycle}</span>
                        </div>
                    </div>
                    <button class="delete-btn" onclick="deleteSubscription('${sub.id}')" title="Remove">✕</button>
                </div>
                <div class="sub-footer">
                    <div class="sub-price">
                        <sup>$</sup>${parseFloat(sub.cost).toFixed(2)}
                    </div>
                    <div class="sub-monthly">
                        ${monthlyNote ? `<strong>${monthlyNote}</strong>` : ''}
                        <span>per ${sub.cycle.toLowerCase()}</span>
                    </div>
                </div>
            `;
            subsGrid.appendChild(card);
        });

        updateStats(monthlyTotal, subs.length);
    }

    function updateStats(monthlyTotal, count) {
        const annual = monthlyTotal * 12;

        totalMonthlyCost.textContent = `Total: $${monthlyTotal.toFixed(2)} / mo`;

        animateValue(statMonthly, monthlyTotal, (v) => `$${v.toFixed(2)}`);
        animateValue(statAnnual,  annual,        (v) => `$${v.toFixed(2)}`);
        animateValue(statCount,   count,          (v) => Math.round(v).toString());
    }

    function animateValue(el, target, formatter) {
        const start    = 0;
        const duration = 600;
        const startTs  = performance.now();

        function step(ts) {
            const progress = Math.min((ts - startTs) / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            el.textContent = formatter(start + (target - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }
});