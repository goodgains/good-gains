import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  variant: "icon" | "full";
  className?: string;
};

export function BrandLogo({ href = "/", variant, className = "" }: BrandLogoProps) {
  const content =
    variant === "icon" ? (
      <div className={`relative h-[52px] w-[226px] shrink-0 overflow-hidden ${className}`}>
        <Image
          src="/branding/navbar-logo-exact.png"
          alt="Good Gains Indicators"
          width={1728}
          height={864}
          className="absolute left-0 top-1/2 h-[108px] w-auto max-w-none -translate-y-1/2 object-contain brightness-110 contrast-110"
          priority
        />
      </div>
    ) : (
      <Image
        src="/branding/good_gains_logo_exact.png"
        alt="Good Gains Indicators"
        width={1536}
        height={768}
        className={`h-auto w-[320px] max-w-full object-contain md:w-[420px] ${className}`}
      />
    );

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
