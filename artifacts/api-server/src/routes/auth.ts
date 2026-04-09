import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PORTAL_USERNAME = process.env.PORTAL_USERNAME ?? "admin";
const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD ?? "AutoFlotta2025";

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Credenziali mancanti" });
    return;
  }

  if (username !== PORTAL_USERNAME || password !== PORTAL_PASSWORD) {
    res.status(401).json({ error: "Credenziali non valide" });
    return;
  }

  req.session.authenticated = true;
  req.session.username = username;

  res.json({ ok: true, username });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.authenticated) {
    res.status(401).json({ error: "Non autenticato" });
    return;
  }
  res.json({ username: req.session.username });
});

export default router;
