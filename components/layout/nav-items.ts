import {
  Bot,
  Briefcase,
  Cable,
  FolderKanban,
  Import,
  LayoutDashboard,
  Puzzle,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  tourId?: string
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, tourId: "nav-dashboard" },
  { href: "/jobs", label: "Offres", icon: Briefcase, tourId: "nav-jobs" },
  { href: "/applications", label: "Candidatures", icon: FolderKanban, tourId: "nav-applications" },
  { href: "/imports", label: "Imports", icon: Import, tourId: "nav-imports" },
  { href: "/extension", label: "Extension", icon: Puzzle, tourId: "nav-extension" },
  { href: "/sources", label: "Sources", icon: Cable, tourId: "nav-sources" },
  { href: "/profile-ai", label: "Mon CV", icon: Bot, tourId: "nav-cv" },
  { href: "/settings", label: "Réglages", icon: Settings, tourId: "nav-settings" },
]
