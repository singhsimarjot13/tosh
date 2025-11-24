import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Invoice from "../models/invoice.js";
import Product from "../models/product.js";
import User from "../models/User.js";

const router = express.Router();

// MULTER CONFIG
const upload = multer({ storage: multer.memoryStorage() });

// EXCEL UPLOAD ROUTE
router.post("/upload-invoices", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const pointsModeFromFrontend = req.body.pointsMode;
    if (!pointsModeFromFrontend || !["PIECE", "AMOUNT"].includes(pointsModeFromFrontend)) {
      return res.status(400).json({ msg: "Invalid points mode" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let success = [];
    let failed = [];

    // UOM conversion rules
    const UOM_TO_PIECES = {
      "PIECE": 1,
      "BOX": 10,
      "CARTON": 30
    };

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

        if (!itemCode || !vendorCode || !qty || !uom || !amount) {
          failed.push({ row, error: "Missing required fields" });
          continue;
        }

        // VALID UOM CHECK
        if (!UOM_TO_PIECES[uom]) {
          failed.push({ row, error: "Invalid UOM" });
          continue;
        }

        // FIND PRODUCT
        const product = await Product.findOne({ itemNo: itemCode });
        if (!product) {
          failed.push({ row, error: "Product not found" });
          continue;
        }

        // FIND CUSTOMER/DEALER
        const toUser = await User.findOne({ bpCode: vendorCode });
        if (!toUser) {
          failed.push({ row, error: "User not found" });
          continue;
        }

        // LOGGED IN USER (company/distributor)
        const fromUser = req.user.id;

        // 🔥 CONVERT QTY → PIECES
        const piecesPerUnit = UOM_TO_PIECES[uom];
        const requestedPieces = Number(qty) * piecesPerUnit;

        // 🔥 CHECK STOCK
        if (requestedPieces > product.totalPieces) {
          failed.push({
            row,
            error: `Not enough stock. Available: ${product.totalPieces}, Required: ${requestedPieces}`
          });
          continue;
        }

        // 🔥 CREATE INVOICE
        await Invoice.create({
          fromUser,
          toUser: toUser._id,
          productID: product._id,
          itemCode,
          itemName,
          customerVendorCode: vendorCode,
          customerVendorName: vendorName,
          qty,
          uom,
          amount,
          pointsMode: pointsModeFromFrontend
        });

        // 🔥 REDUCE STOCK
        product.totalPieces -= requestedPieces;
        await product.save();

        success.push(row);

      } catch (err) {
        failed.push({ row, error: err.message });
      }
    }

    res.json({
      msg: "Excel processed",
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ msg: "Server error" });
  }
});


export default router;
