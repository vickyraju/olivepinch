import { Outlet } from "react-router-dom"
import { Sidebar } from "./sidebar"

export function Layout() {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Outlet />
    </div>
  )
}
