import { FileManager, FileOperationsProvider } from "@/components/homepage";
import { NextPage } from "next";

const HomePage: NextPage = () => {
  return (
    <FileOperationsProvider>
      <FileManager />
    </FileOperationsProvider>
  );
};

export default HomePage;
