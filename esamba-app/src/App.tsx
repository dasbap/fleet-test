import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import RouterOutlet from '@/RouterOutlet'

function AppInner() {
  usePushNotifications()
  return <RouterOutlet />
}

export default function App() {
  return <AppInner />
}
