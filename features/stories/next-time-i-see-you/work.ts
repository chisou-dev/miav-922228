export const nextTimeISeeYouWorkId = "next-time-i-see-you";

export const nextTimeISeeYouGenre = "Contemporary Coming-of-Age Romance";

const CHAPTER_TITLES = [
  "Wednesday",
  "Want to Know",
  "Red",
  "Feelings",
  "Undelivered",
  "Father",
  "Adults",
  "Someday",
  "Memories",
  "The Piano Studio",
  "Want to Play",
  "Seventeen",
  "Responsibility",
  "Little by Little",
  "The Exam",
  "The Newspaper",
  "Next Week",
  "Now",
] as const;

export const nextTimeISeeYouChapters = CHAPTER_TITLES.map((title, index) => {
  const number = index + 1;
  const finalChapter = number === 18;
  const pathSlug = finalChapter ? "final-chapter" : `chapter-${number}`;
  return {
    number,
    pathSlug,
    title,
    contentSlug: pathSlug,
    ...(finalChapter ? { finalChapter: true as const } : {}),
  };
});
