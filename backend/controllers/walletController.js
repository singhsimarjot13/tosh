import Wallet from "../models/wallet.js";
import WalletTransaction from "../models/walletTransaction.js";
import User from "../models/User.js";
import { ensureWallet, applyWalletTransaction } from "../utils/walletHelpers.js";

const serializeWallet = (wallet) => ({
  walletId: wallet._id,
  balance: wallet.balancePoints,
  totalEarned: wallet.totalEarned,
  totalDebited: wallet.totalDebited,
  updatedAt: wallet.updatedAt
});

export const getWalletBalance = async (req, res) => {
  try {
    const wallet = await ensureWallet(req.user.id);
    return res.json({
      balance: wallet.balancePoints,
      totalEarned: wallet.totalEarned,
      totalDebited: wallet.totalDebited
    });
  } catch (error) {
    console.error("GET WALLET BALANCE ERROR:", error);
    return res.status(500).json({ msg: "Failed to fetch wallet balance" });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page ?? 1, 10), 1);
    const limit = Math.max(parseInt(req.query.limit ?? 10, 10), 1);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ userID: req.user.id })
        .populate("performedBy", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments({ userID: req.user.id })
    ]);

    return res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("GET WALLET TXNS ERROR:", error);
    return res.status(500).json({ msg: "Failed to fetch transactions" });
  }
};

export const getAllWallets = async (_req, res) => {
  try {
    const wallets = await Wallet.find({})
      .populate("userID", "name role bpCode bpName")
      .sort({ updatedAt: -1 });

    return res.json({
      wallets: wallets.map((wallet) => ({
        ...serializeWallet(wallet),
        user: wallet.userID
      }))
    });
  } catch (error) {
    console.error("GET ALL WALLETS ERROR:", error);
    return res.status(500).json({ msg: "Failed to fetch wallets" });
  }
};

export const getWalletSummary = async (_req, res) => {
  try {
    const [walletStats, recentTransactions] = await Promise.all([
      Wallet.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$balancePoints" },
            totalEarned: { $sum: "$totalEarned" },
            totalDebited: { $sum: "$totalDebited" },
            walletCount: { $sum: 1 }
          }
        }
      ]),
      WalletTransaction.find({})
        .populate("userID", "name role")
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    const summary = walletStats?.[0] || {
      totalBalance: 0,
      totalEarned: 0,
      totalDebited: 0,
      walletCount: 0
    };

    return res.json({
      ...summary,
      recentTransactions
    });
  } catch (error) {
    console.error("GET WALLET SUMMARY ERROR:", error);
    return res.status(500).json({ msg: "Failed to load wallet summary" });
  }
};

export const companyDeductDistributor = async (req, res) => {
  try {
    const { distributorId, points, note } = req.body;
    const amount = Number(points);
    if (!distributorId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ msg: "Distributor and positive points are required" });
    }

    const distributor = await User.findById(distributorId);
    if (!distributor || distributor.role !== "Distributor") {
      return res.status(404).json({ msg: "Distributor not found" });
    }

    await applyWalletTransaction({
      userID: distributor._id,
      type: "Debit",
      points: amount,
      rewardDebited: amount,
      createdByRole: "Company",
      performedBy: req.user.id,
      walletOwnerRole: distributor.role,
      note: note || "Manual deduction by company"
    });

    return res.json({ msg: "Points deducted successfully" });
  } catch (error) {
    console.error("COMPANY DEDUCT DISTRIBUTOR ERROR:", error);
    return res.status(400).json({ msg: error.message });
  }
};

export const distributorDeductDealer = async (req, res) => {
  try {
    const { dealerId, points, note } = req.body;
    const amount = Number(points);
    if (!dealerId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ msg: "Dealer and positive points are required" });
    }

    const dealer = await User.findOne({ _id: dealerId, distributorID: req.user.id });
    if (!dealer) {
      return res.status(404).json({ msg: "Dealer not found in your network" });
    }

    await applyWalletTransaction({
      userID: dealer._id,
      type: "Debit",
      points: amount,
      rewardDebited: amount,
      createdByRole: "Distributor",
      performedBy: req.user.id,
      walletOwnerRole: dealer.role,
      note: note || "Manual deduction by distributor"
    });

    return res.json({ msg: "Points deducted successfully" });
  } catch (error) {
    console.error("DISTRIBUTOR DEDUCT DEALER ERROR:", error);
    return res.status(400).json({ msg: error.message });
  }
};

