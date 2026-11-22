import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatWhen } from "@/lib/format";
import type { StoryCard } from "@/lib/public-data";

/* Story blocks for the Broadsheet pages. All are server components. */

export function Kicker({ story }: { story: StoryCard }) {
  if (!story.conflict && !story.topic) return null;
  return (
    <p className="kicker flex flex-wrap gap-x-2">
      {story.conflict && (
        <Link href={`/conflicts/${story.conflict.slug}`} className="no-underline hover:underline">
          {story.conflict.name}
        </Link>
      )}
      {story.conflict && story.topic && <span aria-hidden>·</span>}
      {story.topic && (
        <Link href={`/topics/${story.topic.slug}`} className="text-muted no-underline hover:underline">
          {story.topic.name}
        </Link>
      )}
    </p>
  );
}

async function When({ iso, now }: { iso: string; now: number }) {
  const format = await getFormatter();
  return <time dateTime={iso}>{formatWhen(format, iso, now)}</time>;
}

/** The front-page lead: biggest headline on the page. */
export async function LeadStory({ story, now }: { story: StoryCard; now: number }) {
  const t = await getTranslations("Story");
  return (
    <article>
      <Kicker story={story} />
      <h2 className="mt-2 text-[clamp(1.9rem,3.8vw,2.9rem)] leading-[1.08] font-bold">
        <Link href={`/stories/${story.slug}`} className="headline-link">
          {story.title}
        </Link>
      </h2>
      {story.summary && <p className="mt-3 text-[1.25rem] leading-snug text-ink-2">{story.summary}</p>}
      <p className="meta mt-3">
        {t("desk")} · <When iso={story.publishedAt} now={now} />
      </p>
    </article>
  );
}

/** Compact list with times, for the "Latest" column. */
export function LatestList({ stories, now }: { stories: StoryCard[]; now: number }) {
  return (
    <ol>
      {stories.map((s) => (
        <li key={s.slug} className="border-b border-rule py-3 last:border-0">
          <p className="meta mb-1 font-semibold">
            <When iso={s.publishedAt} now={now} />
          </p>
          <Link href={`/stories/${s.slug}`} className="headline-link text-[1.1rem] leading-snug font-medium">
            {s.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Three-column grid of headlines with summaries. */
export function StoryGrid({ stories, now }: { stories: StoryCard[]; now: number }) {
  return (
    <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((s) => (
        <article key={s.slug} className="border-t border-rule py-4">
          <Kicker story={s} />
          <h3 className="mt-1.5 text-[1.3rem] leading-tight font-bold">
            <Link href={`/stories/${s.slug}`} className="headline-link">
              {s.title}
            </Link>
          </h3>
          {s.summary && <p className="mt-2 text-[1rem] text-ink-2">{s.summary}</p>}
          <p className="meta mt-2">
            <When iso={s.publishedAt} now={now} />
          </p>
        </article>
      ))}
    </div>
  );
}

/** One story per row, for conflict, topic and search pages. */
export function StoryRows({ stories, now }: { stories: StoryCard[]; now: number }) {
  return (
    <ol>
      {stories.map((s) => (
        <li key={s.slug} className="grid gap-x-8 border-b border-rule py-5 sm:grid-cols-[9rem_1fr]">
          <p className="meta pt-1 font-semibold">
            <When iso={s.publishedAt} now={now} />
          </p>
          <article>
            <Kicker story={s} />
            <h2 className="mt-1 text-[1.45rem] leading-tight font-bold">
              <Link href={`/stories/${s.slug}`} className="headline-link">
                {s.title}
              </Link>
            </h2>
            {s.summary && <p className="mt-2 max-w-[68ch] text-ink-2">{s.summary}</p>}
          </article>
        </li>
      ))}
    </ol>
  );
}

/** Grey placeholder lines shown while stories load. */
export function LinesSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-b border-rule py-4">
          <div className="h-3 w-24 bg-paper-2" />
          <div className="mt-3 h-5 w-11/12 bg-paper-2" />
          <div className="mt-2 h-5 w-2/3 bg-paper-2" />
        </div>
      ))}
    </div>
  );
}
