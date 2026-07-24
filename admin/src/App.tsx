import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { ProtectedRoute } from '@/components/protected-route'
import Login from '@/pages/login'
import Dashboard from '@/pages/dashboard'
import MenuControl from '@/pages/menu-control'
import Zones from '@/pages/zones'
import Customers from '@/pages/customers'
import CustomerDetail from '@/pages/customer-detail'
import Orders from '@/pages/orders'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/menu" element={<MenuControl />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/zones" element={<Zones />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
