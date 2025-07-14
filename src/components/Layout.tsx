import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Dumbbell, BarChart3, History, Settings, LogOut, Home, Target } from 'lucide-react';
export default function Layout() {
  const {
    signOut,
    user
  } = useAuth();
  const location = useLocation();
  const navigation = [{
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home
  }, {
    name: 'Workouts',
    href: '/workouts',
    icon: Target
  }, {
    name: 'Exercises',
    href: '/exercises',
    icon: Dumbbell
  }, {
    name: 'Stats',
    href: '/stats',
    icon: BarChart3
  }, {
    name: 'History',
    href: '/history',
    icon: History
  }];
  const handleSignOut = async () => {
    await signOut();
  };
  return <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-8 w-8 text-green-600" />
                <span className="text-xl font-bold text-gray-900">Workout Logger</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map(item => {
                const Icon = item.icon;
                return <Link key={item.name} to={item.href} className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname === item.href ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>;
              })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 max-lg:hidden ">
                Welcome, {user?.user_metadata?.name || user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile navigation */}
      <div className="sm:hidden">
        <div className="bg-white shadow-sm">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map(item => {
            const Icon = item.icon;
            return <Link key={item.name} to={item.href} className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === item.href ? 'bg-green-50 border-l-4 border-green-500 text-green-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  <Icon className="h-4 w-4 inline mr-2" />
                  {item.name}
                </Link>;
          })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>;
}