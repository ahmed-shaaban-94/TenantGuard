// Synthetic case: an admin route with NO role guard anywhere in the file.
// G4 should flag this at high confidence (confirmed) — there is no guard token to suggest
// middleware protection.
import express from "express";

const app = express();

app.get("/admin/users", (req, res) => {
  res.json({ users: [] });
});

export default app;
