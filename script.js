// Data State
let subscriptions = [
    { label: 'Netflix', cost: 15.99, cycle: 'Monthly' },
    { label: 'Spotify', cost: 10.99, cycle: 'Monthly' },
    { label: 'Amazon Prime', cost: 139.00, cycle: 'Yearly' }
];

let myChart;

// --- Authentication UI ---
function login() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    renderSubscriptions();
    renderChart();
}

// --- Navigation ---
function switchTab(tabId) {
    // Update nav links
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');

    // Update main views
    document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    if(tabId === 'dashboard') {
        renderChart(); // Refresh chart when visiting dashboard
    }
}

// --- Subscription Management ---
function renderSubscriptions() {
    const list = document.getElementById('subscription-list');
    list.innerHTML = '';
    subscriptions.forEach(sub => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${sub.label}</strong> <small>(${sub.cycle})</small></span>
            <span>$${sub.cost.toFixed(2)}</span>
        `;
        list.appendChild(li);
    });
}

function addSubscription() {
    const name = document.getElementById('sub-name').value;
    const cost = parseFloat(document.getElementById('sub-cost').value);
    const cycle = document.getElementById('sub-cycle').value;

    if (name && !isNaN(cost)) {
        subscriptions.push({ label: name, cost: cost, cycle: cycle });
        renderSubscriptions();
        
        // Reset inputs
        document.getElementById('sub-name').value = '';
        document.getElementById('sub-cost').value = '';
        alert(`Successfully added ${name}. If email alerts are on, you will be notified before the next billing date.`);
    } else {
        alert("Please enter a valid label and cost.");
    }
}

// --- Chart.js Graph Implementation ---
function renderChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    // Quick math to normalize costs to a monthly metric
    const labels = subscriptions.map(sub => sub.label);
    const data = subscriptions.map(sub => {
        if(sub.cycle === 'Yearly') return sub.cost / 12;
        if(sub.cycle === 'Weekly') return sub.cost * 4;
        return sub.cost;
    });

    if (myChart) myChart.destroy(); // Destroy previous instance if it exists

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Estimated Cost ($)',
                data: data,
                backgroundColor: '#764ba2',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// --- Community Chat Logic ---
function openChat(userName, service) {
    document.getElementById('chat-header').innerText = `Chatting with ${userName} about ${service}`;
    
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
        <div class="msg them">Hi! I saw you are looking to split a ${service} plan?</div>
    `;
    
    // Enable inputs
    document.getElementById('msg-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
}

function sendMessage() {
    const input = document.getElementById('msg-input');
    const msgText = input.value.trim();
    if (msgText) {
        const messages = document.getElementById('chat-messages');
        messages.innerHTML += `<div class="msg me">${msgText}</div>`;
        input.value = '';
        
        // Auto-scroll to bottom
        messages.scrollTop = messages.scrollHeight;
    }
}
