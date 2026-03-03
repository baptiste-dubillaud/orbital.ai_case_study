"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import { ConversationProvider } from "@/context/ConversationContext";
import { DatasetProvider } from "@/context/DatasetContext";
import { ChatProvider } from "@/context/ChatContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConversationProvider>
        <DatasetProvider>
          <ChatProvider>{children}</ChatProvider>
        </DatasetProvider>
      </ConversationProvider>
    </ThemeProvider>
  );
}
