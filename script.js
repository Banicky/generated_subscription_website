import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
    'https://honudnbnumkoytlygbhx.supabase.co',
    'sb_publishable_eHzVx9-Sq0hdiepUnxgcPQ_Ti0437dl'
)

// ── Service emoji map ──────────────────────────────────────
const SERVICE_EMOJI = {
    netflix:'🎬', spotify:'🎵', hulu:'📺', youtube:'▶️',
    amazon:'📦', prime:'📦', disney:'✨', apple:'🍎',
    hbo:'🎭', max:'🎭', gym:'💪', fitness:'💪',
    adobe:'🎨', figma:'🎨', notion:'📝', slack:'💬',
    zoom:'📹', dropbox:'☁️', github:'⚙️', linkedin:'💼',
    news:'📰', times:'📰', wsj:'📰', nyt:'📰',
    icloud:'☁️', google:'☁️', microsoft:'🖥️', xbox:'🎮',
    playstation:'🎮', ps:'🎮', nintendo:'🎮', twitch:'🎮',
    audible:'🎧', kindle:'📖', duolingo:'🦜', grammarly:'✍️',
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
    return cost;
}

function shortName(email) {
    return email ? email.split('@')[0] : 'user';
}

function timeAgo(dateStr) {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    let isLoginMode = true;
    let currentUser = null;
    let activeChatGroupId = null;
    let myGroupIds = new Set();
    let chatSubscription = null;

    // ── DOM refs ──────────────────────────────────────────
    const authView       = document.getElementById("auth-view");
    const authForm       = document.getElementById("auth-form");
    const authSubtitle   = document.getElementById("auth-subtitle");
    const authBtn        = document.getElementById("auth-btn");
    const toggleAuthLink = document.getElementById("toggle-auth-link");
    const authToggleText = document.getElementById("auth-toggle-text");
    const authError      = document.getElementById("auth-error");
    const emailInput     = document.getElementById("email");
    const passwordInput  = document.getElementById("password");

    const dashboardView    = document.getElementById("dashboard-view");
    const welcomeMessage   = document.getElementById("welcome-message");
    const logoutBtn        = document.getElementById("logout-btn");
    const addSubForm       = document.getElementById("add-sub-form");
    const subsGrid         = document.getElementById("subs-grid");
    const totalMonthlyCost = document.getElementById("total-monthly-cost");

    const statMonthly = document.getElementById("stat-monthly");
    const statAnnual  = document.getElementById("stat-annual");
    const statCount   = document.getElementById("stat-count");

    // Navigation
    const navDashboard = document.getElementById("nav-dashboard");
    const navSharing   = document.getElementById("nav-sharing");
    const pageDashboard = document.getElementById("page-dashboard");
    const pageSharing   = document.getElementById("page-sharing");

    // Sharing page
    const groupsGrid     = document.getElementById("groups-grid");
    const myGroupsGrid   = document.getElementById("my-groups-grid");
    const groupsCountPill = document.getElementById("groups-count-pill");
    const groupSearch    = document.getElementById("group-search");

    // Chat
    const chatTabs     = document.getElementById("chat-tabs");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput    = document.getElementById("chat-input");
    const chatSendBtn  = document.getElementById("chat-send-btn");

    // ── Navigation ───────────────────────────────────────
    navDashboard.addEventListener("click", (e) => {
        e.preventDefault();
        switchPage('dashboard');
    });

    navSharing.addEventListener("click", (e) => {
        e.preventDefault();
        switchPage('sharing');
    });

    function switchPage(page) {
        if (page === 'dashboard') {
            pageDashboard.classList.remove("hidden");
            pageSharing.classList.add("hidden");
            navDashboard.classList.add("active");
            navSharing.classList.remove("active");
        } else {
            pageDashboard.classList.add("hidden");
            pageSharing.classList.remove("hidden");
            navDashboard.classList.remove("active");
            navSharing.classList.add("active");
            loadSharingPage();
        }
    }

    // ── Auth ─────────────────────────────────────────────
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
        resetSharingState();
        await supabase.auth.signOut();
    });

    function resetSharingState() {
        // Kill realtime subscription
        if (chatSubscription) {
            supabase.removeChannel(chatSubscription);
            chatSubscription = null;
        }

        // Clear in-memory data
        allGroups = [];
        myGroupIds = new Set();
        activeChatGroupId = null;

        // Reset sharing page DOM to empty defaults
        groupsGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><p>Loading available groups…</p></div>`;
        myGroupsGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">👥</span><p>You haven't joined any groups yet.</p></div>`;
        groupsCountPill.textContent = '0 groups';
        chatTabs.innerHTML = '<div class="chat-tabs-empty">Join a group to start chatting</div>';
        chatMessages.innerHTML = `
            <div class="chat-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>Select a group tab to view messages</p>
            </div>
        `;
        chatInput.disabled = true;
        chatInput.value = '';
        chatSendBtn.disabled = true;

        // Return to dashboard tab
        switchPage('dashboard');
    }

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

        // If the sharing page is currently visible, reload it for the new user
        if (!pageSharing.classList.contains('hidden')) {
            loadSharingPage();
        }
    }

    // ── Add Subscription ─────────────────────────────────
    addSubForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name  = document.getElementById("sub-name").value.trim();
        const cost  = parseFloat(document.getElementById("sub-cost").value);
        const cycle = document.getElementById("sub-cycle").value;
        const maxMembersInput = document.getElementById("sub-max-members").value;
        const maxMembers = maxMembersInput ? parseInt(maxMembersInput) : null;
        const isShared = maxMembers && maxMembers >= 2;

        const submitBtn = addSubForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Adding...";

        // Insert subscription
        const { data: subData, error } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: currentUser.id,
                name,
                cost,
                cycle,
                is_shared: isShared || false,
                max_members: maxMembers || null
            }])
            .select()
            .single();

        // If shared, auto-create the group
        if (!error && isShared && subData) {
            const { data: groupData } = await supabase
                .from('subscription_groups')
                .insert([{
                    subscription_id: subData.id,
                    owner_id: currentUser.id,
                    name: name,
                    cost: cost,
                    cycle: cycle,
                    max_members: maxMembers
                }])
                .select()
                .single();

            // Auto-add owner as first member
            if (groupData) {
                await supabase
                    .from('group_members')
                    .insert([{
                        group_id: groupData.id,
                        user_id: currentUser.id
                    }]);
            }
        }

        submitBtn.disabled = false;
        submitBtn.textContent = "Add Plan";

        if (!error) {
            addSubForm.reset();
            renderSubscriptions();
        }
    });

    window.deleteSubscription = async function(id) {
        // Also delete any associated group
        await supabase.from('subscription_groups').delete().eq('subscription_id', id);
        const { error } = await supabase.from('subscriptions').delete().eq('id', id);
        if (!error) renderSubscriptions();
    };

    // ── Toggle sharing on existing subscription ──────────
    window.toggleShareSubscription = async function(subId, isShared, name, cost, cycle, maxMembers) {
        // Find the card's toggle and badge so we can update in-place
        const toggleInput = document.querySelector(`input[onchange*="'${subId}'"]`);
        const card = toggleInput ? toggleInput.closest('.sub-card') : null;
        const subInfo = card ? card.querySelector('.sub-info') : null;

        // Immediately reflect the toggle state in the UI (optimistic update)
        if (toggleInput) toggleInput.checked = isShared;

        // Update the "Shared" badge in-place
        if (subInfo) {
            const existingBadge = subInfo.querySelector('.share-status-badge');
            if (isShared && !existingBadge) {
                const badge = document.createElement('span');
                badge.className = 'share-status-badge';
                badge.textContent = 'Shared';
                subInfo.appendChild(badge);
            } else if (!isShared && existingBadge) {
                existingBadge.remove();
            }
        }

        // Now persist to database
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ is_shared: isShared, max_members: isShared ? (maxMembers || 4) : null })
            .eq('id', subId);

        if (updateError) {
            // Revert optimistic update on failure
            if (toggleInput) toggleInput.checked = !isShared;
            if (subInfo) {
                const badge = subInfo.querySelector('.share-status-badge');
                if (!isShared && !badge) {
                    const b = document.createElement('span');
                    b.className = 'share-status-badge';
                    b.textContent = 'Shared';
                    subInfo.appendChild(b);
                } else if (isShared && badge) {
                    badge.remove();
                }
            }
            return;
        }

        if (isShared) {
            // Check if group already exists
            const { data: existing } = await supabase
                .from('subscription_groups')
                .select('id')
                .eq('subscription_id', subId)
                .maybeSingle();

            if (!existing) {
                const { data: groupData } = await supabase
                    .from('subscription_groups')
                    .insert([{
                        subscription_id: subId,
                        owner_id: currentUser.id,
                        name, cost, cycle,
                        max_members: maxMembers || 4
                    }])
                    .select()
                    .single();

                if (groupData) {
                    await supabase
                        .from('group_members')
                        .insert([{ group_id: groupData.id, user_id: currentUser.id }]);
                }
            }
        } else {
            // Remove the group and its members/messages cascade via FK
            await supabase
                .from('subscription_groups')
                .delete()
                .eq('subscription_id', subId);
        }

        // No full re-render — the card is already updated in-place
    };

    // ── Render Subscriptions ─────────────────────────────
    async function renderSubscriptions() {
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

            let monthlyNote = '';
            if (sub.cycle === 'Yearly')  monthlyNote = `≈ $${monthly.toFixed(2)} / mo`;
            if (sub.cycle === 'Weekly')  monthlyNote = `≈ $${monthly.toFixed(2)} / mo`;

            const isShared = sub.is_shared || false;
            const maxMembers = sub.max_members || 4;

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
                            ${isShared ? '<span class="share-status-badge">Shared</span>' : ''}
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
                <div class="sub-share-row">
                    <span class="sub-share-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        Public Group
                    </span>
                    <label class="share-toggle">
                        <input type="checkbox" ${isShared ? 'checked' : ''}
                            onchange="toggleShareSubscription('${sub.id}', this.checked, '${sub.name.replace(/'/g,"\\'")}', ${sub.cost}, '${sub.cycle}', ${maxMembers})">
                        <span class="toggle-track"></span>
                        <span class="toggle-thumb"></span>
                    </label>
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
            const eased    = 1 - Math.pow(1 - progress, 3);
            el.textContent = formatter(start + (target - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }


    // ═══════════════════════════════════════════════════════
    // SHARING PAGE
    // ═══════════════════════════════════════════════════════

    let allGroups = [];

    async function loadSharingPage() {
        await Promise.all([loadAvailableGroups(), loadMyGroups()]);
        renderChatTabs();
    }

    // ── Available groups (excludes user's own) ───────────
    async function loadAvailableGroups() {
        groupsGrid.innerHTML = `
            ${Array(3).fill(`
                <div class="skeleton-card" style="height:180px">
                    <div class="skeleton-line" style="width:38px;height:38px;border-radius:10px;margin-bottom:0.8rem"></div>
                    <div class="skeleton-line" style="width:60%;height:14px;margin-bottom:0.5rem"></div>
                    <div class="skeleton-line" style="width:40%;height:12px;margin-bottom:1rem"></div>
                    <div class="skeleton-line" style="width:50%;height:32px"></div>
                </div>
            `).join('')}
        `;

        const { data: groups, error } = await supabase
            .from('subscription_groups')
            .select('*, group_members(user_id)')
            .order('created_at', { ascending: false });

        if (error || !groups) {
            groupsGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>Could not load groups.</p></div>`;
            return;
        }

        // Filter out groups user already belongs to
        allGroups = groups;
        const available = groups.filter(g => {
            const memberIds = (g.group_members || []).map(m => m.user_id);
            return !memberIds.includes(currentUser.id);
        });

        groupsCountPill.textContent = `${available.length} group${available.length !== 1 ? 's' : ''}`;
        renderGroupCards(available, groupsGrid, false);
    }

    // ── My groups ────────────────────────────────────────
    async function loadMyGroups() {
        const { data: memberships } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', currentUser.id);

        if (!memberships || memberships.length === 0) {
            myGroupIds = new Set();
            myGroupsGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">👥</span><p>You haven't joined any groups yet.</p></div>`;
            return;
        }

        const ids = memberships.map(m => m.group_id);
        myGroupIds = new Set(ids);

        const { data: groups } = await supabase
            .from('subscription_groups')
            .select('*, group_members(user_id)')
            .in('id', ids)
            .order('created_at', { ascending: false });

        if (!groups || groups.length === 0) {
            myGroupsGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">👥</span><p>You haven't joined any groups yet.</p></div>`;
            return;
        }

        renderGroupCards(groups, myGroupsGrid, true);
    }

    // ── Render group cards ───────────────────────────────
    function renderGroupCards(groups, container, isMemberView) {
        container.innerHTML = '';

        if (groups.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="empty-icon">${isMemberView ? '👥' : '🔍'}</span><p>${isMemberView ? "You haven't joined any groups yet." : 'No available groups found.'}</p></div>`;
            return;
        }

        groups.forEach((group, idx) => {
            const emoji = getEmoji(group.name);
            const memberCount = (group.group_members || []).length;
            const maxMembers = group.max_members || 4;
            const isFull = memberCount >= maxMembers;
            const perPerson = (group.cost / Math.max(memberCount, 1)).toFixed(2);
            const isOwner = group.owner_id === currentUser.id;

            const card = document.createElement("div");
            card.className = "group-card";
            card.style.animationDelay = `${idx * 50}ms`;

            // Build slot dots
            let slotDots = '';
            for (let i = 0; i < maxMembers; i++) {
                slotDots += `<span class="slot-dot ${i < memberCount ? 'filled' : ''}"></span>`;
            }

            let actionBtn = '';
            if (isMemberView) {
                if (isOwner) {
                    actionBtn = `<button class="btn btn-sm btn-outline-gold" disabled style="opacity:0.6">Owner</button>`;
                } else {
                    actionBtn = `<button class="btn btn-sm btn-danger-outline" onclick="leaveGroup('${group.id}')">Leave</button>`;
                }
            } else {
                if (isFull) {
                    actionBtn = `<button class="btn btn-sm btn-secondary" disabled>Full</button>`;
                } else {
                    actionBtn = `<button class="btn btn-sm btn-outline-gold" onclick="joinGroup('${group.id}')">Join Group</button>`;
                }
            }

            card.innerHTML = `
                <div class="group-card-top">
                    <div class="group-card-badge">${emoji}</div>
                    <div class="group-card-info">
                        <p class="group-card-name">${group.name}</p>
                        <p class="group-card-owner">${isOwner ? 'You' : 'Owner'} · ${group.cycle}</p>
                    </div>
                </div>
                <div class="group-card-meta">
                    <div class="group-card-cost">
                        <sup>$</sup>${perPerson}<span class="per-person"> /person</span>
                    </div>
                    <div class="group-card-slots">
                        ${memberCount}/${maxMembers}
                        <div class="slots-bar">${slotDots}</div>
                    </div>
                </div>
                <div class="group-card-actions">${actionBtn}</div>
            `;
            container.appendChild(card);
        });
    }

    // ── Search filter ────────────────────────────────────
    groupSearch.addEventListener("input", () => {
        const query = groupSearch.value.toLowerCase();
        const available = allGroups.filter(g => {
            const memberIds = (g.group_members || []).map(m => m.user_id);
            const notMember = !memberIds.includes(currentUser.id);
            const matchesQuery = g.name.toLowerCase().includes(query);
            return notMember && matchesQuery;
        });
        renderGroupCards(available, groupsGrid, false);
    });

    // ── Join group ───────────────────────────────────────
    window.joinGroup = async function(groupId) {
        const { error } = await supabase
            .from('group_members')
            .insert([{ group_id: groupId, user_id: currentUser.id }]);

        if (!error) {
            await loadSharingPage();
        }
    };

    // ── Leave group ──────────────────────────────────────
    window.leaveGroup = async function(groupId) {
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', currentUser.id);

        if (!error) {
            if (activeChatGroupId === groupId) {
                activeChatGroupId = null;
            }
            await loadSharingPage();
        }
    };


    // ═══════════════════════════════════════════════════════
    // CHAT
    // ═══════════════════════════════════════════════════════

    function renderChatTabs() {
        chatTabs.innerHTML = '';

        if (myGroupIds.size === 0) {
            chatTabs.innerHTML = '<div class="chat-tabs-empty">Join a group to start chatting</div>';
            chatMessages.innerHTML = `
                <div class="chat-empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p>Join a group to start chatting</p>
                </div>
            `;
            chatInput.disabled = true;
            chatSendBtn.disabled = true;
            return;
        }

        // Get group names for tabs
        const myGroups = allGroups.filter(g => myGroupIds.has(g.id));

        if (myGroups.length === 0) {
            chatTabs.innerHTML = '<div class="chat-tabs-empty">Loading groups…</div>';
            return;
        }

        // If no active chat, select first
        if (!activeChatGroupId || !myGroupIds.has(activeChatGroupId)) {
            activeChatGroupId = myGroups[0].id;
        }

        myGroups.forEach(group => {
            const tab = document.createElement("button");
            tab.className = `chat-tab ${group.id === activeChatGroupId ? 'active' : ''}`;
            tab.textContent = group.name;
            tab.addEventListener("click", () => {
                activeChatGroupId = group.id;
                // Update active state
                chatTabs.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadChatMessages();
                subscribeToChat();
            });
            chatTabs.appendChild(tab);
        });

        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        loadChatMessages();
        subscribeToChat();
    }

    async function loadChatMessages() {
        if (!activeChatGroupId) return;

        chatMessages.innerHTML = `
            <div class="chat-empty-state">
                <div class="skeleton-line" style="width:60%;height:12px;margin-bottom:0.5rem"></div>
                <div class="skeleton-line" style="width:40%;height:12px"></div>
            </div>
        `;

        const { data: messages, error } = await supabase
            .from('group_messages')
            .select('*')
            .eq('group_id', activeChatGroupId)
            .order('created_at', { ascending: true })
            .limit(100);

        chatMessages.innerHTML = '';

        if (error || !messages || messages.length === 0) {
            chatMessages.innerHTML = `
                <div class="chat-empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p>No messages yet — say hello!</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => appendMessage(msg));
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendMessage(msg) {
        // Remove empty state if present
        const emptyState = chatMessages.querySelector('.chat-empty-state');
        if (emptyState) emptyState.remove();

        const isOwn = msg.user_id === currentUser.id;
        const div = document.createElement("div");
        div.className = `chat-msg ${isOwn ? 'own' : ''}`;

        div.innerHTML = `
            <span class="chat-msg-sender">${isOwn ? 'You' : shortName(msg.user_email)}</span>
            <div class="chat-msg-bubble">${escapeHtml(msg.content)}</div>
            <span class="chat-msg-time">${timeAgo(msg.created_at)}</span>
        `;
        chatMessages.appendChild(div);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ── Send message ─────────────────────────────────────
    chatSendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || !activeChatGroupId) return;

        chatInput.value = '';

        const { error } = await supabase
            .from('group_messages')
            .insert([{
                group_id: activeChatGroupId,
                user_id: currentUser.id,
                user_email: currentUser.email,
                content: text
            }]);

        if (error) {
            chatInput.value = text; // restore on error
        }
    }

    // ── Realtime subscription ────────────────────────────
    function subscribeToChat() {
        if (chatSubscription) {
            supabase.removeChannel(chatSubscription);
        }

        if (!activeChatGroupId) return;

        chatSubscription = supabase
            .channel(`chat-${activeChatGroupId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'group_messages',
                    filter: `group_id=eq.${activeChatGroupId}`
                },
                (payload) => {
                    appendMessage(payload.new);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            )
            .subscribe();
    }
});