import { Routes, Route } from 'react-router-dom'
import MarketingLayout from '@/pages/marketing/layout'
import Home from '@/pages/marketing/home'
import About from '@/pages/marketing/about'
import DietPlans from '@/pages/marketing/diet-plans'
import Contact from '@/pages/marketing/contact'
import SubscribeLayout from '@/pages/subscribe/layout'
import Postcode from '@/pages/subscribe/postcode'
import Plan from '@/pages/subscribe/plan'
import SubscribeProfile from '@/pages/subscribe/profile'
import Goal from '@/pages/subscribe/goal'
import Preferences from '@/pages/subscribe/preferences'
import Meals from '@/pages/subscribe/meals'
import Menu from '@/pages/subscribe/menu'
import Payment from '@/pages/subscribe/payment'
import Account from '@/pages/subscribe/account'
import DashboardLayout from '@/pages/dashboard/layout'
import DashboardProfile from '@/pages/dashboard/profile'
import DashboardHealth from '@/pages/dashboard/health'
import DashboardDelivery from '@/pages/dashboard/delivery'
import DashboardSubscription from '@/pages/dashboard/subscription'

function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/diet-plans" element={<DietPlans />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route path="/subscribe" element={<SubscribeLayout />}>
        <Route index element={<Postcode />} />
        <Route path="plan" element={<Plan />} />
        <Route path="profile" element={<SubscribeProfile />} />
        <Route path="goal" element={<Goal />} />
        <Route path="preferences" element={<Preferences />} />
        <Route path="meals" element={<Meals />} />
        <Route path="menu" element={<Menu />} />
        <Route path="payment" element={<Payment />} />
        <Route path="account" element={<Account />} />
      </Route>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardProfile />} />
        <Route path="health" element={<DashboardHealth />} />
        <Route path="delivery" element={<DashboardDelivery />} />
        <Route path="subscription" element={<DashboardSubscription />} />
      </Route>
    </Routes>
  )
}

export default App
