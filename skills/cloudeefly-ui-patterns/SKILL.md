---
name: cloudeefly-ui-patterns
description: >
  React + Tailwind patterns for the Cloudeefly frontend. Use when creating
  components, pages, or integrating with the Django API. Ensures visual
  consistency and code quality.
---

# Cloudeefly UI Patterns

Use this skill when building React frontend components and pages.

## Project Structure

```
cloudeefy/frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── ui/           # Primitives (Button, Card, Input, Modal)
│   │   ├── app/          # App-specific (AppCard, DeployWizard)
│   │   └── layout/       # Layout (Header, Sidebar, Footer)
│   ├── pages/            # Route pages
│   │   ├── Marketplace.tsx
│   │   ├── AppDetail.tsx
│   │   ├── Deploy.tsx
│   │   ├── Dashboard.tsx
│   │   └── Landing.tsx
│   ├── api/              # API client functions
│   ├── hooks/            # Custom hooks
│   ├── types/            # TypeScript types
│   └── lib/              # Utilities
```

## Component Pattern

```tsx
interface AppCardProps {
  app: AppTemplate;
  onDeploy?: (slug: string) => void;
}

export function AppCard({ app, onDeploy }: AppCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <img src={app.iconUrl} alt="" className="h-10 w-10 rounded" />
        <div>
          <h3 className="font-semibold text-gray-900">{app.name}</h3>
          <span className="text-sm text-gray-500">{app.category}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{app.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          From €{app.plans[0]?.price}/mo
        </span>
        {onDeploy && (
          <button
            onClick={() => onDeploy(app.slug)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Deploy
          </button>
        )}
      </div>
    </div>
  );
}
```

## API Integration Pattern

```tsx
// api/apps.ts
import { api } from "./client";
import type { AppTemplate, Deployment } from "../types";

export const appsApi = {
  list: (category?: string) =>
    api.get<{ results: AppTemplate[] }>("/api/v1/apps/", { params: { category } }),

  get: (slug: string) =>
    api.get<AppTemplate>(`/api/v1/apps/${slug}/`),

  deploy: (slug: string, data: { plan: string; config: Record<string, string> }) =>
    api.post<Deployment>(`/api/v1/apps/${slug}/deploy/`, data),
};

// hooks/useApps.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useApps(category?: string) {
  return useQuery({
    queryKey: ["apps", category],
    queryFn: () => appsApi.list(category),
  });
}

export function useDeploy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: any }) =>
      appsApi.deploy(slug, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deployments"] }),
  });
}
```

## Page Pattern

```tsx
export function MarketplacePage() {
  const [category, setCategory] = useState<string>();
  const { data, isLoading } = useApps(category);
  const navigate = useNavigate();

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Business Apps</h1>

      <CategoryFilter value={category} onChange={setCategory} />

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.results.map((app) => (
          <AppCard
            key={app.slug}
            app={app}
            onDeploy={(slug) => navigate(`/apps/${slug}/deploy`)}
          />
        ))}
      </div>

      {data?.results.length === 0 && (
        <EmptyState message="No apps found in this category" />
      )}
    </div>
  );
}
```

## Design Tokens (Tailwind)

```
Colors:
  Primary:  blue-600 (buttons, links, accents)
  Success:  green-500 (deployed, healthy)
  Warning:  amber-500 (deploying, degraded)
  Error:    red-500 (failed, error)
  Neutral:  gray-* (text, borders, backgrounds)

Spacing:  4, 6, 8, 12, 16, 24 (Tailwind scale)
Radius:   rounded-md (buttons), rounded-lg (cards), rounded-xl (modals)
Shadows:  shadow-sm (cards), shadow-md (hover), shadow-lg (modals)
Font:     Inter (system fallback)
```

## States Every Component Needs

- **Loading**: skeleton or spinner
- **Empty**: message + CTA
- **Error**: message + retry button
- **Success**: confirmation feedback

## Rules

- TypeScript strict — no `any`
- Tailwind only — no inline styles, no CSS modules
- React Query for all server state
- Mobile-responsive (test at 375px width)
- Accessible: semantic HTML, focus management, ARIA labels
- No console.log in committed code
