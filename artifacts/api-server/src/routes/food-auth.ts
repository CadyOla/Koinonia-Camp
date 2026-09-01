import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";

const router: IRouter = Router();

// Deliberately separate from admin auth (admin-auth.ts): food-table
// volunteers get a narrow, low-stakes tool for checking off meals, not
// full admin power (SMS sends, HQ sync, exports). FOOD_ACCESS_PASSCODE is
// the short code volunteers type in; FOOD_SESSION_SECRET is a longer,
// separate value issued as the bearer token — mirrors the admin pattern
// (password vs. SESSION_SECRET) at a lighter weight.
router.post("/food/login", (req: Request, res: Response): void => {
  const { passcode } = req.body;
  const expectedPasscode = process.env.FOOD_ACCESS_PASSCODE;
  const token = process.env.FOOD_SESSION_SECRET;

  if (!expectedPasscode || !token) {
    res.status(500).json({ error: "Food access is not configured" });
    return;
  }
  if (passcode !== expectedPasscode) {
    res.status(401).json({ error: "Incorrect passcode" });
    return;
  }

  res.json({ success: true, token });
});

export function requireFoodAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.FOOD_SESSION_SECRET;
  const authHeader = req.headers.authorization;

  if (!expected || !authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export default router;
