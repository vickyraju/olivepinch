import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout'
import { ProtectedRoute } from '@/components/protected-route'
import Login from '@/pages/login'
import Dashboard from '@/pages/dashboard'
import MenuControl from '@/pages/menu-control'
import MenuWeeks from '@/pages/menu-weeks'
import Plans from '@/pages/plans'
import Zones from '@/pages/zones'
import PromoCodes from '@/pages/promo-codes'
import Customers from '@/pages/customers'
import CustomerDetail from '@/pages/customer-detail'
import Orders from '@/pages/orders'
import Admins from '@/pages/admins'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<MenuControl />} />
            <Route path="/menu-weeks" element={<MenuWeeks />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/promo-codes" element={<PromoCodes />} />
            <Route path="/admins" element={<Admins />} />
          </Route>
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}

export default App
