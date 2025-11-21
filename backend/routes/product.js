import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Product from "../models/product.js";

const router = express.Router();

// MULTER CONFIG (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

// -----------------------------
// BULK PRODUCT UPLOAD
// -----------------------------
router.post("/upload-products", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let success = [];
    let failed = [];

    for (const row of rows) {
      try {
        const {
          "Item No.": itemNo,
          "Item Description": description,
          "BOM Type": bomType,
          "Sales UoM": salesUom,
          "Box Quantity": boxQuantity
        } = row;

        // VALIDATION
        if (!itemNo || !description || !salesUom || !boxQuantity) {
          failed.push({ row, error: "Missing required fields" });
          continue;
        }

        // CHECK VALID UOM
        if (!["BOX", "CARTON", "PIECE"].includes(salesUom)) {
          failed.push({ row, error: "Invalid Sales UoM" });
          continue;
        }

        // CHECK IF PRODUCT ALREADY EXISTS
        const exists = await Product.findOne({ itemNo });
        if (exists) {
          failed.push({ row, error: "Item already exists" });
          continue;
        }

        // CREATE NEW PRODUCT
        const newProduct = new Product({
          itemNo,
          name: description,     // As per your schema: name = description/title
          description,
          bomType: bomType || "Not a BOM",
          salesUom,
          boxQuantity,
          status: "Active",
          uom: 0 // Stock default
        });

        await newProduct.save();
        success.push({ itemNo });

      } catch (err) {
        failed.push({ row, error: err.message });
      }
    }

    res.json({
      msg: "Product upload processed",
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed
    });

  } catch (error) {
    console.error("BULK PRODUCT UPLOAD ERROR:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
