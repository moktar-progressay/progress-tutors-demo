import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/parents/")({component: () => <Navigate to="/admin/contacts" search={{tab:"parents"}} replace />});
