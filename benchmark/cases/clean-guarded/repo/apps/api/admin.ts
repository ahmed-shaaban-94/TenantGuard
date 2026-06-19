// Synthetic clean case: every route carries an inline auth/role guard on its own line.
// G4 must fire nothing — this measures precision (a false positive here would lower it).
import express from "express";
import { requireRole, requireAuth } from "./middleware";

const app = express();

app.get("/admin/users", requireRole("admin"), (req, res) => {
  res.json({ users: [] });
});

app.get("/profile", requireAuth, (req, res) => {
  res.json({ ok: true });
});

export default app;
