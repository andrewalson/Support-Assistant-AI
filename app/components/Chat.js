import { Box, Button, Stack, TextField, Avatar, createTheme, ThemeProvider, IconButton } from "@mui/material";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { db } from '../firebase/firebase_api';
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplayIcon from '@mui/icons-material/Replay';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

const customTheme = createTheme({
  palette: {
    primary: { main: '#F5631A' },
    secondary: { main: '#FC2E20' },
    error: { main: '#D41E00' },
    background: {
      default: '#0A0A0A',
      paper: '#FFF3E0'
    },
    text: {
      primary: '#ffffff',
      secondary: '#000000',
    },
  },
});

export default function Chat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Headstarter support assistant. How can I help you today?",
    }
  ]);
  const [markdownContent, setMarkdownContent] = useState("# Hello, Markdown!"); // Markdown content state
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getAvatarSrc = () => {
    return "/favicon.ico"; // Path to the bot.ico inside the app folder for the assistant's avatar
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    alert("Message copied to clipboard!");
  };

  const handleRegenerate = async () => {
    const lastUserMessage = messages.reverse().find(msg => msg.role === 'user')?.content;
    if (lastUserMessage) {
      sendMessage(lastUserMessage);
    }
  };
  // Function to fetch chat history from Firestore
  useEffect(() => {
    if (session) {
      fetchMessages();
    }
  }, [session]);

  const fetchMessages = async () => {
    if (!session) return;
    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("userId", "==", session.user.id), orderBy("createdAt"));
    const querySnapshot = await getDocs(q);
    const loadedMessages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setMessages(previousMessages => [
      ...previousMessages,
      ...loadedMessages
    ]);
  };

  // Function to handle sending messages and streaming the response
  const sendMessage = async (userMessage) => {
    if (!userMessage.trim() || isLoading) return;
    setIsLoading(true);

    setMessages(messages => [
      ...messages,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "user", content: userMessage }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setMessages((currentMessages) => {
          const lastMessage = currentMessages[currentMessages.length - 1];
          const updatedLastMessage = { ...lastMessage, content: lastMessage.content + text };
          return [
            ...currentMessages.slice(0, currentMessages.length - 1),
            updatedLastMessage
          ];
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(currentMessages => [
        ...currentMessages,
        {
          role: "assistant",
          content: "I'm sorry, but I encountered an error. Please try again later.",
        },
      ]);
    }

    setIsLoading(false);
    setMessage("");  // Clear the message input after sending
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(message);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!session) {
    return null;
  }

  return (
    <ThemeProvider theme={customTheme}>
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        bgcolor="background.default"
      >
        <Button variant="outlined" onClick={() => signOut()} style={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            color: "text.secondary", 
            borderColor: "text.secondary" }}>
          Sign out
        </Button>
        <Button variant="contained" onClick={fetchMessages} style={{ 
            position: 'absolute', 
            top: 60, 
            right: 10, 
            color: "text.primary", 
            backgroundColor: "primary.main" }}>
          CHAT HISTORY
        </Button>
        <Stack
          direction={"column"}
          width="80vw"
          height="80vh"
          border="1px solid #FFF3E0"
          p={4}
          spacing={3}
          bgcolor="background.paper"
          borderRadius={4}
        >
          {messages.map((message, index) => (
            <Box key={index} display="flex" flexDirection="column">
              <Box
                display="flex"
                justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
                sx={{ p: 1 }}
              >
                <Avatar src={getAvatarSrc()} sx={{ mr: 2, bgcolor: message.role === "assistant" ? "primary.main" : "secondary.main" }} />
                <Box
                  bgcolor={message.role === "assistant" ? "primary.main" : "secondary.main"}
                  color="text.primary"
                  p={2}
                  sx={{ borderRadius: 2, maxWidth: "75%", wordWrap: "break-word" }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </Box>
                {message.role === "assistant" && (
                  <Stack direction="row" spacing={1} justifyContent="flex-start" mt={1}>
                    <IconButton onClick={() => handleCopy(message.content)} size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={handleRegenerate} size="small">
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Box>
            </Box>
          ))}
          <div ref={messagesEndRef} />
          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Type your message..."
              variant="outlined"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button
              variant="contained"
              onClick={() => sendMessage(message)}
              disabled={isLoading}
              sx={{ bgcolor: "primary.main", color: "text.primary" }}
            >
              {isLoading ? "Sending..." : <ArrowUpwardIcon />}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
