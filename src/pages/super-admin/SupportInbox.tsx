import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/auth';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Clock, 
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function SupportInbox() {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const chatsQuery = query(
      collection(db, 'support_messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Group messages by chatId to get unique chats
      const chatMap = new Map();
      allMessages.forEach((msg: any) => {
        if (!chatMap.has(msg.chatId)) {
          chatMap.set(msg.chatId, {
            id: msg.chatId,
            senderName: msg.senderName,
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt,
            unreadCount: allMessages.filter((m: any) => m.chatId === msg.chatId && !m.isRead && m.senderId !== 'super-admin').length,
            otherPartyId: msg.senderId === 'super-admin' ? msg.receiverId : msg.senderId
          });
        }
      });

      setChats(Array.from(chatMap.values()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_messages');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;

    const messagesQuery = query(
      collection(db, 'support_messages'),
      where('chatId', '==', selectedChat.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Mark as read
      snapshot.docs.forEach(async (messageDoc) => {
        const msgData = messageDoc.data();
        if (!msgData.isRead && msgData.senderId !== 'super-admin') {
          try {
            await updateDoc(doc(db, 'support_messages', messageDoc.id), { isRead: true });
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_messages');
    });

    return () => unsubscribe();
  }, [selectedChat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
      await addDoc(collection(db, 'support_messages'), {
        chatId: selectedChat.id,
        senderId: 'super-admin',
        senderName: 'Support Team',
        receiverId: selectedChat.id,
        content: newMessage,
        createdAt: new Date().toISOString(),
        isRead: false
      });
      
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'support_messages');
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Support Inbox</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No support tickets yet.</div>
          ) : chats.map((chat) => (
            <button 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 text-left ${
                selectedChat?.id === chat.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
              }`}
            >
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{chat.senderName || 'User ' + chat.otherPartyId.slice(0, 5)}</span>
                  <span className="text-[10px] text-gray-400">{new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{chat.lastMessage}</div>
              </div>
              {chat.unreadCount > 0 && (
                <div className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {chat.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-800/30">
        {selectedChat ? (
          <>
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Support Ticket: {selectedChat.id}</h3>
                  <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Online
                  </div>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.senderId === 'super-admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                    msg.senderId === 'super-admin' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 rounded-tl-none'
                  }`}>
                    <div>{msg.content}</div>
                    <div className={`text-[10px] mt-2 flex items-center gap-1 ${
                      msg.senderId === 'super-admin' ? 'text-indigo-200' : 'text-gray-400'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.senderId === 'super-admin' && msg.isRead && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your response..."
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Select a Support Ticket</h3>
            <div className="text-gray-500 max-w-xs">Choose a conversation from the left to start responding to coaching owners.</div>
          </div>
        )}
      </div>
    </div>
  );
}
