import GatheringGlobe from "@/components/site/GatheringGlobe";
import HeroVideo from "@/components/site/HeroVideo";

// Hero visual (DESIGN.md §8, section 1): the shop owner at the centre of the
// Gathering Globe. Her still and video are server-rendered and handed to the
// globe, which only adds the interaction.
// Assets in public/hero/ are encoded from the originals in design-sources/landing/.
export default function HeroStage() {
  return (
    <GatheringGlobe
      centre={
        <>
          <picture>
            <source
              type="image/avif"
              srcSet="/hero/shop-owner-352.avif 352w, /hero/shop-owner-576.avif 576w"
              sizes="(min-width: 640px) 256px, 36vw"
            />
            <img
              src="/hero/shop-owner-352.webp"
              srcSet="/hero/shop-owner-352.webp 352w, /hero/shop-owner-576.webp 576w"
              sizes="(min-width: 640px) 256px, 36vw"
              alt=""
              width={576}
              height={576}
              fetchPriority="high"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <HeroVideo />
        </>
      }
    />
  );
}
