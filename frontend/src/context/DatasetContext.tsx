"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { fetchDatasets } from "@/lib/api";
import { DatasetInfo } from "@/lib/types";

interface DatasetContextValue {
  datasets: DatasetInfo[];
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function useDatasetContext() {
  const ctx = useContext(DatasetContext);
  if (!ctx)
    throw new Error("useDatasetContext must be used within DatasetProvider");
  return ctx;
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);

  useEffect(() => {
    fetchDatasets()
      .then(setDatasets)
      .catch(() => setDatasets([]));
  }, []);

  return (
    <DatasetContext.Provider value={{ datasets }}>
      {children}
    </DatasetContext.Provider>
  );
}
