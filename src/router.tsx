import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter as createTanStackRouter,
} from '@tanstack/react-router'
import { createHashHistory } from '@tanstack/history'
import PythoniaApp from './App'

const rootRoute = createRootRoute({
  component: Outlet,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PythoniaApp,
})

const routeTree = rootRoute.addChildren([indexRoute])

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    history: createHashHistory(),
    scrollRestoration: true,
  })
}

export async function getRouter() {
  return createRouter()
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
