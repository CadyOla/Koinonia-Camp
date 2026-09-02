import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Registration from './pages/registration';
import AdminDashboard from './pages/admin';
import MyRegistration from './pages/my-registration';
import FoodCollection from './pages/food-collection';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Registration} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/my-registration" component={MyRegistration} />
      <Route path="/food-collection" component={FoodCollection} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
