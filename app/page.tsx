import { FileManager, FileOperationsProvider } from "@/components/homepage";

export default function HomePage() {
  return (
    <FileOperationsProvider>
      <FileManager />
    </FileOperationsProvider>
  );
}
