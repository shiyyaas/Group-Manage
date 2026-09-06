// WhatsApp Dashboard Controller Logic

const FALLBACK_MOCK_MESSAGES = [
  {
    id: 'mock_1',
    groupId: 'grp_eng',
    groupName: 'Core Engineering',
    sender: 'Alex Rivera',
    senderColor: '#128C7E',
    isMe: false,
    text: 'Hey everyone, the new API contracts are deployed to staging.',
    timestamp: '10:14 AM'
  },
  {
    id: 'mock_2',
    groupId: 'grp_product',
    groupName: 'Product Strategy',
    sender: 'Sarah Chen',
    senderColor: '#E542A3',
    isMe: false,
    text: 'Awesome! Can we double check the mobile dashboard layout on iOS viewport?',
    timestamp: '10:16 AM'
  },
  {
    id: 'mock_3',
    groupId: 'grp_eng',
    groupName: 'Core Engineering',
    sender: 'You',
    senderColor: '#075E54',
    isMe: true,
    text: 'Yes, testing responsive views and auto-polling fallback right now.',
    timestamp: '10:18 AM'
  },
  {
    id: 'mock_4',
    groupId: 'grp_community',
    groupName: 'Community Ops',
    sender: 'Marcus Vance',
    senderColor: '#34B7F1',
    isMe: false,
    text: 'Community feedback on WhatsApp interface integration has been super positive.',
    timestamp: '10:22 AM'
  },
  {
    id: 'mock_5',
    groupId: 'grp_eng',
    groupName: 'Core Engineering',
    sender: 'Elena Rostova',
    senderColor: '#9C27B0',
    isMe: false,
    text: 'Polling interval set to 3s with automatic mock fallback on endpoint failure.',
    timestamp: '10:25 AM'
  },
  {
    id: 'mock_6',
    groupId: 'grp_product',
    groupName: 'Product Strategy',
    sender: 'David Kim',
    senderColor: '#FF9800',
    isMe: false,
    text: 'Matrix group filter checkboxes are live on the dashboard view.',
    timestamp: '10:28 AM'
  }
];

const AVAILABLE_GROUPS = [
  { id: 'grp_eng', name: 'Core Engineering', count: 3, avatar: 'CE' },
  { id: 'grp_product', name: 'Product Strategy', count: 2, avatar: 'PS' },
  { id: 'grp_community', name: 'Community Ops', count: 1, avatar: 'CO' }
];

class WhatsAppDashboardApp {
  constructor() {
    this.messages = [];
    this.selectedGroups = new Set(['grp_eng', 'grp_product', 'grp_community']);
    this.isPolling = true;
    this.pollingInterval = null;
    this.isScanSimulated = false;

    this.initDOM();
    this.initEvents();
    this.renderGroupsMatrix();
    this.startPolling();
  }

  initDOM() {
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.viewPanels = document.querySelectorAll('.view-panel');
    this.dataModeBadge = document.getElementById('data-mode-badge');
    this.statusDot = document.querySelector('.status-dot');
    this.pollToggleBtn = document.getElementById('poll-toggle-btn');
    this.authPulse = document.getElementById('auth-pulse');
    this.authStatusText = document.getElementById('auth-status-text');
    this.scanOverlay = document.getElementById('scan-overlay');
    this.simScanBtn = document.getElementById('sim-scan-btn');
    this.groupsContainer = document.getElementById('groups-list-container');
    this.selectAllBtn = document.getElementById('select-all-groups');
    this.deselectAllBtn = document.getElementById('deselect-all-groups');
    this.timelineContainer = document.getElementById('messages-timeline');
    this.activeGroupsCountEl = document.getElementById('active-groups-count');
    this.unreadCountBadge = document.getElementById('unread-count');
    this.jumpMatrixBtn = document.getElementById('btn-jump-matrix');
    this.simMsgInput = document.getElementById('sim-msg-input');
    this.simMsgSend = document.getElementById('sim-msg-send');
  }

  initEvents() {
    // SPA Tab Navigation
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Jump from Feed to Matrix
    if (this.jumpMatrixBtn) {
      this.jumpMatrixBtn.addEventListener('click', () => this.switchView('matrix-view'));
    }

    // Toggle Polling
    if (this.pollToggleBtn) {
      this.pollToggleBtn.addEventListener('click', () => {
        this.isPolling = !this.isPolling;
        this.statusDot.className = `status-dot ${this.isPolling ? 'online' : 'offline'}`;
        if (this.isPolling) {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      });
    }

    // Auth Simulation
    if (this.simScanBtn) {
      this.simScanBtn.addEventListener('click', () => this.toggleScanSimulation());
    }

    // Matrix Group Controls
    if (this.selectAllBtn) {
      this.selectAllBtn.addEventListener('click', () => {
        AVAILABLE_GROUPS.forEach(g => this.selectedGroups.add(g.id));
        this.updateMatrixCheckboxes();
        this.renderTimeline();
      });
    }

    if (this.deselectAllBtn) {
      this.deselectAllBtn.addEventListener('click', () => {
        this.selectedGroups.clear();
        this.updateMatrixCheckboxes();
        this.renderTimeline();
      });
    }

    // Message Input simulation
    const sendMessage = () => {
      const text = this.simMsgInput.value.trim();
      if (!text) return;
      const newMsg = {
        id: `msg_user_${Date.now()}`,
        groupId: 'grp_eng',
        groupName: 'Core Engineering',
        sender: 'You',
        senderColor: '#075E54',
        isMe: true,
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.messages.push(newMsg);
      this.simMsgInput.value = '';
      this.renderTimeline();
    };

    if (this.simMsgSend) this.simMsgSend.addEventListener('click', sendMessage);
    if (this.simMsgInput) {
      this.simMsgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
      });
    }
  }

  switchView(viewId) {
    this.tabBtns.forEach(btn => {
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.viewPanels.forEach(panel => {
      if (panel.id === viewId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }

  toggleScanSimulation() {
    this.isScanSimulated = !this.isScanSimulated;
    if (this.isScanSimulated) {
      this.scanOverlay.classList.remove('hidden');
      this.authPulse.classList.add('connected');
      this.authStatusText.textContent = 'Status: Connected & Authenticated';
      this.simScanBtn.textContent = 'Disconnect Session';
    } else {
      this.scanOverlay.classList.add('hidden');
      this.authPulse.classList.remove('connected');
      this.authStatusText.textContent = 'Status: Awaiting Scan';
      this.simScanBtn.textContent = 'Simulate QR Scan';
    }
  }

  renderGroupsMatrix() {
    if (!this.groupsContainer) return;
    this.groupsContainer.innerHTML = '';

    AVAILABLE_GROUPS.forEach(grp => {
      const isChecked = this.selectedGroups.has(grp.id);
      const itemEl = document.createElement('div');
      itemEl.className = 'group-item-row';
      itemEl.innerHTML = `
        <div class="group-info">
          <div class="group-avatar">${grp.avatar}</div>
          <div>
            <div class="group-title">${grp.name}</div>
            <div class="group-subtext">Active messages in stream</div>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" data-group-id="${grp.id}" ${isChecked ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;

      const checkbox = itemEl.querySelector('input[type="checkbox"]');
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedGroups.add(grp.id);
        } else {
          this.selectedGroups.delete(grp.id);
        }
        this.renderTimeline();
      });

      this.groupsContainer.appendChild(itemEl);
    });
  }

  updateMatrixCheckboxes() {
    const checkboxes = this.groupsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      const gId = cb.getAttribute('data-group-id');
      cb.checked = this.selectedGroups.has(gId);
    });
  }

  async fetchMessages() {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();

      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        this.messages = json.data;
        this.setModeBadge('API MODE', 'mode-api');
      } else {
        // Fallback to mock data if response array is empty
        this.messages = FALLBACK_MOCK_MESSAGES;
        this.setModeBadge('MOCK FALLBACK', 'mode-mock');
      }
    } catch (err) {
      console.warn('API endpoint unavailable, engaging hardcoded Mock fallback:', err);
      this.messages = FALLBACK_MOCK_MESSAGES;
      this.setModeBadge('MOCK FALLBACK', 'mode-mock');
    }

    this.renderTimeline();
  }

  setModeBadge(text, className) {
    if (this.dataModeBadge) {
      this.dataModeBadge.textContent = text;
      this.dataModeBadge.className = `badge ${className}`;
    }
  }

  startPolling() {
    this.fetchMessages();
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      if (this.isPolling) {
        this.fetchMessages();
      }
    }, 4000);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  renderTimeline() {
    if (!this.timelineContainer) return;

    // Filter messages based on matrix group selection
    const filteredMessages = this.messages.filter(msg => this.selectedGroups.has(msg.groupId));

    // Update summary counters
    if (this.activeGroupsCountEl) {
      this.activeGroupsCountEl.textContent = `${this.selectedGroups.size} group${this.selectedGroups.size === 1 ? '' : 's'}`;
    }
    if (this.unreadCountBadge) {
      this.unreadCountBadge.textContent = filteredMessages.length;
    }

    this.timelineContainer.innerHTML = '';

    if (filteredMessages.length === 0) {
      this.timelineContainer.innerHTML = `
        <div style="text-align: center; color: var(--wa-text-muted); padding: 40px 20px; font-size: 0.88rem;">
          No active groups selected. Toggle groups in the <strong>Groups Matrix</strong> view to stream messages.
        </div>
      `;
      return;
    }

    filteredMessages.forEach(msg => {
      const bubbleEl = document.createElement('div');
      bubbleEl.className = `msg-bubble ${msg.isMe ? 'outbound' : 'inbound'}`;

      const senderColor = msg.senderColor || '#128C7E';

      bubbleEl.innerHTML = `
        ${!msg.isMe ? `
          <div class="msg-header-meta">
            <span class="sender-name" style="color: ${senderColor};">${msg.sender}</span>
            <span class="group-tag">${msg.groupName}</span>
          </div>
        ` : ''}
        <div class="msg-body">${msg.text}</div>
        <div class="msg-footer">
          <span class="timestamp">${msg.timestamp}</span>
          ${msg.isMe ? `
            <svg class="read-ticks" viewBox="0 0 16 11" fill="none">
              <path d="M11.025 0.375L5.25 6.15L2.475 3.375L0.875 4.975L5.25 9.35L12.625 1.975L11.025 0.375ZM14.125 1.975L6.75 9.35L5.725 8.325L7.325 6.725L12.525 1.525L14.125 1.975Z" fill="#53BDEB"/>
            </svg>
          ` : ''}
        </div>
      `;

      this.timelineContainer.appendChild(bubbleEl);
    });

    // Auto scroll to bottom of chat surface
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
  }
}

// Instantiate app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WhatsAppDashboardApp();
});
