import {
  Bot,
  Briefcase,
  Building2,
  Cable,
  FolderKanban,
  LayoutDashboard,
  Puzzle,
  Search,
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
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/research", label: "Recherche IA", icon: Search },
  { href: "/applications", label: "Candidatures", icon: FolderKanban },
  { href: "/extension", label: "Extension", icon: Puzzle },
  { href: "/sources", label: "Sources", icon: Cable },
  { href: "/profile-ai", label: "Profil & CV", icon: Bot },
  { href: "/settings", label: "Compte", icon: Settings },
]
