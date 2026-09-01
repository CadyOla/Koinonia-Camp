import { Router, type IRouter } from "express";
import adminHqSyncRouter from "./admin-hq-sync";
import cronHqSyncRouter from "./cron-hq-sync";
import healthRouter from "./health";
import registrationsRouter from "./registrations";
import adminAuthRouter from "./admin-auth";
import lookupRouter from "./lookup";
import adminRoomInviteSmsRouter from "./admin-room-invite-sms";
import adminPaymentReminderSmsRouter from "./admin-payment-reminder-sms";
import adminSmsBackfillRouter from "./admin-sms-backfill";
import mealSelectionRouter from "./meal-selection";
import foodAuthRouter from "./food-auth";
import foodCollectionRouter from "./food-collection";

const router: IRouter = Router();

router.use(adminHqSyncRouter);
router.use(cronHqSyncRouter);
router.use(healthRouter);
router.use(registrationsRouter);
router.use(adminAuthRouter);
router.use(lookupRouter);
router.use(adminRoomInviteSmsRouter);
router.use(adminPaymentReminderSmsRouter);
router.use(adminSmsBackfillRouter);
router.use(mealSelectionRouter);
router.use(foodAuthRouter);
router.use(foodCollectionRouter);

export default router;
