import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import Product from "../models/product.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// MULTER CONFIG (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

// -----------------------------
// BULK PRODUCT UPLOAD
// -----------------------------
import ExcelJS from "exceljs";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});
router.get(
  "/admin/all",
  authMiddleware(["Company"]), // roles allowed
  async (req, res) => {
    try {
      const products = await Product.find({})
        .sort({ createdAt: -1 }); // latest first

      res.json({
        msg: "All products fetched",
        count: products.length,
        products
      });

    } catch (err) {
      console.error("GET ALL PRODUCTS ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.post("/upload-products", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    //--------------------------------------------------------------------
    // 1) LOAD EXCEL using ExcelJS (for embedded images)
    //--------------------------------------------------------------------
    const excelJSWorkbook = new ExcelJS.Workbook();
    await excelJSWorkbook.xlsx.load(req.file.buffer);

    const excelJSSheet = excelJSWorkbook.worksheets[0];

    // Get all embedded images metadata from sheet
    const embeddedImages = excelJSSheet.getImages();

    // Get all workbook images (media buffers)
    let imageBufferMap = {};
    excelJSWorkbook.media.forEach(img => {
      // ExcelJS media index == imageId
      imageBufferMap[img.index] = img.buffer;
    });

    //--------------------------------------------------------------------
    // 2) FIND "Image" column index from header row
    //--------------------------------------------------------------------
    let imageColumnName = "Image"; // your header
    let imageCol = null;

    excelJSSheet.getRow(1).eachCell((cell, colNumber) => {
      if (String(cell.value).trim() === imageColumnName) {
        imageCol = colNumber;
      }
    });

    console.log("IMAGE COLUMN FOUND AT:", imageCol);

    //--------------------------------------------------------------------
    // 3) NORMAL XLSX parsing for textual fields
    //--------------------------------------------------------------------
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let success = [];
    let failed = [];

    //--------------------------------------------------------------------
    // 4) LOOP THROUGH EACH PRODUCT ROW
    //--------------------------------------------------------------------
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const excelRowIndex = i + 2; // Row 1 = headers

      try {
        const {
          "Item No.": itemNo,
          "Item Description": description,
          "BOM Type": bomType,
          "Box Quantity": boxQuantity,
          "Rewards": rewardsperunit
        } = row;

        //----------------------------------------------------------------
        // VALIDATION
        //----------------------------------------------------------------
        if (!itemNo || !description || !boxQuantity) {
          failed.push({ row, error: "Missing required fields" });
          continue;
        }

        const PiecesPerBox = 10;
        let finalImageURL = null;

        //----------------------------------------------------------------
        // 5) IMAGE PICK BASED ON "Image" COLUMN
        //----------------------------------------------------------------
        if (imageCol) {
          // Find exact cell containing the image
          const imgObj = embeddedImages.find(img =>
            img.range.tl.row === excelRowIndex - 1 &&
            img.range.tl.col === imageCol - 1
          );

          if (imgObj) {
            const buffer = imageBufferMap[imgObj.imageId];

            if (buffer) {
              const base64 = `data:image/png;base64,${buffer.toString("base64")}`;

              const upload = await cloudinary.uploader.upload(base64, {
                folder: "products"
              });

              finalImageURL = upload.secure_url;
            }
          }
        }

        //----------------------------------------------------------------
        // 6) IF PRODUCT EXISTS → UPDATE STOCK + IMAGE
        //----------------------------------------------------------------
        const existing = await Product.findOne({ itemNo });

        if (existing) {
          const oldQty = Number(existing.totalPieces || 0);
          const newQty = Number(boxQuantity) * PiecesPerBox;

          existing.totalPieces = oldQty + newQty;

          if (finalImageURL) {
            existing.imageURL = finalImageURL;
          }

          await existing.save();
          success.push({ itemNo, msg: "Updated stock" });
          continue;
        }

        //----------------------------------------------------------------
        // 7) CREATE NEW PRODUCT
        //----------------------------------------------------------------
        const newProduct = new Product({
          itemNo,
          name: description,
          description,
          bomType: bomType || "Not a BOM",
          totalPieces: Number(boxQuantity) * PiecesPerBox,
          imageURL: finalImageURL || null,
          status: "Active",
          rewardsperunit: rewardsperunit || 0
        });

        await newProduct.save();
        success.push({ itemNo });

      } catch (err) {
        failed.push({ row, error: err.message });
      }
    }

    //--------------------------------------------------------------------
    // 8) SEND RESPONSE
    //--------------------------------------------------------------------
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
