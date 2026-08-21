import type { IconName } from "@/components/icons/Icon";

export type CapabilityStatus = "available" | "soon";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  status: CapabilityStatus;
}

/**
 * Application shell navigation. Future modules are declared here with
 * status "soon" so the shell can present them as planned-but-not-fake.
 * When a module ships, flip its status to "available".
 */
export const primaryNav: NavItem[] = [
  { id: "home", label: "Home", href: "/", icon: "home", status: "available" },
  { id: "chat", label: "Chat", href: "/chat", icon: "spark", status: "soon" },
  { id: "research", label: "Research", href: "/research", icon: "search", status: "soon" },
  { id: "create", label: "Create", href: "/create", icon: "image", status: "soon" },
  { id: "vision", label: "Vision", href: "/vision", icon: "eye", status: "soon" },
  { id: "voice", label: "Voice", href: "/voice", icon: "mic", status: "soon" },
  { id: "assets", label: "Asset Vault", href: "/assets", icon: "folder", status: "available" },
  { id: "coding", label: "Coding", href: "/coding", icon: "code", status: "soon" },
  { id: "tutor", label: "Tutor", href: "/tutor", icon: "book", status: "soon" },
  { id: "agents", label: "Agents", href: "/agents", icon: "robot", status: "soon" },
  { id: "automations", label: "Automations", href: "/automations", icon: "bolt", status: "soon" },
  { id: "projects", label: "Projects", href: "/projects", icon: "layers", status: "soon" },
  { id: "knowledge", label: "Knowledge", href: "/knowledge", icon: "knowledge", status: "soon" },
  { id: "settings", label: "Settings", href: "/settings", icon: "settings", status: "available" },
];

export interface CapabilityGroup {
  id: string;
  title: string;
  caption: string;
  icon: IconName;
  items: Array<{ id: string; label: string; status: CapabilityStatus; icon: IconName }>;
}

export const capabilityGroups: CapabilityGroup[] = [
  {
    id: "intelligence",
    title: "Intelligence",
    caption: "Reason, search, and orchestrate.",
    icon: "brain",
    items: [
      { id: "chat", label: "Chat", status: "soon", icon: "spark" },
      { id: "reasoning", label: "Reasoning", status: "soon", icon: "brain" },
      { id: "research", label: "Research", status: "soon", icon: "search" },
      { id: "agents", label: "Agents", status: "soon", icon: "robot" },
    ],
  },
  {
    id: "create",
    title: "Create",
    caption: "Generate across modalities.",
    icon: "image",
    items: [
      { id: "image-gen", label: "Image", status: "soon", icon: "image" },
      { id: "video-gen", label: "Video", status: "soon", icon: "film" },
      { id: "audio-gen", label: "Audio", status: "soon", icon: "mic" },
      { id: "documents", label: "Documents", status: "soon", icon: "file" },
    ],
  },
  {
    id: "understand",
    title: "Understand",
    caption: "Make sense of anything you give it.",
    icon: "eye",
    items: [
      { id: "files", label: "Files", status: "soon", icon: "file" },
      { id: "vision", label: "Vision", status: "soon", icon: "eye" },
      { id: "video-analysis", label: "Video Analysis", status: "soon", icon: "film" },
      { id: "knowledge", label: "Knowledge", status: "soon", icon: "knowledge" },
    ],
  },
  {
    id: "build",
    title: "Build",
    caption: "Code, ship, and automate.",
    icon: "hammer",
    items: [
      { id: "coding", label: "Coding", status: "soon", icon: "code" },
      { id: "projects", label: "Projects", status: "soon", icon: "layers" },
      { id: "automation", label: "Automation", status: "soon", icon: "bolt" },
    ],
  },
  {
    id: "learn",
    title: "Learn",
    caption: "A private tutor that knows you.",
    icon: "book",
    items: [
      { id: "tutor", label: "Tutor", status: "soon", icon: "book" },
      { id: "courses", label: "Courses", status: "soon", icon: "layers" },
      { id: "practice", label: "Practice", status: "soon", icon: "check" },
    ],
  },
];

export interface QuickAction {
  id: string;
  label: string;
  icon: IconName;
  hint: string;
  status: CapabilityStatus;
}

export const quickActions: QuickAction[] = [
  { id: "ask", label: "Ask anything", icon: "spark", hint: "Start a conversation", status: "soon" },
  { id: "research", label: "Research", icon: "search", hint: "Deep-dive a topic", status: "soon" },
  { id: "analyze-file", label: "Analyze a file", icon: "file", hint: "Upload to understand", status: "soon" },
  { id: "analyze-image", label: "Analyze an image", icon: "image", hint: "Vision understanding", status: "soon" },
  { id: "analyze-video", label: "Analyze a video", icon: "film", hint: "Video understanding", status: "soon" },
  { id: "create-image", label: "Create an image", icon: "image", hint: "Generate visuals", status: "soon" },
  { id: "create-video", label: "Create a video", icon: "film", hint: "Generate motion", status: "soon" },
  { id: "write-code", label: "Write code", icon: "code", hint: "Build and run", status: "soon" },
  { id: "learn", label: "Learn something", icon: "book", hint: "A guided lesson", status: "soon" },
  { id: "build", label: "Build something", icon: "hammer", hint: "A new project", status: "soon" },
  { id: "run-agent", label: "Run an agent", icon: "robot", hint: "Autonomous task", status: "soon" },
  { id: "automate", label: "Automate a task", icon: "bolt", hint: "Set it, forget it", status: "soon" },
];
