import Hero from "@/components/layout/Hero";
import {
  getUpcomingEvents,
  getAnnouncements,
  getFeaturedPhotos,
  getFeaturedVideo,
} from "@/lib/discord";

export default async function Home() {
  const [events, announcements, featuredPhotos, featuredVideo] =
    await Promise.all([
      getUpcomingEvents(),
      getAnnouncements(),
      getFeaturedPhotos(),
      getFeaturedVideo(),
    ]);

  return (
    <main>
      <Hero
        events={events}
        announcements={announcements}
        featuredPhotos={featuredPhotos}
        featuredVideo={featuredVideo}
      />
    </main>
  );
}