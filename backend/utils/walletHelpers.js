import User from "../models/User.js";
import Wallet from "../models/wallet.js";
import WalletTransaction from "../models/walletTransaction.js";

export const ensureWallet = async (userID) => {
  let wallet = await Wallet.findOne({ userID });
  if (!wallet) {
    wallet = await Wallet.create({
      userID,
      balancePoints: 0,
      totalEarned: 0,
      totalDebited: 0
    });
  }
  return wallet;
};

const resolveOwnerRole = async (walletOwnerRole, userID) => {
  if (walletOwnerRole) return walletOwnerRole;
  const user = await User.findById(userID).select("role");
  return user?.role || "Distributor";
};

export const applyWalletTransaction = async ({
  userID,
  type,
  points,
  sourceInvoiceID,
  performedBy,
  createdByRole,
  walletOwnerRole,
  pointsMode = "MANUAL",
  note,
  rewardCredited = 0,
  rewardDebited = 0,
  allocatedProducts = []
}) => {
  if (points <= 0) throw new Error("Points must be greater than zero");

  const wallet = await ensureWallet(userID);
  const balanceBefore = wallet.balancePoints;
  const balanceAfter = type === "Credit" ? balanceBefore + points : balanceBefore - points;

  const ownerRole = await resolveOwnerRole(walletOwnerRole, userID);
  if (balanceAfter < 0 && ownerRole !== "Company") {
    throw new Error("Insufficient wallet balance");
  }

  wallet.balancePoints = balanceAfter;
  if (type === "Credit") {
    wallet.totalEarned += points;
  } else {
    wallet.totalDebited += points;
  }
  await wallet.save();

  await WalletTransaction.create({
    userID,
    type,
    points,
    rewardCredited,
    rewardDebited,
    allocatedProducts,
    sourceInvoiceID,
    createdByRole,
    pointsMode,
    note,
    performedBy,
    balanceBefore,
    balanceAfter
  });
};

