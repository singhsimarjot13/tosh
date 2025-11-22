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

        // VALIDATION
        if (!itemCode || !vendorCode || !qty || !uom || !amount) {
          failed.push({ row, error: "Missing required fields" });
          continue;
        }

        // FIND PRODUCT
        const product = await Product.findOne({ itemNo: itemCode });
        if (!product) {
          failed.push({ row, error: "Product not found" });
          continue;
        }

        // FIND CUSTOMER/DEALER (User)
        const toUser = await User.findOne({ bpCode: vendorCode });
        if (!toUser) {
          failed.push({ row, error: "User not found" });
          continue;
        }

        // SET fromUser: Logged-in user (Company or Distributor)
        const fromUser = req.user.id;

        // POINTS MODE AUTO-SET (You can change logic)

        // CREATE INVOICE
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
        product.uom = (product.uom || 0) - qty;
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
