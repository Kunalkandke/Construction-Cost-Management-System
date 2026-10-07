import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { GuestOnly, RequireAuth, RequireRole } from './components/layout/Guards';
import { PageSkeleton } from './components/ui/Feedback';

// Admin and chart-heavy pages are lazy-loaded (route-level code splitting)
const L = (f) => lazy(f);
const Landing = L(() => import('./pages/public/Landing'));
const HowItWorks = L(() => import('./pages/public/HowItWorks'));
const EstimateWizard = L(() => import('./pages/public/EstimateWizard'));
const EstimateResult = L(() => import('./pages/public/EstimateResult'));
const BudgetPlanner = L(() => import('./pages/public/BudgetPlanner'));
const Content = (name) => L(() => import('./pages/public/ContentPages').then((m) => ({ default: m[name] })));
const Faq = Content('FaqPage'); const Contact = Content('ContactPage'); const Terms = Content('TermsPage'); const Privacy = Content('PrivacyPage'); const Disclaimer = Content('DisclaimerPage');
const Auth = (name) => L(() => import('./pages/public/AuthPages').then((m) => ({ default: m[name] })));
const Login = Auth('LoginPage'); const Register = Auth('RegisterPage'); const Forgot = Auth('ForgotPage'); const Reset = Auth('ResetPage');
const Misc = (name) => L(() => import('./pages/public/MiscPages').then((m) => ({ default: m[name] })));
const Shared = Misc('SharedEstimatePage'); const NotFound = Misc('NotFoundPage');

const Dashboard = L(() => import('./pages/user/Dashboard'));
const Estimates = L(() => import('./pages/user/Estimates'));
const EstimateDetail = L(() => import('./pages/user/EstimateDetail'));
const Compare = L(() => import('./pages/user/Compare'));
const Profile = L(() => import('./pages/user/Profile'));

const AdminDashboard = L(() => import('./pages/admin/Dashboard'));
const AdminUsers = L(() => import('./pages/admin/Users'));
const AdminEst = (name) => L(() => import('./pages/admin/Estimates').then((m) => ({ default: m[name] })));
const AdminEstimates = AdminEst('AdminEstimates'); const AdminEstimateDetail = AdminEst('AdminEstimateDetail');
const AdminRate = (name) => L(() => import('./pages/admin/Rates').then((m) => ({ default: m[name] })));
const RateSets = AdminRate('RateSets'); const RateDetail = AdminRate('RateDetail');
const MasterData = L(() => import('./pages/admin/MasterData'));
const AiAdmin = L(() => import('./pages/admin/AiAdmin'));
const Actuals = L(() => import('./pages/admin/Actuals'));
const AdminContent = L(() => import('./pages/admin/Content'));
const Audit = L(() => import('./pages/admin/Audit'));
const Settings = L(() => import('./pages/admin/Settings'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/estimate" element={<EstimateWizard />} />
          <Route path="/estimate/result" element={<EstimateResult />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/budget-planner" element={<BudgetPlanner />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/shared/:token" element={<Shared />} />
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<Forgot />} />
            <Route path="/reset-password/:token" element={<Reset />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/estimates/:id" element={<EstimateDetail />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['admin', 'super_admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/estimates" element={<AdminEstimates />} />
            <Route path="/admin/estimates/:id" element={<AdminEstimateDetail />} />
            <Route path="/admin/rates" element={<RateSets />} />
            <Route path="/admin/rates/:id" element={<RateDetail />} />
            <Route path="/admin/norms" element={<MasterData initial="norms" />} />
            <Route path="/admin/master-data" element={<MasterData initial="bhk" />} />
            <Route path="/admin/ai" element={<AiAdmin />} />
            <Route path="/admin/actuals" element={<Actuals />} />
            <Route path="/admin/content" element={<AdminContent />} />
            <Route path="/admin/audit" element={<Audit />} />
          </Route>
        </Route>
        <Route element={<RequireRole roles={['super_admin']} />}>
          <Route element={<AdminLayout />}><Route path="/admin/settings" element={<Settings />} /></Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
