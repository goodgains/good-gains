import Image from "next/image";

export function PaymentTrust() {
  return (
    <div className="flex flex-col items-center justify-center gap-[5px] pt-2 text-center">
      <div className="flex items-center justify-center">
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
          alt="PayPal"
          width={72}
          height={20}
          className="h-5 w-auto opacity-[0.88] grayscale brightness-[1.18]"
          unoptimized
        />
      </div>
      <p className="text-[11px] font-medium leading-[1.25] text-zinc-300/80">
        Secure checkout via PayPal or Paddle
      </p>
    </div>
  );
}
