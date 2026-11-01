"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import type { LandingContent } from "@/lib/content";

import {
  Zap,
  Phone,
  ShoppingBag,
  Shield,
  Globe,
  Truck,
  CreditCard,
  Heart,
  Users,
  MoreHorizontal,
} from "lucide-react";

type Advantage = {
  title: string;
  Icon: React.ElementType;
  description: string;
};

const iconMap: Record<string, React.ElementType> = {
  Zap,
  Phone,
  ShoppingBag,
  Shield,
  Globe,
  Truck,
  CreditCard,
  Heart,
  Users,
  MoreHorizontal,
};

export default function Advantages({
  content,
}: {
  content: LandingContent["advantages"];
}) {
  const [selected, setSelected] = useState<Advantage | null>(null);
  const advantages: Advantage[] = content.items.map((item) => ({
    title: item.title,
    description: item.description,
    Icon: iconMap[item.icon] || MoreHorizontal,
  }));

  return (
    <section id="avantages" className="py-20">
      <div className="mx-auto px-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          {content.title} <span className="text-brand">{content.titleHighlight}</span>
        </h2>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mb-8">
          {advantages.map((adv) => (
            <div
              key={adv.title}
              onClick={() =>
                adv.title !== "Et plus..." && setSelected(adv)
              }
              className="group p-6 rounded-lg text-center border transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 12px 40px rgba(255, 107, 53, 0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "none";
              }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center mx-auto mb-4 text-orange-500"
              >
                <adv.Icon size={22} />
              </div>

              <h4 className="text-sm font-semibold">{adv.title}</h4>
            </div>
          ))}
        </div>

        {/* POPUP */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setSelected(null)}
          >
            <div
              className="relative bg-white max-w-6xl w-full rounded-2xl p-14 grid md:grid-cols-2 gap-14 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setSelected(null)}
                className="absolute top-5 right-5 text-gray-500 hover:text-black text-2xl"
              >
                ✕
              </button>

              {/* LEFT */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-32 h-32 flex items-center justify-center mb-6 text-orange-500">
                  <selected.Icon size={64} />
                </div>

                <h3 className="text-3xl font-bold">
                  {selected.title}
                </h3>
              </div>

              {/* RIGHT */}
              <div>
                <h4 className="text-2xl font-bold mb-5">
                  {content.detailTitle}
                </h4>

                <p className="text-gray-600 leading-relaxed">
                  {selected.description}
                </p>

                <div className="mt-10 border-t pt-5 font-semibold">
                  {content.detailFooter}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BANNER */}
        <div className="rounded-lg p-10 text-center text-xl font-semibold italic max-w-2xl mx-auto border">
          « {content.bannerText} <span className="text-brand">{content.bannerHighlight}</span> !! »
        </div>
      </div>
    </section>
  );
}
