import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock initial database / messages endpoint for abstract API layer
const messagesDatabase = [
  {
    id: 'msg_1',
    groupId: 'grp_eng',
    groupName: 'Core Engineering',
    sender: 'Alex Rivera',
    senderColor: '#128C7E',
    isMe: false,
    text: 'Hey everyone, the new API contracts are deployed to staging.',
    timestamp: '10:14 AM'
  },
  {
    id: 'msg_2',
    groupId: 'grp_product',
    groupName: 'Product Strategy',
    sender: 'Sarah Chen',
    senderColor: '#E542A3',
    isMe: false,
    text: 'Awesome! Can we double check the mobile dashboard layout on iOS viewport?',
    timestamp: '10:16 AM'
  },
  {
    id: 'msg_3',
    groupId: 'grp_eng',
    groupName: 'Core Engineering',
    sender: 'You',
    senderColor: '#075E54',
    isMe: true,
    text: 'Yes, testing responsive views and auto-polling fallback right now.',
    timestamp: '10:18 AM'
  },
  {
    id: 'msg_4',
    groupId: 'grp_community',
    groupName: 'Community Ops',
    sender: 'Marcus Vance',
    senderColor: '#34B7F1',
    isMe: false,
    text: 'Community feedback on WhatsApp interface integration has been super positive.',
    timestamp: '10:22 AM'
  },
  {
    id: 'msg_5',
    groupId: 'grp_eng',
    groupName: 'Core Engineering',
    sender: 'Elena Rostova',
    senderColor: '#9C27B0',
    isMe: false,
    text: 'Polling interval set to 3s with automatic mock fallback on endpoint failure.',
    timestamp: '10:25 AM'
  },
  {
    id: 'msg_6',
    groupId: 'grp_product',
    groupName: 'Product Strategy',
    sender: 'David Kim',
    senderColor: '#FF9800',
    isMe: false,
    text: 'Matrix group filter checkboxes are live on the dashboard view.',
    timestamp: '10:28 AM'
  }
];

app.get('/api/messages', (req, res) => {
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    data: messagesDatabase
  });
});

app.listen(PORT, () => {
  console.log(`WhatsApp Dashboard server running on http://localhost:${PORT}`);
});
