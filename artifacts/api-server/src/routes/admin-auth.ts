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

  res.cookie(COOKIE_NAME, process.env.SESSION_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  res.json({ success: true });
});

router.post("/admin/logout", (req: Request, res: Response): void => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (!cookie || cookie !== process.env.SESSION_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export default router;