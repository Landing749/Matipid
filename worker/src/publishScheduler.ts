import { DurableObject } from 'cloudflare:workers'
import type { Env } from './types'

/**
 * One Durable Object instance per scheduled announcement (keyed by the
 * announcement's id via `idFromName`). Holds exactly one thing: an alarm
 * set for that announcement's `publishAt` timestamp.
 *
 * Why this exists: a rebuild only ever fired from a save action
 * (triggerDeploy() in the manager UI). A scheduled announcement's
 * `publishAt` arriving on its own isn't a save — nothing was there to
 * notice. Rather than poll the database on a timer to catch that moment,
 * each scheduled announcement gets its own alarm fired at exactly the
 * right time, which dispatches the same GitHub Actions rebuild a manual
 * save does.
 *
 * Rescheduling (edit changes publishAt) or cancelling (unpublish, delete,
 * or edited back to draft before it goes live) just overwrites or clears
 * this one alarm — each instance only ever tracks its own announcement,
 * so this is a targeted one-shot timer, not a periodic checker of
 * everything in the database.
 */
export class PublishScheduler extends DurableObject<Env> {
  async schedule(publishAt: number) {
    await this.ctx.storage.setAlarm(publishAt)
    await this.ctx.storage.put('publishAt', publishAt)
  }

  async cancel() {
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.delete('publishAt')
  }

  async alarm() {
    // The alarm only ever fires at the moment scheduled, so by definition
    // the announcement should now be publicly visible — fire the same
    // repository_dispatch a manual triggerDeploy() call uses.
    const dispatch = await fetch(
      `https://api.github.com/repos/${this.env.GITHUB_OWNER}/${this.env.GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'matipid-export-worker',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: 'content-updated' }),
      }
    )

    if (!dispatch.ok) {
      // Durable Object alarms retry automatically (with backoff) when the
      // handler throws, so surface the failure instead of swallowing it —
      // a silent failure here means the post never gets a real preview.
      throw new Error(
        `GitHub dispatch failed from publish alarm: ${dispatch.status} ${await dispatch.text()}`
      )
    }

    await this.ctx.storage.delete('publishAt')
  }
}
