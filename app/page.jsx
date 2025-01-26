"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import Image from "next/image";
import { client } from "../lib/sanity";

gsap.registerPlugin(ScrollTrigger, Draggable);

export default function Home() {
  const [images, setImages] = useState([]);
  const [highlightedImage, setHighlightedImage] = useState(null);

  useEffect(() => {
    async function fetchImages() {
      const query = `*[_type == "collection"]{
        images[]{
          title,
          description,
          date,
          "imageUrl": image.asset->url
        }
      }`;
      const collections = await client.fetch(query);
      const fetchedImages = collections[0]?.images || [];
      setImages(fetchedImages);
    }

    fetchImages();
  }, []);

  useEffect(() => {
    const cards = gsap.utils.toArray(".cards li");
    if (!cards.length) return;

    let iteration = 0;

    gsap.set(".cards li", { yPercent: 100, opacity: 0, scale: 1 });

    const spacing = 0.1,
      snapTime = gsap.utils.snap(spacing),
      animateFunc = (element) => {
        const tl = gsap.timeline();
        tl.fromTo(
          element,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            zIndex: 100,
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "power1.in",
            immediateRender: false,
          }
        ).fromTo(
          element,
          { yPercent: 550 },
          { yPercent: -550, duration: 1, ease: "none", immediateRender: false },
          0
        );
        return tl;
      },
      seamlessLoop = buildSeamlessLoop(cards, spacing, animateFunc),
      playhead = { offset: 0 },
      wrapTime = gsap.utils.wrap(0, seamlessLoop.duration()),
      scrub = gsap.to(playhead, {
        offset: 0,
        onUpdate() {
          seamlessLoop.time(wrapTime(playhead.offset));
          logCenteredItem();
        },
        duration: 0.5,
        ease: "power3",
        paused: true,
      }),
      trigger = ScrollTrigger.create({
        start: 0,
        onUpdate(self) {
          let scroll = self.scroll();
          if (scroll > self.end - 1) {
            wrap(1, 2);
          } else if (scroll < 1 && self.direction < 0) {
            wrap(-1, self.end - 2);
          } else {
            scrub.vars.offset =
              (iteration + self.progress) * seamlessLoop.duration();
            scrub.invalidate().restart();
          }
        },
        end: "+=3000",
        pin: ".gallery",
      }),
      progressToScroll = (progress) =>
        gsap.utils.clamp(
          1,
          trigger.end - 1,
          gsap.utils.wrap(0, 1, progress) * trigger.end
        ),
      wrap = (iterationDelta, scrollTo) => {
        iteration += iterationDelta;
        trigger.scroll(scrollTo);
        trigger.update();
      };

    ScrollTrigger.addEventListener("scrollEnd", () =>
      scrollToOffset(scrub.vars.offset)
    );

    function scrollToOffset(offset) {
      let snappedTime = snapTime(offset),
        progress =
          (snappedTime - seamlessLoop.duration() * iteration) /
          seamlessLoop.duration(),
        scroll = progressToScroll(progress);
      if (progress >= 1 || progress < 0) {
        return wrap(Math.floor(progress), scroll);
      }
      trigger.scroll(scroll);
    }

    function logCenteredItem() {
      const currentProgress = wrapTime(playhead.offset);
      const currentIndex = Math.round(currentProgress / spacing) % cards.length;
      setHighlightedImage(currentIndex);
    }

    function buildSeamlessLoop(items, spacing, animateFunc) {
      let rawSequence = gsap.timeline({ paused: true }),
        seamlessLoop = gsap.timeline({
          paused: true,
          repeat: -1,
          onRepeat() {
            this._time === this._dur && (this._tTime += this._dur - 0.01);
          },
          onReverseComplete() {
            this.totalTime(this.rawTime() + this.duration() * 100);
          },
        }),
        cycleDuration = spacing * items.length,
        dur;

      items
        .concat(items)
        .concat(items)
        .forEach((item, i) => {
          let anim = animateFunc(items[i % items.length]);
          rawSequence.add(anim, i * spacing);
          dur || (dur = anim.duration());
        });

      seamlessLoop.fromTo(
        rawSequence,
        {
          time: cycleDuration + dur / 2,
        },
        {
          time: "+=" + cycleDuration,
          duration: cycleDuration,
          ease: "none",
        }
      );
      return seamlessLoop;
    }

    Draggable.create(".drag-proxy", {
      type: "y",
      trigger: ".cards",
      onPress() {
        this.startOffset = scrub.vars.offset;
      },
      onDrag() {
        scrub.vars.offset = this.startOffset + (this.startY - this.y) * 0.001;
        scrub.invalidate().restart();
      },
      onDragEnd() {
        scrollToOffset(scrub.vars.offset);
      },
    });
  }, [images]);

  return (
    <div className="base">
      <h1 className="fixed z-10 m-0 top-5 left-5 text-white text-9xl/[7rem]">
        PORTFOLIO
      </h1>
      <h2 className="fixed z-10 m-0 bottom-5 right-5 text-white text-8xl/[6rem]">
        E-Å
      </h2>
      <div className="gallery absolute w-full h-screen">
        <ul className="cards absolute w-56 h-56 top-[20%] left-[10%]">
          {images.map((image, index) => (
            <li
              className="p-0 m-0 w-56 h-56 absolute top-0 left-0 list-none"
              key={index}
            >
              <Image
                className="w-full h-full object-cover overflow-hidden aspect-square"
                src={image.imageUrl}
                alt={image.title || `Image ${index + 1}`}
                width={500}
                height={500}
                quality={50}
                loading="lazy"
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="drag-proxy invisible absolute"></div>
      {highlightedImage !== null && (
        <div className="highlighted-image fixed bottom-5 right-5 max-w-[50vw] h-[80vh] overflow-hidden">
          <h3 className="text-white text-4xl">
            {images[highlightedImage]?.title}
          </h3>
          <p className="text-white text-lg">
            {images[highlightedImage]?.description}
          </p>
          <Image
            className="w-full h-full object-cover"
            src={images[highlightedImage]?.imageUrl}
            alt={images[highlightedImage]?.title || "highlighted"}
            width={500}
            height={500}
            quality={50}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
