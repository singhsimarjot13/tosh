import mongoose from "mongoose";
import XLSX from "xlsx";
import Invoice from "../models/invoice.js";
import Product from "../models/product.js";
import User from "../models/User.js";
import UserProductAllocation from "../models/UserProductAllocation.js";
import { ensureWallet, applyWalletTransaction } from "../utils/walletHelpers.js";

const UOM_ALIASES = {
  BOX: "BOX",
  BOXES: "BOX",
  CARTON: "CARTON",
  CARTONS: "CARTON",
  PIECE: "PIECE",
  PIECES: "PIECE",
  PC: "PIECE",
  PCS: "PIECE",
  UNIT: "PIECE",
  DOZEN: "DOZEN",
  DOZ: "DOZEN"
};

const toObjectId = (value) => {
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return null;
  }
};

const buildInvoiceMatch = (role, userId) => {
  if (role === "Dealer") {
    return { toUser: userId };
  }
  if (role === "Distributor" || role === "Company") {
    return {
      $or: [{ fromUser: userId }, { toUser: userId }]
    };
  }
  return {};
};

const aggregateInvoiceTotals = async (match = {}) => {
  const objectMatch = { ...match };
  const [stats] = await Invoice.aggregate([
    { $match: objectMatch },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalPoints: { $sum: { $ifNull: ["$totalReward", 0] } }
      }
    }
  ]);

  return {
    totalInvoices: stats?.totalInvoices || 0,
    totalPoints: stats?.totalPoints || 0
  };
};

const fetchRecentInvoices = (match = {}) =>
  Invoice.find(match)
    .populate("fromUser", "name role")
    .populate("toUser", "name role")
    .populate("items.productID", "name itemDescription imageURL")
    .sort({ invoiceDate: -1 })
    .limit(5);

const ensureDistributorProductAccess = async (distributorId, items = []) => {
  if (!items.length) return;

  const requirements = items.reduce((acc, item) => {
    const key = String(item.productID);
    const qty = Number(item.qty || 0);
    acc[key] = (acc[key] || 0) + qty;
    return acc;
  }, {});

  const productIds = Object.keys(requirements);

  const allocations = await UserProductAllocation.find({
    userID: distributorId,
    productID: { $in: productIds }
  }).select("productID qty");

  const allocationMap = allocations.reduce((map, allocation) => {
    map.set(allocation.productID.toString(), allocation);
    return map;
  }, new Map());

  for (const productId of productIds) {
    const requiredQty = requirements[productId] || 0;
    const allocation = allocationMap.get(productId);
    const availableQty = Number(allocation?.qty || 0);

    if (availableQty < requiredQty) {
      const error = new Error("Transfer quantity exceeds available stock");
      error.details = {
        productId,
        requestedQty: requiredQty,
        availableQty
      };
      throw error;
    }
  }
};
export const getMyInvoices = async (req, res) => {
  try {
    const match = buildInvoiceMatch(req.user.role, req.user.id);

    const invoices = await Invoice.find(match)
      .populate("fromUser", "name role")
      .populate("toUser", "name role")
      .populate("items.productID", "name imageURL itemDescription")
      .sort({ invoiceDate: -1 });

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const normalizeUom = (value = "") => {
  const upper = String(value).trim().toUpperCase();
  const mapped = UOM_ALIASES[upper];
  if (!mapped) {
    throw new Error(`Unsupported UOM: ${value}`);
  }
  return mapped;
};

const parseInvoiceDate = (value) => {
  if (!value) {
    throw new Error("Invoice date is required");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid invoice date");
  }
  return parsed;
};

const getRewardPerUnit = (product, uom) => {
  const perPiece = Number(product.rewardsPerPc || 0);
  if (uom === "PIECE") return perPiece;
  if (uom === "DOZEN") return Number(product.rewardsPerDozen || perPiece * 12);
  if (uom === "BOX") {
    const quantity = Number(product.boxQuantity || 0);
    return Number(product.rewardsForBox || perPiece * quantity);
  }
  if (uom === "CARTON") {
    const quantity = Number(product.cartonQuantity || 0);
    return Number(product.rewardsForCarton || perPiece * quantity);
  }
  return 0;
};

const getPiecesFromUom = (product, uom, qty) => {
  if (uom === "PIECE") return qty;
  if (uom === "DOZEN") return qty * 12;
  if (uom === "BOX") return qty * Number(product.boxQuantity || 0);
  if (uom === "CARTON") return qty * Number(product.cartonQuantity || 0);
  return qty;
};

const allocateProducts = async (userID, allocations = []) => {
  for (const allocation of allocations) {
    await UserProductAllocation.findOneAndUpdate(
      { userID, productID: allocation.productID },
      {
        $inc: {
          qty: allocation.qty,
          pieces: allocation.pieces
        },
        $setOnInsert: {
          uom: allocation.uom
        }
      },
      { new: true, upsert: true }
    );
  }
};

const releaseAllocatedProducts = async (userID, allocations = []) => {
  for (const allocation of allocations) {
    const existing = await UserProductAllocation.findOne({
      userID,
      productID: allocation.productID
    });

    if (!existing) {
      throw new Error("Allocated inventory not found for the selected product");
    }

    if (existing.qty < allocation.qty) {
      throw new Error("Insufficient allocated quantity for the selected product");
    }

    existing.qty -= allocation.qty;
    existing.pieces = Math.max(existing.pieces - allocation.pieces, 0);
    await existing.save();
  }
};

const buildInvoiceItem = (product, item) => {
  const qty = Number(item.qty || 0);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity must be greater than zero");
  }

  const uom = normalizeUom(item.uom || product.defaultUom || "PIECE");
  const amount = Number(item.amount || 0);
  const rewardPerUnit = getRewardPerUnit(product, uom);
  const rewardTotal = rewardPerUnit * qty;

  const invoiceItem = {
    productID: product._id,
    itemCode: product.itemNo,
    itemName: product.itemDescription || product.name,
    qty,
    uom,
    amount,
    rewardPerUnit,
    rewardTotal
  };

  const allocation = {
    productID: product._id,
    qty,
    uom,
    pieces: getPiecesFromUom(product, uom, qty)
  };

  return { invoiceItem, allocation };
};

const composeInvoiceItems = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one product is required");
  }

  const invoiceItems = [];
  const allocations = [];
  let totalReward = 0;
  let totalAmount = 0;
  let totalQty = 0;

  for (const item of items) {
    const product = await Product.findById(item.productID);
    if (!product) {
      throw new Error("Product not found");
    }

    const { invoiceItem, allocation } = buildInvoiceItem(product, item);
    invoiceItems.push(invoiceItem);
    allocations.push(allocation);

    totalReward += invoiceItem.rewardTotal;
    totalAmount += invoiceItem.amount;
    totalQty += invoiceItem.qty;
  }

  return {
    invoiceItems,
    allocations,
    totals: {
      reward: totalReward,
      amount: totalAmount,
      qty: totalQty
    }
  };
};

const findDistributor = async ({ id, bpCode }) => {
  if (id) {
    const distributor = await User.findOne({ _id: id, role: "Distributor" });
    if (distributor) return distributor;
  }
  if (bpCode) {
    const distributor = await User.findOne({ bpCode, role: "Distributor" });
    if (distributor) return distributor;
  }
  throw new Error("Distributor not found for provided identifier");
};

const findDealer = async (dealerId) => {
  const dealer = await User.findOne({ _id: dealerId, role: "Dealer" });
  if (!dealer) {
    throw new Error("Dealer not found");
  }
  return dealer;
};

export const uploadInvoices = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const invoiceDate = parseInvoiceDate(req.body.invoiceDate);
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const success = [];
    const failed = [];

    for (const row of rows) {
      try {
        const {
          "ItemCode": itemCode,
          "ItemName": itemName,
          "Customer/Vendor Code": vendorCode,
          "Customer/Vendor Name": vendorName,
          "Quantity": qty,
          "UOM": uom,
          "Amount": amount
        } = row;

        if (!itemCode || !vendorCode || !qty || !uom || amount === undefined) {
          throw new Error("Missing required fields");
        }

        const product = await Product.findOne({ itemNo: itemCode });
        if (!product) {
          throw new Error("Product not found");
        }

        const toUser = await User.findOne({ bpCode: vendorCode });
        if (!toUser) {
          throw new Error("Customer not found");
        }

        const { invoiceItem, allocation } = buildInvoiceItem(product, { qty, uom, amount });

        const invoice = await Invoice.create({
          fromUser: req.user.id,
          toUser: toUser._id,
          invoiceNumber: row["Invoice Number"] || row["InvoiceNumber"],
          invoiceDate,
          customerVendorCode: vendorCode,
          customerVendorName: vendorName,
          items: [invoiceItem],
          totalQty: invoiceItem.qty,
          totalAmount: invoiceItem.amount,
          totalReward: invoiceItem.rewardTotal,
          createdByRole: req.user.role
        });

        await allocateProducts(toUser._id, [allocation]);
        await applyWalletTransaction({
          userID: toUser._id,
          type: "Credit",
          points: invoiceItem.rewardTotal,
          rewardCredited: invoiceItem.rewardTotal,
          sourceInvoiceID: invoice._id,
          createdByRole: req.user.role,
          performedBy: req.user.id,
          walletOwnerRole: toUser.role,
          allocatedProducts: [allocation],
          note: "Auto credit via Excel upload"
        });

        await applyWalletTransaction({
          userID: req.user.id,
          type: "Debit",
          points: invoiceItem.rewardTotal,
          rewardDebited: invoiceItem.rewardTotal,
          sourceInvoiceID: invoice._id,
          createdByRole: req.user.role,
          performedBy: req.user.id,
          walletOwnerRole: req.user.role,
          allocatedProducts: [],
          note: "Auto debit via Excel upload"
        });

        success.push({ rowNumber: success.length + failed.length + 1, invoiceId: invoice._id });
      } catch (err) {
        failed.push({ row, error: err.message });
      }
    }

    return res.json({
      msg: "Excel processed",
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};

export const companyCreateInvoice = async (req, res) => {
  try {
    const { items, invoiceDate, invoiceNumber, notes, customerBpCode, toUserId } = req.body;
    const parsedDate = parseInvoiceDate(invoiceDate);
    const distributor = await findDistributor({ id: toUserId, bpCode: customerBpCode });

    const { invoiceItems, allocations, totals } = await composeInvoiceItems(items);
    if (totals.reward <= 0) {
      return res.status(400).json({ msg: "Reward total must be greater than zero" });
    }

    const invoice = await Invoice.create({
      fromUser: req.user.id,
      toUser: distributor._id,
      invoiceNumber,
      invoiceDate: parsedDate,
      customerVendorCode: distributor.bpCode || distributor._id.toString(),
      customerVendorName: distributor.bpName || distributor.name,
      items: invoiceItems,
      totalQty: totals.qty,
      totalAmount: totals.amount,
      totalReward: totals.reward,
      createdByRole: "Company",
      notes
    });

    await allocateProducts(distributor._id, allocations);

    await applyWalletTransaction({
      userID: distributor._id,
      type: "Credit",
      points: totals.reward,
      rewardCredited: totals.reward,
      sourceInvoiceID: invoice._id,
      createdByRole: "Company",
      performedBy: req.user.id,
      walletOwnerRole: distributor.role,
      allocatedProducts: allocations,
      note: "Company → Distributor invoice"
    });

    await applyWalletTransaction({
      userID: req.user.id,
      type: "Debit",
      points: totals.reward,
      rewardDebited: totals.reward,
      sourceInvoiceID: invoice._id,
      createdByRole: "Company",
      performedBy: req.user.id,
      walletOwnerRole: req.user.role,
      allocatedProducts: [],
      note: "Company → Distributor invoice debit"
    });

    return res.status(201).json({ msg: "Invoice created", invoice });
  } catch (error) {
    console.error("COMPANY INVOICE ERROR:", error);
    return res.status(400).json({ msg: error.message });
  }
};

export const distributorCreateInvoice = async (req, res) => {
  try {
    const { items, invoiceDate, invoiceNumber, notes, rewardPoints, dealerId } = req.body;
    const parsedDate = parseInvoiceDate(invoiceDate);
    const dealer = await findDealer(dealerId);
    await ensureDistributorProductAccess(req.user.id, items);

    const { invoiceItems, allocations, totals } = await composeInvoiceItems(items);
    if (totals.reward <= 0) {
      return res.status(400).json({ msg: "Reward total must be greater than zero" });
    }

    let requestedReward = Number(rewardPoints ?? totals.reward);
    if (!Number.isFinite(requestedReward) || requestedReward <= 0) {
      requestedReward = totals.reward;
    }
    if (requestedReward > totals.reward) {
      return res.status(400).json({ msg: "Requested reward exceeds calculated total" });
    }
    if (dealer.dealerRewardLimit && requestedReward > dealer.dealerRewardLimit) {
      return res.status(400).json({ msg: "Requested reward exceeds dealer limit" });
    }

    const invoice = await Invoice.create({
      fromUser: req.user.id,
      toUser: dealer._id,
      invoiceNumber,
      invoiceDate: parsedDate,
      customerVendorCode: dealer.bpCode || dealer._id.toString(),
      customerVendorName: dealer.bpName || dealer.name,
      items: invoiceItems,
      totalQty: totals.qty,
      totalAmount: totals.amount,
      totalReward: requestedReward,
      createdByRole: "Distributor",
      notes
    });

    await allocateProducts(dealer._id, allocations);
    await releaseAllocatedProducts(req.user.id, allocations);

    await applyWalletTransaction({
      userID: dealer._id,
      type: "Credit",
      points: requestedReward,
      rewardCredited: requestedReward,
      sourceInvoiceID: invoice._id,
      createdByRole: "Distributor",
      performedBy: req.user.id,
      walletOwnerRole: dealer.role,
      allocatedProducts: allocations,
      note: "Distributor → Dealer invoice"
    });

    await applyWalletTransaction({
      userID: req.user.id,
      type: "Debit",
      points: requestedReward,
      rewardDebited: requestedReward,
      sourceInvoiceID: invoice._id,
      createdByRole: "Distributor",
      performedBy: req.user.id,
      walletOwnerRole: req.user.role,
      allocatedProducts: [],
      note: "Distributor → Dealer invoice debit"
    });

    return res.status(201).json({ msg: "Invoice created", invoice });
  } catch (error) {
    console.error("DISTRIBUTOR INVOICE ERROR:", error);
    return res.status(400).json({ msg: error.message });
  }
};

export const getInvoiceFormData = async (req, res) => {
  try {
    let products = [];
    if (req.user.role === "Company") {
      products = await Product.find({ status: "Active" }).select(
        "itemDescription name description imageURL rewardsPerPc rewardsForBox rewardsForCarton rewardsPerDozen boxQuantity cartonQuantity status"
      );
    } else if (req.user.role === "Distributor") {
      const allocations = await UserProductAllocation.find({ userID: req.user.id })
        .populate(
          "productID",
          "itemDescription name description imageURL rewardsPerPc rewardsForBox rewardsForCarton rewardsPerDozen boxQuantity cartonQuantity status"
        )
        .sort({ updatedAt: -1 });

      products = allocations
        .filter((allocation) => Boolean(allocation.productID) && allocation.qty > 0)
        .map((allocation) => ({
          ...allocation.productID.toObject(),
          allocation: {
            qty: allocation.qty,
            pieces: allocation.pieces,
            uom: allocation.uom
          }
        }));
    }

    let counterparties = [];
    if (req.user.role === "Company") {
      counterparties = await User.find({ role: "Distributor" }).select("name bpCode bpName role dealerRewardLimit");
    } else if (req.user.role === "Distributor") {
      counterparties = await User.find({ role: "Dealer", distributorID: req.user.id }).select(
        "name bpCode bpName role dealerRewardLimit"
      );
    }

    return res.json({ products, counterparties });
  } catch (error) {
    console.error("FORM DATA ERROR:", error);
    return res.status(500).json({ msg: "Failed to load form data" });
  }
};

export const getAdminInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({})
      .populate("fromUser", "name role")
      .populate("toUser", "name role")
      .populate("items.productID", "name itemDescription imageURL")
      .sort({ invoiceDate: -1 });

    return res.json({ invoices });
  } catch (error) {
    console.error("ADMIN INVOICE LIST ERROR:", error);
    return res.status(500).json({ msg: "Failed to load invoices" });
  }
};

export const getAdminInvoiceSummary = async (req, res) => {
  try {
    const totals = await aggregateInvoiceTotals({});
    const recentInvoices = await fetchRecentInvoices({});
    return res.json({
      ...totals,
      recentInvoices
    });
  } catch (error) {
    console.error("ADMIN SUMMARY ERROR:", error);
    return res.status(500).json({ msg: "Failed to load invoice summary" });
  }
};

export const getDistributorInvoiceSummary = async (req, res) => {
  try {
    const match = buildInvoiceMatch("Distributor", toObjectId(req.user.id));
    const totals = await aggregateInvoiceTotals(match);
    const recentInvoices = await fetchRecentInvoices(match);
    return res.json({
      ...totals,
      recentInvoices
    });
  } catch (error) {
    console.error("DISTRIBUTOR SUMMARY ERROR:", error);
    return res.status(500).json({ msg: "Failed to load distributor summary" });
  }
};

export const getMyProductAllocations = async (req, res) => {
  try {
    if (req.user.role === "Company") {
      const products = await Product.find({ status: "Active" }).select(
        "itemDescription name description imageURL rewardsPerPc rewardsForBox rewardsForCarton rewardsPerDozen boxQuantity cartonQuantity status"
      );
      return res.json({ scope: "all", products });
    }

    const allocations = await UserProductAllocation.find({ userID: req.user.id })
      .populate(
        "productID",
        "itemDescription name description imageURL rewardsPerPc rewardsForBox rewardsForCarton rewardsPerDozen boxQuantity cartonQuantity status"
      )
      .sort({ updatedAt: -1 });

    const products = allocations
      .filter((allocation) => Boolean(allocation.productID) && allocation.qty > 0)
      .map((allocation) => ({
        ...allocation.productID.toObject(),
        allocation: {
          qty: allocation.qty,
          pieces: allocation.pieces,
          uom: allocation.uom
        }
      }));

    return res.json({ scope: "allocated", products });
  } catch (error) {
    console.error("ALLOCATED PRODUCTS ERROR:", error);
    return res.status(500).json({ msg: "Failed to load allocated products" });
  }
};

