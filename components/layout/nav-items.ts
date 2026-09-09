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
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/jobs", label: "Offres", icon: Briefcase },
  { href: "/applications", label: "Candidatures", icon: FolderKanban },
  { href: "/imports", label: "Imports", icon: Import },
  { href: "/extension", label: "Extension", icon: Puzzle },
  { href: "/sources", label: "Sources", icon: Cable },
  { href: "/profile-ai", label: "Profil & CV", icon: Bot },
  { href: "/settings", label: "Compte", icon: Settings },
]
