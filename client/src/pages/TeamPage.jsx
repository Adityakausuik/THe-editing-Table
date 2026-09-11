import { m } from "framer-motion";
import { Users, ZoomIn } from "lucide-react";
import { useState } from "react";
import Container from "../components/ui/Container.jsx";
import ImageZoomModal from "../components/ui/ImageZoomModal.jsx";
import { mediaUrl } from "../lib/api.js";
import { useCmsCollection } from "../lib/useCmsCollection.js";

const DEFAULT_TEAM = [
  {
    _id: "t1",
    fullName: "Akshay Chhabra",
    designation: "Founder & CEO",
    shortBio: "Founder of The Editing Table. Leading post-production direction, creative color science, and strategic studio vision.",
    profileImage: "/assets/akshay-chhabra-founder.jpg"
  },
  {
    _id: "t2",
    fullName: "Master Colorist Suite",
    designation: "Lead DaVinci Colorist",
    shortBio: "Specializing in 35mm Kodak stock emulation, skin tone preservation, and Dolby Vision HDR mastering.",
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85"
  },
  {
    _id: "t3",
    fullName: "Senior Retouching Director",
    designation: "Head of Photo Retouching",
    shortBio: "Overseeing high-fashion editorial retouching, frequency separation, and micro dodge & burn.",
    profileImage: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=85"
  }
];

export default function TeamPage() {
  const { items: incomingMembers, loading, error } = useCmsCollection("/api/v1/cms/team", "team");
  const members = Array.isArray(incomingMembers) && incomingMembers.length > 0 ? incomingMembers : DEFAULT_TEAM;
  const [activeZoomImage, setActiveZoomImage] = useState(null);

  return (
    <div className="py-24 sm:py-32 bg-sage-bg text-forest space-y-12 select-none">
      <Container className="space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-secondary/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-site shadow-soft">
            <Users className="h-4 w-4" /> Senior Post-Production Artists
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-normal text-forest">
            The Creative Minds Behind The Craft
          </h1>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
            Our team of senior editors, colorists, retouchers, and sound engineers bring decades of collective film mastery to every project. Click any profile to zoom in.
          </p>
        </div>

        {loading && <p className="text-center text-sm text-sage-muted">Loading team members...</p>}
        {error && <p className="text-center text-sm text-rose-700">{error}</p>}
        {!loading && !error && members.length === 0 && (
          <p className="text-center text-sm text-sage-muted">No active team members are available yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member, idx) => {
            const name = member.fullName || member.name;
            const role = member.designation || member.role;
            const bio = member.shortBio || member.bio || "";
            const image = mediaUrl(member.profileImage || member.avatar || member.image);
            return (
              <m.button
                key={member._id || member.id || idx}
                type="button"
                aria-label={`Zoom photo of ${name}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="group w-full rounded-3xl border border-sage-light/60 bg-sage-card p-6 text-center shadow-soft transition-all hover:shadow-editorial space-y-4"
                onClick={() => image && setActiveZoomImage({ src: image, name, role })}
              >
                {image && (
                  <div className="relative h-44 w-44 rounded-full overflow-hidden mx-auto border-2 border-sage-light/80 shadow-soft group-hover:border-[rgb(72,125,72)] transition-all">
                    <img
                      src={image}
                      alt={name}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* Hover Zoom Badge Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-1.5 text-white backdrop-blur-[2px]">
                      <ZoomIn className="h-5 w-5 text-site animate-pulse" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Zoom Photo</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-forest font-semibold group-hover:text-site transition-colors">{name}</h3>
                  <p className="text-xs text-site font-semibold uppercase tracking-wider">{role}</p>
                  <p className="text-xs text-sage-muted leading-relaxed max-w-xs mx-auto pt-2">{bio}</p>
                </div>
              </m.button>
            );
          })}
        </div>
      </Container>

      {/* Lightbox Zoom Modal */}
      <ImageZoomModal
        isOpen={!!activeZoomImage}
        onClose={() => setActiveZoomImage(null)}
        imageSrc={activeZoomImage?.src}
        imageName={activeZoomImage?.name}
        imageRole={activeZoomImage?.role}
      />
    </div>
  );
}
