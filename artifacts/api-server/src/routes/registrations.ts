import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import {
  ListRegistrationsQueryParams,
  SubmitRegistrationBody,
  GetRegistrationParams,
  GetRegistrationResponse,
  ListRegistrationsResponse,
  GetRegistrationStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateReferenceNumber(): string {
  const prefix = "KOI26";
  const random = Math.floor(100000 + Math.random() * 900000).toString();
  return `${prefix}-${random}`;
}

function toApiRegistration(row: typeof registrationsTable.$inferSelect) {
  return {
    ...row,
    ministries: row.ministries ? row.ministries.split(",").filter(Boolean) : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /registrations
router.get("/registrations", async (req, res): Promise<void> => {
  const parsed = ListRegistrationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { branch, accommodation, feeding, transport, search } = parsed.data;

  let query = db.select().from(registrationsTable).$dynamic();

  const conditions = [];

  if (branch) {
    conditions.push(eq(registrationsTable.branch, branch));
  }
  if (accommodation) {
    conditions.push(eq(registrationsTable.accommodationPreference, accommodation));
  }
  if (feeding) {
    conditions.push(eq(registrationsTable.feedingPreference, feeding));
  }
  if (transport) {
    conditions.push(eq(registrationsTable.transportPreference, transport));
  }
  if (search) {
    conditions.push(
      or(
        ilike(registrationsTable.fullName, `%${search}%`),
        ilike(registrationsTable.phoneNumber, `%${search}%`),
        ilike(registrationsTable.referenceNumber, `%${search}%`),
      ),
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(registrationsTable.createdAt);
  const result = rows.map(toApiRegistration);
  res.json(ListRegistrationsResponse.parse(result));
});

// POST /registrations — upsert by (fullName, phoneNumber)
router.post("/registrations", async (req, res): Promise<void> => {
  const parsed = SubmitRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid registration body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const ministriesStr = Array.isArray(data.ministries) ? data.ministries.join(",") : "";

  // Check for existing registration by name + phone (case-insensitive)
  const existing = await db
    .select()
    .from(registrationsTable)
    .where(
      and(
        sql`lower(${registrationsTable.fullName}) = lower(${data.fullName})`,
        sql`lower(${registrationsTable.phoneNumber}) = lower(${data.phoneNumber})`,
      ),
    )
    .limit(1);

  let row: typeof registrationsTable.$inferSelect;

  if (existing.length > 0) {
    // Update existing
    const [updated] = await db
      .update(registrationsTable)
      .set({
        email: data.email ?? null,
        gender: data.gender,
        branch: data.branch,
        ministries: ministriesStr,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        accommodationPreference: data.accommodationPreference,
        roomTypePreference: data.roomTypePreference ?? null,
        roommatePreferences: data.roommatePreferences ?? null,
        specialNeeds: data.specialNeeds ?? null,
        feedingPreference: data.feedingPreference,
        transportPreference: data.transportPreference,
        updatedAt: new Date(),
      })
      .where(eq(registrationsTable.id, existing[0].id))
      .returning();
    row = updated;
  } else {
    // Create new
    const referenceNumber = generateReferenceNumber();
    const [inserted] = await db
      .insert(registrationsTable)
      .values({
        referenceNumber,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        email: data.email ?? null,
        gender: data.gender,
        branch: data.branch,
        ministries: ministriesStr,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        accommodationPreference: data.accommodationPreference,
        roomTypePreference: data.roomTypePreference ?? null,
        roommatePreferences: data.roommatePreferences ?? null,
        specialNeeds: data.specialNeeds ?? null,
        feedingPreference: data.feedingPreference,
        transportPreference: data.transportPreference,
      })
      .returning();
    row = inserted;
  }

  req.log.info({ referenceNumber: row.referenceNumber }, "Registration submitted");
  res.json(GetRegistrationResponse.parse(toApiRegistration(row)));
});

// GET /registrations/stats — must come BEFORE /registrations/:id
router.get("/registrations/stats", async (req, res): Promise<void> => {
  const rows = await db.select().from(registrationsTable);

  const total = rows.length;
  const resident = rows.filter((r) => r.accommodationPreference === "Resident").length;
  const nonResident = rows.filter((r) => r.accommodationPreference === "Non-Resident").length;
  const churchFeeding = rows.filter((r) => r.feedingPreference === "Church Feeding").length;
  const selfFeeding = rows.filter((r) => r.feedingPreference === "Self Feeding").length;
  const churchBus = rows.filter((r) => r.transportPreference === "Church Bus").length;
  const selfTransport = rows.filter((r) => r.transportPreference === "Self Transport").length;

  // Branch breakdown
  const branchMap = new Map<string, number>();
  for (const r of rows) {
    branchMap.set(r.branch, (branchMap.get(r.branch) ?? 0) + 1);
  }
  const byBranch = Array.from(branchMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Ministry breakdown
  const ministryMap = new Map<string, number>();
  for (const r of rows) {
    const minis = r.ministries ? r.ministries.split(",").filter(Boolean) : [];
    for (const m of minis) {
      ministryMap.set(m, (ministryMap.get(m) ?? 0) + 1);
    }
  }
  const byMinistry = Array.from(ministryMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const stats = {
    total,
    resident,
    nonResident,
    churchFeeding,
    selfFeeding,
    churchBus,
    selfTransport,
    byBranch,
    byMinistry,
  };

  res.json(GetRegistrationStatsResponse.parse(stats));
});

// GET /registrations/:id
router.get("/registrations/:id", async (req, res): Promise<void> => {
  const params = GetRegistrationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  res.json(GetRegistrationResponse.parse(toApiRegistration(row)));
});

export default router;
