import { ConversationProvider } from "@/context/ConversationContext";
import { DatasetProvider } from "@/context/DatasetContext";
import { ChatProvider } from "@/context/ChatContext";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  return (
    <ConversationProvider>
      <DatasetProvider>
        <ChatProvider>
          <ChatLayout />
        </ChatProvider>
      </DatasetProvider>
    </ConversationProvider>
  );
}
