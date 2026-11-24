import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AccountPage } from '@/pages/account/AccountPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { RouteErrorPage } from '@/pages/errors/RouteErrorPage'
import { ModuleStatusPage } from '@/pages/modules/ModuleStatusPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RequireRole } from '@/routes/RequireRole'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          {
            path: 'students',
            element: <ModuleStatusPage moduleId="students" />,
          },
          { path: 'search', element: <ModuleStatusPage moduleId="search" /> },
          {
            path: 'documents',
            element: <ModuleStatusPage moduleId="documents" />,
          },
          {
            path: 'inventory',
            element: <ModuleStatusPage moduleId="inventory" />,
          },
          {
            path: 'requests',
            element: <ModuleStatusPage moduleId="requests" />,
          },
          { path: 'reports', element: <ModuleStatusPage moduleId="reports" /> },
          { path: 'account', element: <AccountPage /> },
          {
            path: 'admin',
            element: <RequireRole roles={['administrator']} />,
            children: [
              { index: true, element: <Navigate to="/admin/users" replace /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'audit', element: <AuditPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
