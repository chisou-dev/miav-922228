import { SiteShell } from "@/components/SiteShell";
import { HomeSidebar } from "@/components/home/HomeSidebar";

const sections = [
  {
    id: "about",
    title: "About MIAV-922228",
    body: "MIAV-922228 is a literary science fiction project that examines the quiet territories where artificial intelligence, memory, and feeling meet. Through speculative narrative, it asks what remains of the human when recollection itself becomes mutable.",
    linkHref: "/about",
    linkLabel: "Read more",
  },
  {
    id: "chapters",
    title: "Chapters",
    body: "The work unfolds as a sequence of chapters—episodes of thought, encounter, and erasure. Each chapter is a room in a larger architecture of story.",
    linkHref: "/chapters",
    linkLabel: "Browse chapters",
  },
  {
    id: "books",
    title: "Books",
    body: "Published volumes and forthcoming editions gather the project into lasting form. Digital and print records are kept here as they appear.",
    linkHref: "/books",
    linkLabel: "Book archive",
  },
  {
    id: "author",
    title: "Author",
    body: "Takashi Yabe is a literary SF writer and the creator of MIAV-922228. His work explores the relationship between technology and human existence—memory, emotion, identity, and the quiet changes of everyday life.",
    linkHref: "/author",
    linkLabel: "Author profile",
  },
  {
    id: "contact",
    title: "Contact",
    body: "For inquiries regarding the project, publications, or press, please get in touch.",
    linkHref: "/contact",
    linkLabel: "Write a message",
  },
] as const;

export default function Home() {
  return (
    <div className="home-with-sidebar">
      <HomeSidebar />
      <div className="home-main">
        <div className="px-5 pt-6 lg:hidden">
          <a
            href="/world-map"
            className="inline-flex items-center gap-2 text-[0.78rem] tracking-[0.1em] text-[var(--foreground-muted)]"
          >
            <span aria-hidden>🌍</span>
            MIAV World Map
          </a>
        </div>
        <SiteShell>
          <main>
            <section
              aria-label="Introduction"
              className="flex min-h-[calc(100vh-8rem)] flex-col justify-center py-24 sm:py-32"
            >
              <h1 className="text-[clamp(2.4rem,7vw,4.25rem)] font-medium leading-[1.15] tracking-[0.04em] text-[var(--foreground)]">
                MIAV-922228
              </h1>
              <p className="mt-10 max-w-xl text-[1.05rem] leading-relaxed tracking-[0.02em] text-[var(--foreground-muted)] sm:text-lg sm:leading-8">
                A Literary SF Project by Takashi Yabe
              </p>
              <p className="mt-16 max-w-md text-[0.95rem] leading-[1.9] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-20 sm:text-base sm:leading-[2]">
                A speculative fiction project exploring AI, memory, emotion, and
                human existence.
              </p>
            </section>

            <div className="pb-32 sm:pb-40">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 border-t border-[var(--line)] py-24 sm:py-32"
                >
                  <h2 className="text-2xl font-medium tracking-[0.06em] text-[var(--foreground)] sm:text-[1.65rem]">
                    {section.title}
                  </h2>
                  <p className="mt-10 max-w-lg text-[0.95rem] leading-[2] tracking-[0.01em] text-[var(--foreground-muted)] sm:mt-12 sm:text-base sm:leading-[2.05]">
                    {section.body}
                  </p>
                  <p className="mt-12 sm:mt-14">
                    <a
                      href={section.linkHref}
                      className="text-[0.85rem] tracking-[0.12em] text-[var(--foreground)] underline decoration-[var(--line)] underline-offset-[0.45em] transition-colors duration-300 hover:decoration-[var(--foreground-muted)]"
                    >
                      {section.linkLabel}
                    </a>
                  </p>
                </section>
              ))}
            </div>
          </main>
        </SiteShell>
      </div>
    </div>
  );
}
