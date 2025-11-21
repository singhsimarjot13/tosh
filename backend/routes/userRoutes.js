import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { 
  loginCompany, 
  loginWithPhone,
  createDistributor, 
  createDealer, 
  getDistributors, 
  getDealers, 
  getAllDealers, 
  getProfile, 
  logout 
} from "../controllers/authController.js";

const router = express.Router();
import multer from "multer";
import XLSX from "xlsx";
import User from "../models/User.js";


// MULTER FILE UPLOAD
const upload = multer({ storage: multer.memoryStorage() });

// -----------------------------
// BULK DISTRIBUTOR CREATION
// -----------------------------
router.post("/upload-distributors", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    // Only COMPANY is allowed to upload distributors
    if (req.user.role !== "Company") {
      return res.status(403).json({ msg: "Only Company can upload distributors" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let success = [];
    let failed = [];

    for (const row of rows) {
      try {
        const {
          "BP Code": bpCode,
          "BP Name": bpName,
          "Mobile Phone": mobile,
          "Bill-to State": billToState
        } = row;

        // VALIDATION
        if (!bpCode || !bpName) {
          failed.push({ row, error: "BP Code or BP Name missing" });
          continue;
        }

        // CHECK IF BP CODE ALREADY EXISTS
        const exists = await User.findOne({ bpCode });
        if (exists) {
          failed.push({ row, error: "Distributor with BP Code already exists" });
          continue;
        }

        // CREATE DISTRIBUTOR
        const newUser = new User({
          role: "Distributor",
          name: bpName,
          bpCode,
          bpName,
          mobile,
          billToState,
          createdBy: req.user.id,
          isActive: true
        });

        await newUser.save();
        success.push({ bpCode, bpName });

      } catch (err) {
        failed.push({ row, error: err.message });
      }
    }

    return res.json({
      msg: "Distributor upload completed",
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed
    });

  } catch (error) {
    console.error("UPLOAD DISTRIBUTOR ERROR:", error);
    res.status(500).json({ msg: "Server error" });
  }
});



// Public routes
router.post("/login", loginCompany);
router.post("/login-phone", loginWithPhone);
router.post("/logout", logout);

// Protected routes
router.get("/profile", authMiddleware(), getProfile);

// Company routes
router.post("/distributors", authMiddleware(["Company"]), createDistributor);
router.get("/distributors", authMiddleware(["Company"]), getDistributors);
router.get("/dealers", authMiddleware(["Company"]), getAllDealers);

// Distributor routes
router.post("/dealers", authMiddleware(["Distributor"]), createDealer);
router.get("/my-dealers", authMiddleware(["Distributor"]), getDealers);

export default router;
