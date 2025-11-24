import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import ExcelJS from "exceljs";
import Product from "../models/product.js";
import { authMiddleware } from "../middleware/auth.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

// MULTER CONFIG (Memory Storage)
const upload = multer({ storage: multer.memoryStorage() });

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;

  let normalizedValue = value;

  if (typeof normalizedValue === "string") {
    normalizedValue = normalizedValue.trim();
    if (!normalizedValue.length) return fallback;

    // Remove comma separators and common unit suffixes (e.g., "120 pcs")
    normalizedValue = normalizedValue
      .replace(/,/g, "")
      .replace(/pcs?/gi, "")
      .trim();
  }
// to number function
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateRewardMetrics = ({
  boxQuantity = 0,
  cartonQuantity = 0,
  rewardsPerPc = 0
}) => {
  const boxQty = toNumber(boxQuantity);
  const cartonQty = toNumber(cartonQuantity);
  const rewardPc = toNumber(rewardsPerPc);

  return {
    boxQuantity: boxQty,
    cartonQuantity: cartonQty,
    rewardsPerPc: rewardPc,
    rewardsPerDozen: rewardPc * 12,
    rewardsForBox: boxQty * rewardPc,
    rewardsForCarton: cartonQty * rewardPc
  };
};

const uploadImageBuffer = async (file) => {
  if (!file) return null;
  const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const uploadResult = await cloudinary.uploader.upload(base64, {
    folder: "products"
  });
  return uploadResult.secure_url;
};

const sanitizeString = (value, fallback = "") =>
  typeof value === "string" && value.trim().length
    ? value.trim()
    : fallback;

const normalizeRowKeys = (row) => {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    if (typeof key !== "string") return;
    normalized[key.trim()] = value;
    normalized[key.trim().toLowerCase()] = value;
  });
  return normalized;
};

const pickValue = (row, keys = []) => {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
    const lowerKey = key.toLowerCase();
    if (row[lowerKey] !== undefined) return row[lowerKey];
  }
  return undefined;
};
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

router.get(
  "/",
  authMiddleware(["Company", "Distributor", "Dealer"]),
  async (req, res) => {
    try {
      const products = await Product.find({})
        .sort({ createdAt: -1 });

      res.json({
        msg: "Products fetched",
        count: products.length,
        products
      });
    } catch (err) {
      console.error("GET PRODUCTS ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.post(
  "/",
  authMiddleware(["Company"]),
  upload.single("image"),
  async (req, res) => {
    try {
      const { itemNo, itemDescription } = req.body;

      if (!itemNo || !itemDescription) {
        return res
          .status(400)
          .json({ msg: "itemNo and itemDescription are required" });
      }

      const payload = {
        itemNo: sanitizeString(itemNo),
        itemDescription: sanitizeString(itemDescription),
        name: sanitizeString(itemDescription),
        description: sanitizeString(itemDescription),
        bomType: sanitizeString(req.body.bomType, "Not a BOM"),
        status: req.body.status || "Active",
        ...calculateRewardMetrics({
          boxQuantity: req.body.boxQuantity,
          cartonQuantity: req.body.cartonQuantity,
          rewardsPerPc: req.body.rewardsPerPc
        })
      };

      if (req.file) {
        payload.imageURL = await uploadImageBuffer(req.file);
      }

      const product = await Product.create(payload);

      res.status(201).json({
        msg: "Product created",
        product
      });
    } catch (error) {
      console.error("CREATE PRODUCT ERROR:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.put(
  "/:id",
  authMiddleware(["Company"]),
  upload.single("image"),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ msg: "Product not found" });
      }

      if (req.body.itemNo !== undefined) {
        product.itemNo = sanitizeString(req.body.itemNo) || product.itemNo;
      }

      if (req.body.itemDescription !== undefined) {
        const desc = sanitizeString(req.body.itemDescription);
        if (desc) {
          product.itemDescription = desc;
          product.name = desc;
          product.description = desc;
        }
      }

      if (req.body.bomType !== undefined) {
        product.bomType = sanitizeString(req.body.bomType, "Not a BOM");
      }

      if (req.body.status !== undefined) {
        product.status = req.body.status;
      }

      const rewardMetrics = calculateRewardMetrics({
        boxQuantity:
          req.body.boxQuantity !== undefined
            ? req.body.boxQuantity
            : product.boxQuantity,
        cartonQuantity:
          req.body.cartonQuantity !== undefined
            ? req.body.cartonQuantity
            : product.cartonQuantity,
        rewardsPerPc:
          req.body.rewardsPerPc !== undefined
            ? req.body.rewardsPerPc
            : product.rewardsPerPc
      });

      Object.assign(product, rewardMetrics);

      if (req.file) {
        product.imageURL = await uploadImageBuffer(req.file);
      }

      await product.save();

      res.json({
        msg: "Product updated",
        product
      });
    } catch (error) {
      console.error("UPDATE PRODUCT ERROR:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware(["Company"]),
  async (req, res) => {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);

      if (!product) {
        return res.status(404).json({ msg: "Product not found" });
      }

      res.json({ msg: "Product deleted" });
    } catch (error) {
      console.error("DELETE PRODUCT ERROR:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);

router.get(
  "/:id",
  authMiddleware(["Company"]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ msg: "Product not found" });
      }

      res.json({ product });
    } catch (error) {
      console.error("GET PRODUCT ERROR:", error);
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
        const normalizedRow = normalizeRowKeys(row);

        const itemNo = pickValue(normalizedRow, [
          "Item No.",
          "Item No",
          "Item Number",
          "Item Code",
          "ItemCode"
        ]);
        const description = pickValue(normalizedRow, [
          "Item Description",
          "Description",
          "Product Name",
          "Name"
        ]);
        const bomType = pickValue(normalizedRow, ["BOM Type", "Bom"]);
        const boxQuantity = pickValue(normalizedRow, [
          "Box Quantity",
          "Box Qty",
          "Boxes",
          "Box"
        ]);
        const cartonQuantity = pickValue(normalizedRow, [
          "Carton Quantity",
          "Carton Qty",
          "Cartons",
          "Carton"
        ]);
        const rewardsPerPc = pickValue(normalizedRow, [
          "Rewards",
          "Rewards Per Pc",
          "Rewards Per Piece",
          "Reward"
        ]);

        //----------------------------------------------------------------
        // VALIDATION
        //----------------------------------------------------------------
        if (!itemNo || !description || !boxQuantity) {
          failed.push({ row, error: "Missing required fields" });
          continue;
        }

        const PiecesPerBox = 10;
        const rewardMetrics = calculateRewardMetrics({
          boxQuantity,
          cartonQuantity,
          rewardsPerPc
        });
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
          existing.itemDescription = description;
          existing.name = description;
          existing.description = description;
          existing.bomType = bomType || existing.bomType;
          existing.status = "Active";
          Object.assign(existing, rewardMetrics);

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
          itemDescription: description,
          name: description,
          description,
          bomType: bomType || "Not a BOM",
          totalPieces: Number(boxQuantity) * PiecesPerBox,
          imageURL: finalImageURL || null,
          status: "Active",
          ...rewardMetrics
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
