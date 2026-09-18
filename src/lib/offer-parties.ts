import type { Prisma } from "@prisma/client";

/**
 * Either side of a peer-to-peer offer can be a person trading their own money
 * or a firm trading its clients' pooled money. Everything below works in terms
 * of a "party" so the settlement path stays the same either way.
 */
export type TradingParty =
  | { kind: "USER"; userId: string }
  | { kind: "FIRM"; firmId: string; managerId: string };

type Tx = Prisma.TransactionClient;

/** The party behind a listing: its firm when it has one, otherwise the seller. */
export function sellerParty(offer: {
  sellerId: string;
  firmId: string | null;
}): TradingParty {
  return offer.firmId
    ? { kind: "FIRM", firmId: offer.firmId, managerId: offer.sellerId }
    : { kind: "USER", userId: offer.sellerId };
}

/** The party behind a bid: its firm when it has one, otherwise the buyer. */
export function buyerParty(offer: {
  buyerId: string;
  firmId: string | null;
}): TradingParty {
  return offer.firmId
    ? { kind: "FIRM", firmId: offer.firmId, managerId: offer.buyerId }
    : { kind: "USER", userId: offer.buyerId };
}

export function sameParty(a: TradingParty, b: TradingParty) {
  if (a.kind === "FIRM" && b.kind === "FIRM") return a.firmId === b.firmId;
  if (a.kind === "USER" && b.kind === "USER") return a.userId === b.userId;
  return false;
}

/** Whether `userId` is allowed to act for this party. */
export function partyControlledBy(party: TradingParty, userId: string) {
  return party.kind === "USER"
    ? party.userId === userId
    : party.managerId === userId;
}

export async function getPartyShares(
  tx: Tx,
  party: TradingParty,
  companyId: string
) {
  if (party.kind === "USER") {
    const holding = await tx.holding.findUnique({
      where: { userId_companyId: { userId: party.userId, companyId } },
    });
    return holding?.shares ?? 0;
  }

  const holding = await tx.firmHolding.findUnique({
    where: { firmId_companyId: { firmId: party.firmId, companyId } },
  });
  return holding?.shares ?? 0;
}

export async function getPartyCash(tx: Tx, party: TradingParty) {
  if (party.kind === "USER") {
    const user = await tx.user.findUnique({
      where: { id: party.userId },
      select: { balance: true },
    });
    return user?.balance ?? 0;
  }

  const firm = await tx.firm.findUnique({
    where: { id: party.firmId },
    select: { balance: true },
  });
  return firm?.balance ?? 0;
}

/** Moves cash by a signed amount. Uses atomic increments to avoid lost updates. */
export async function adjustPartyCash(
  tx: Tx,
  party: TradingParty,
  delta: number
) {
  if (party.kind === "USER") {
    await tx.user.update({
      where: { id: party.userId },
      data: { balance: { increment: delta } },
    });
    return;
  }

  await tx.firm.update({
    where: { id: party.firmId },
    data: { balance: { increment: delta } },
  });
}

export async function creditShares(
  tx: Tx,
  party: TradingParty,
  companyId: string,
  shares: number
) {
  if (party.kind === "USER") {
    await tx.holding.upsert({
      where: { userId_companyId: { userId: party.userId, companyId } },
      update: { shares: { increment: shares } },
      create: { userId: party.userId, companyId, shares },
    });
    return;
  }

  await tx.firmHolding.upsert({
    where: { firmId_companyId: { firmId: party.firmId, companyId } },
    update: { shares: { increment: shares } },
    create: { firmId: party.firmId, companyId, shares },
  });
}

export async function debitShares(
  tx: Tx,
  party: TradingParty,
  companyId: string,
  shares: number
) {
  const held = await getPartyShares(tx, party, companyId);
  if (held < shares) {
    throw new Error("Seller has insufficient shares");
  }

  const remaining = held - shares;

  if (party.kind === "USER") {
    if (remaining === 0) {
      await tx.holding.delete({
        where: { userId_companyId: { userId: party.userId, companyId } },
      });
    } else {
      await tx.holding.update({
        where: { userId_companyId: { userId: party.userId, companyId } },
        data: { shares: remaining },
      });
    }
    return;
  }

  if (remaining === 0) {
    await tx.firmHolding.delete({
      where: { firmId_companyId: { firmId: party.firmId, companyId } },
    });
  } else {
    await tx.firmHolding.update({
      where: { firmId_companyId: { firmId: party.firmId, companyId } },
      data: { shares: remaining },
    });
  }
}

/** Writes the ledger entry each side keeps for its own history. */
export async function recordPartyTrade(
  tx: Tx,
  party: TradingParty,
  args: {
    companyId: string;
    symbol: string;
    type: "BUY" | "SELL";
    shares: number;
    price: number;
  }
) {
  if (party.kind === "USER") {
    await tx.transaction.create({
      data: {
        userId: party.userId,
        companyId: args.companyId,
        type: args.type,
        shares: args.shares,
        price: args.price,
      },
    });
    return;
  }

  await tx.firmTransaction.create({
    data: {
      firmId: party.firmId,
      type: args.type,
      assetType: "STOCK",
      assetId: args.companyId,
      symbol: args.symbol,
      units: args.shares,
      price: args.price,
      amount: args.shares * args.price,
      actorId: party.managerId,
    },
  });
}

/**
 * Resolves the firm a user wants to act for, refusing anyone who is not its
 * manager. Returns a USER party when no firm was named.
 */
export async function resolveActingParty(
  client: { firm: { findUnique: (args: never) => unknown } } | Tx,
  firmId: string | undefined,
  user: { id: string }
): Promise<TradingParty> {
  if (!firmId) return { kind: "USER", userId: user.id };

  const tx = client as Tx;
  const firm = await tx.firm.findUnique({
    where: { id: firmId },
    select: { id: true, managerId: true, isClosed: true },
  });

  if (!firm) throw new Error("Firm not found");
  if (firm.managerId !== user.id) {
    throw new Error("Only the firm's manager can trade its capital");
  }
  if (firm.isClosed) throw new Error("This firm is closed");

  return { kind: "FIRM", firmId: firm.id, managerId: user.id };
}
