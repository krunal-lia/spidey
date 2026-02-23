import { Elysia, t } from "elysia";
import { eq, desc, sql } from "drizzle-orm";
import { db, monitors, notificationChannels, checkLogs } from "../db";
import {
  startMonitor,
  stopMonitor,
  restartMonitor,
  runCheck,
} from "../scheduler";

export const monitorRoutes = new Elysia({ prefix: "/api/monitors" })

  // GET /api/monitors — List all monitors (with channels)
  .get("/", async () => {
    const allMonitors = await db.select().from(monitors).orderBy(desc(monitors.createdAt));

    // Attach channels to each monitor
    const result = await Promise.all(
      allMonitors.map(async (monitor) => {
        const channels = await db
          .select()
          .from(notificationChannels)
          .where(eq(notificationChannels.monitorId, monitor.id));
        return { ...monitor, channels };
      })
    );

    return result;
  })

  // POST /api/monitors — Create a monitor
  .post(
    "/",
    async ({ body }) => {
      const [monitor] = await db
        .insert(monitors)
        .values({
          name: body.name,
          url: body.url,
          intervalMinutes: body.intervalMinutes ?? 5,
          keywords: body.keywords ?? null,
          checkMode: body.checkMode ?? "change",
        })
        .returning();

      // Start the scheduler if active
      if (monitor.isActive) {
        startMonitor(monitor.id, monitor.intervalMinutes);
      }

      return monitor;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        url: t.String({ minLength: 1 }),
        intervalMinutes: t.Optional(t.Number({ minimum: 1 })),
        keywords: t.Optional(t.String()),
        checkMode: t.Optional(
          t.Union([
            t.Literal("change"),
            t.Literal("keyword"),
            t.Literal("both"),
          ])
        ),
      }),
    }
  )

  // GET /api/monitors/:id — Get a single monitor with channels
  .get(
    "/:id",
    async ({ params, set }) => {
      const [monitor] = await db
        .select()
        .from(monitors)
        .where(eq(monitors.id, Number(params.id)))
        .limit(1);

      if (!monitor) {
        set.status = 404;
        return { error: "Monitor not found" };
      }

      const channels = await db
        .select()
        .from(notificationChannels)
        .where(eq(notificationChannels.monitorId, monitor.id));

      return { ...monitor, channels };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // PUT /api/monitors/:id — Update a monitor
  .put(
    "/:id",
    async ({ params, body, set }) => {
      const id = Number(params.id);

      const [existing] = await db
        .select()
        .from(monitors)
        .where(eq(monitors.id, id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Monitor not found" };
      }

      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.url !== undefined) updates.url = body.url;
      if (body.intervalMinutes !== undefined)
        updates.intervalMinutes = body.intervalMinutes;
      if (body.keywords !== undefined) updates.keywords = body.keywords;
      if (body.checkMode !== undefined) updates.checkMode = body.checkMode;
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      const [updated] = await db
        .update(monitors)
        .set(updates)
        .where(eq(monitors.id, id))
        .returning();

      // Handle scheduler changes
      if (body.isActive === false) {
        stopMonitor(id);
      } else if (body.isActive === true || body.intervalMinutes !== undefined) {
        if (updated.isActive) {
          restartMonitor(id, updated.intervalMinutes);
        }
      }

      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        url: t.Optional(t.String({ minLength: 1 })),
        intervalMinutes: t.Optional(t.Number({ minimum: 1 })),
        keywords: t.Optional(t.String()),
        checkMode: t.Optional(
          t.Union([
            t.Literal("change"),
            t.Literal("keyword"),
            t.Literal("both"),
          ])
        ),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  // DELETE /api/monitors/:id — Delete a monitor
  .delete(
    "/:id",
    async ({ params, set }) => {
      const id = Number(params.id);

      const [existing] = await db
        .select()
        .from(monitors)
        .where(eq(monitors.id, id))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Monitor not found" };
      }

      stopMonitor(id);
      await db.delete(monitors).where(eq(monitors.id, id));

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // POST /api/monitors/:id/trigger — Manually trigger a check
  .post(
    "/:id/trigger",
    async ({ params, set }) => {
      const id = Number(params.id);

      const [monitor] = await db
        .select()
        .from(monitors)
        .where(eq(monitors.id, id))
        .limit(1);

      if (!monitor) {
        set.status = 404;
        return { error: "Monitor not found" };
      }

      // Run check in background, return immediately
      runCheck(id).catch((err) => {
        console.error(`Manual check failed for monitor ${id}:`, err);
      });

      return { message: "Check triggered" };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // GET /api/monitors/:id/logs — Paginated check history
  .get(
    "/:id/logs",
    async ({ params, query, set }) => {
      const id = Number(params.id);
      const page = Number(query.page ?? 1);
      const pageSize = Number(query.pageSize ?? 20);

      const [monitor] = await db
        .select()
        .from(monitors)
        .where(eq(monitors.id, id))
        .limit(1);

      if (!monitor) {
        set.status = 404;
        return { error: "Monitor not found" };
      }

      const offset = (page - 1) * pageSize;

      const [logs, countResult] = await Promise.all([
        db
          .select()
          .from(checkLogs)
          .where(eq(checkLogs.monitorId, id))
          .orderBy(desc(checkLogs.checkedAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(checkLogs)
          .where(eq(checkLogs.monitorId, id)),
      ]);

      return {
        logs,
        total: Number(countResult[0].count),
        page,
        pageSize,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    }
  );
