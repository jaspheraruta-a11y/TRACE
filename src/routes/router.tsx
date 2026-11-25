import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AccountPage } from '@/pages/account/AccountPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { DocumentsPage } from '@/pages/documents/DocumentsPage'
import { ForbiddenPage } from '@/pages/errors/ForbiddenPage'
import { NotFoundPage } from '@/pages/errors/NotFoundPage'
import { RouteErrorPage } from '@/pages/errors/RouteErrorPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { RequestsPage } from '@/pages/requests/RequestsPage'
import { SearchPage } from '@/pages/search/SearchPage'
import { StudentDetailPage } from '@/pages/students/StudentDetailPage'
import { StudentsPage } from '@/pages/students/StudentsPage'
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
          { path: 'students', element: <StudentsPage /> },
          { path: 'students/:id', element: <StudentDetailPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'requests', element: <RequestsPage /> },
          { path: 'reports', element: <ReportsPage /> },
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
