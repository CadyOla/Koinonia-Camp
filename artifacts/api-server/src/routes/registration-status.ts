import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CLOSED_MESSAGE =
  "Registration for Koinonia Camp 2026 is now closed. Already registered? Look up your details under My Registration.";

// Registrations are open unless explicitly set to "false" — so leaving
// this env var unset never accidentally closes registration.
export function registrationsOpen(): boolean {
  return process.env.REGISTRATIONS_OPEN !== "false";
}

export { CLOSED_MESSAGE };

// GET /registration-status — public. The frontend calls this on load to
// decide whether to show the registration form or a "closed" message.
router.get("/registration-status", (_req, res) => {
  const open = registrationsOpen();
  res.json({ open, message: open ? null : CLOSED_MESSAGE });
});

export default router;
