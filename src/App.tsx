import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { HomePage } from "@/pages/HomePage";
import { ChatPage } from "@/pages/ChatPage";
import { ResearchPage } from "@/pages/ResearchPage";
import { CreatePage } from "@/pages/CreatePage";
import { VisionPage } from "@/pages/VisionPage";
import { VoicePage } from "@/pages/VoicePage";
import { FilesPage } from "@/pages/FilesPage";
import { CodingPage } from "@/pages/CodingPage";
import { TutorPage } from "@/pages/TutorPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { AutomationsPage } from "@/pages/AutomationsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { KnowledgePage } from "@/pages/KnowledgePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/create" element={<CreatePage />} />
        <Route path="/vision" element={<VisionPage />} />
        <Route path="/voice" element={<VoicePage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/coding" element={<CodingPage />} />
        <Route path="/tutor" element={<TutorPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/automations" element={<AutomationsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
