import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";

const router: IRouter = Router();
const COOKIE_NAME = "admin_session";

router.post("/admin/login", (req: Request, res: Response): void => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(500).json({ error: "Admin password not configured" });
    return;
  }
  if (password !== adminPassword) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = process.env.SESSION_SECRET;

  // Still set the cookie for browsers that handle cross-site cookies fine
  // (Chrome, Firefox, Edge). Safari's ITP blocks this reliably on
  // cross-subdomain hosts like *.onrender.com, so the token below is the
  // primary auth path — the cookie is just a harmless bonus for others.
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  // Bearer token returned in the body so the frontend can store it
  // (localStorage) and send it as `Authorization: Bearer <token>` on
  // every subsequent request — this bypasses browser cookie policies
  // entirely, fixing Safari on iOS.
  res.json({ success: true, token });
});

router.post("/admin/logout", (req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.SESSION_SECRET;

  // Preferred path: Authorization: Bearer <token> header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    if (bearerToken && bearerToken === expected) {
      next();
      return;
    }
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Fallback path: cookie (works fine on Chrome/Firefox/Edge)
  const cookie = req.cookies?.[COOKIE_NAME];
  if (!cookie || cookie !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export default router;
