import { useAuth } from "@/lib/auth"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}

export function Header({ title }: { title: string }) {
  const { admin } = useAuth()

  return (
    <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-gray-200 flex justify-between items-center px-[32px] shrink-0 z-40 sticky top-0">
      <div className="flex items-center gap-4">
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
            {admin ? getInitials(admin.name) : ""}
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-semibold text-gray-900">{admin?.name}</p>
            <p className="text-gray-500 text-xs">Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
