import { Elysia, t } from "elysia";
import { eq, and } from "drizzle-orm";
import { db, monitors, notificationChannels } from "../db";

export const channelRoutes = new Elysia({ prefix: "/api/monitors" })

  // POST /api/monitors/:id/channels — Add a notification channel
  .post(
    "/:id/channels",
    async ({ params, body, set }) => {
      const monitorId = Number(params.id);

      const [monitor] = await db
        .select()
        .from(monitors)
        .where(eq(monitors.id, monitorId))
        .limit(1);

      if (!monitor) {
        set.status = 404;
        return { error: "Monitor not found" };
      }

      const [channel] = await db
        .insert(notificationChannels)
        .values({
          monitorId,
          type: body.type,
          config: body.config,
          enabled: body.enabled ?? true,
        })
        .returning();

      return channel;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        type: t.Union([
          t.Literal("desktop"),
          t.Literal("email"),
          t.Literal("telegram"),
          t.Literal("slack"),
          t.Literal("discord"),
        ]),
        config: t.Record(t.String(), t.Unknown()),
        enabled: t.Optional(t.Boolean()),
      }),
    }
  )

  // PUT /api/monitors/:id/channels/:cid — Update a channel
  .put(
    "/:id/channels/:cid",
    async ({ params, body, set }) => {
      const monitorId = Number(params.id);
      const channelId = Number(params.cid);

      const [existing] = await db
        .select()
        .from(notificationChannels)
        .where(
          and(
            eq(notificationChannels.id, channelId),
            eq(notificationChannels.monitorId, monitorId)
          )
        )
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Channel not found" };
      }

      const updates: Record<string, unknown> = {};
      if (body.type !== undefined) updates.type = body.type;
      if (body.config !== undefined) updates.config = body.config;
      if (body.enabled !== undefined) updates.enabled = body.enabled;

      const [updated] = await db
        .update(notificationChannels)
        .set(updates)
        .where(eq(notificationChannels.id, channelId))
        .returning();

      return updated;
    },
    {
      params: t.Object({ id: t.String(), cid: t.String() }),
      body: t.Object({
        type: t.Optional(
          t.Union([
            t.Literal("desktop"),
            t.Literal("email"),
            t.Literal("telegram"),
            t.Literal("slack"),
            t.Literal("discord"),
          ])
        ),
        config: t.Optional(t.Record(t.String(), t.Unknown())),
        enabled: t.Optional(t.Boolean()),
      }),
    }
  )

  // DELETE /api/monitors/:id/channels/:cid — Remove a channel
  .delete(
    "/:id/channels/:cid",
    async ({ params, set }) => {
      const monitorId = Number(params.id);
      const channelId = Number(params.cid);

      const [existing] = await db
        .select()
        .from(notificationChannels)
        .where(
          and(
            eq(notificationChannels.id, channelId),
            eq(notificationChannels.monitorId, monitorId)
          )
        )
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { error: "Channel not found" };
      }

      await db
        .delete(notificationChannels)
        .where(eq(notificationChannels.id, channelId));

      return { success: true };
    },
    {
      params: t.Object({ id: t.String(), cid: t.String() }),
    }
  );
