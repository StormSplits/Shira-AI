import React, { useState, useRef, useEffect } from 'react'
import { Menu, MessageSquare, Search, Send, X, Copy, ChevronRight, Trash, Edit, Globe, Loader, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import axios from 'axios'

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'ai';
};

type ChatSession = {
  id: number;
  title: string;
  messages: Message[];
};

const STORAGE_KEY = 'chatSessions';
const CURRENT_SESSION_KEY = 'currentSession';

export default function AIAssistantUI() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [currentSession, setCurrentSession] = useState<ChatSession>(() => {
    const savedSession = localStorage.getItem(CURRENT_SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : { id: Date.now(), title: 'New Chat', messages: [] };
  })
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    return savedSessions ? JSON.parse(savedSessions) : [];
  })
  const [showExamples, setShowExamples] = useState(true)
  const [webAccessEnabled, setWebAccessEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  // Save current session to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(currentSession));
  }, [currentSession]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSendMessage = async (message: string = input) => {
    if (message.trim() === '') return

    const newMessage: Message = {
      id: Date.now(),
      text: message,
      sender: 'user'
    }

    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, newMessage],
      title: currentSession.title === 'New Chat' ? message : currentSession.title
    }

    setCurrentSession(updatedSession)
    updateChatSessions(updatedSession)
    setInput('')
    setShowExamples(false)
    setIsLoading(true)

    try {
      const response = await axios.post('/chat', {
        message: message,
        chatId: currentSession.id,
        webAccess: webAccessEnabled
      })

      const aiResponse: Message = {
        id: Date.now(),
        text: response.data.response,
        sender: 'ai'
      }

      const finalUpdatedSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, aiResponse]
      }

      setCurrentSession(finalUpdatedSession)
      updateChatSessions(finalUpdatedSession)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateChatSessions = (session: ChatSession) => {
    setChatSessions(prevSessions => {
      const existingSessionIndex = prevSessions.findIndex(s => s.id === session.id)
      if (existingSessionIndex !== -1) {
        // Update existing session
        const updatedSessions = [...prevSessions]
        updatedSessions[existingSessionIndex] = session
        return updatedSessions
      } else {
        // Add new session
        return [...prevSessions, session]
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    })
  }

  const startNewConversation = () => {
    if (currentSession.messages.length > 0) {
      updateChatSessions(currentSession)
    }
    const newSession = { id: Date.now(), title: 'New Chat', messages: [] };
    setCurrentSession(newSession)
    setShowExamples(true)
  }

  const openChatSession = (session: ChatSession) => {
    setCurrentSession(session)
    setShowExamples(false)
    setIsSidebarOpen(false)
  }

  const deleteChatSession = (id: number) => {
    setChatSessions(prevSessions => prevSessions.filter(session => session.id !== id))
    if (currentSession.id === id) {
      startNewConversation()
    }
  }

  const startRenamingSession = (id: number, currentTitle: string) => {
    setEditingSessionId(id)
    setEditingTitle(currentTitle)
  }

  const saveRenamedSession = (id: number) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === id ? { ...session, title: editingTitle } : session
      )
    )
    if (currentSession.id === id) {
      setCurrentSession(prev => ({ ...prev, title: editingTitle }))
    }
    setEditingSessionId(null)
  }

  const cancelRenaming = () => {
    setEditingSessionId(null)
  }

  const handleRenamingKeyPress = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter') {
      saveRenamedSession(id)
    }
  }

  const toggleWebAccess = () => {
    setWebAccessEnabled(!webAccessEnabled)
  }

  const handleExamplePromptClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession.messages])

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img className="h-8 w-8" src="/logo.png" alt="logo-shira" />
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">Shira AI</span>
            </div>
            <div className="flex items-center">
              <nav className="hidden md:flex space-x-4">
                <button onClick={startNewConversation} className="text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">New Conversation</button>
                <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium">History</button>
              </nav>
              <button
                onClick={toggleMenu}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white dark:bg-gray-800 z-20">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <button onClick={startNewConversation} className="text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium">New Conversation</button>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium">History</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow overflow-y-auto pt-16 pb-24">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {showExamples ? (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Example Prompts</h2>
              {/* Example Prompts Grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Prompt 1 */}
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <MessageSquare className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Explain quantum computing
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                    <button
                      onClick={() => handleExamplePromptClick("Explain quantum computing")}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Use this prompt
                    </button>
                  </div>
                </div>

                {/* Prompt 2 */}
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <MessageSquare className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Write a poem about AI
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                    <button
                      onClick={() => handleExamplePromptClick("Write a poem about AI")}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Use this prompt
                    </button>
                  </div>
                </div>

                {/* Prompt 3 */}
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <MessageSquare className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Solve a coding challenge
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
                    <button
                      onClick={() => handleExamplePromptClick("Solve a coding challenge")}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Use this prompt
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {currentSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-xl px-4 py-2 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {message.sender === 'user' ? (
                      <span>{message.text}</span>
                    ) : (
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                    )}
                    {message.sender === 'ai' && (
                      <button
                        onClick={() => copyToClipboard(message.text)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy message</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* History Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out z-50`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat History</h2>
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-2">
            {chatSessions.map((session) => (
              <div key={session.id} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                <div className="flex justify-between items-center">
                  {editingSessionId === session.id ? (
                    <div className="flex-grow flex items-center mr-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyPress={(e) => handleRenamingKeyPress(e, session.id)}
                        className="w-full max-w-[180px] px-2 py-1 text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-500 rounded"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => openChatSession(session)}
                      className="text-sm font-medium text-gray-900 dark:text-white truncate flex-grow text-left"
                    >
                      {session.title}
                    </button>
                  )}
                  <div className="flex space-x-1 flex-shrink-0">
                    {editingSessionId === session.id ? (
                      <>
                        <button onClick={() => saveRenamedSession(session.id)} className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={cancelRenaming} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startRenamingSession(session.id, session.title)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteChatSession(session.id)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white">
                          <Trash className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ask AI Assistant bar */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <div className="relative flex-grow">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Ask AI Assistant anything..."
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleWebAccess}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  webAccessEnabled ? 'bg-blue-500' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={webAccessEnabled}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    webAccessEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <Globe className={`h-5 w-5 ${webAccessEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              style={{ width: '40px', height: '40px' }}
            >
              {isLoading ? (
                <Loader className="h-5 w-5 mx-auto animate-spin" />
              ) : (
                <Send className="h-5 w-5 mx-auto" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              © 2024 Shira AI. All rights reserved.
            </div>
            <div className="flex space-x-6">
              <a href="https://github.com/StormSplits/Shira-AI" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://dribbble.com/StormSplits" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <span className="sr-only">Dribble</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}