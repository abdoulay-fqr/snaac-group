"use client";

import Image from "next/image";
import type { FeatureItem } from "@/lib/content";

export default function Features({ items }: { items: FeatureItem[] }) {
  return (
    <section>
      <div className="mx-auto px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 my-20">
          {items.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="w-16 h-16 bg-brand rounded-full flex items-center justify-center mx-auto mb-5">
                <Image
                  src={feature.icon}
                  alt={feature.alt}
                  width={32}
                  height={32}
                  className="brightness-0 invert"
                />
              </div>
              <h3 className="text-lg font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}