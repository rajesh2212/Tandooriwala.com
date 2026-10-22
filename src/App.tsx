import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AccountProvider } from './lib/account'
import { Layout } from './components/Layout'
import { About } from './pages/About'
import { Account } from './pages/Account'
import { Book } from './pages/Book'
import { Contact } from './pages/Contact'
import { Home } from './pages/Home'
import { Menu } from './pages/Menu'
import { Profile } from './pages/Profile'
import { Ticket } from './pages/Ticket'
import { Visit } from './pages/Visit'

export function App() {
  return (
    <AccountProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/book" element={<Book />} />
            <Route path="/account" element={<Account />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ticket/:ref" element={<Ticket />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AccountProvider>
  )
}
