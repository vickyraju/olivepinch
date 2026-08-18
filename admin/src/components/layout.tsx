import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"

function Layout() {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <main className="pl-[240px]">
        <div className="p-6 sm:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export { Layout }
