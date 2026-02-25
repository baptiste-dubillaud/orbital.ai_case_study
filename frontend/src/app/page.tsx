import { ChatProvider } from "@/context/ChatContext";
import ChatLayout from "@/components/ChatLayout";

export default function Home() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
