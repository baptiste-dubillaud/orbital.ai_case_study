import { ConversationProvider } from "@/context/ConversationContext";
import { DatasetProvider } from "@/context/DatasetContext";
import { ChatProvider } from "@/context/ChatContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  return (
    <ThemeProvider>
      <ConversationProvider>
        <DatasetProvider>
          <ChatProvider>
            <ChatLayout />
          </ChatProvider>
        </DatasetProvider>
      </ConversationProvider>
    </ThemeProvider>
  );
}
