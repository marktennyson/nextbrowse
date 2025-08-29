import { FileOperationsProvider } from "@/components/homepage";
import MusicPlayerProvider from "@/components/MusicPlayerProvider";
import AppWithMusicPlayer from "@/components/AppWithMusicPlayer";
import { NextPage } from "next";

const HomePage: NextPage = () => {
  return (
    <MusicPlayerProvider>
      <FileOperationsProvider>
        <AppWithMusicPlayer />
      </FileOperationsProvider>
    </MusicPlayerProvider>
  );
};

export default HomePage;
