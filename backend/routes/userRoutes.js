import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { 
  loginCompany, 
  loginWithPhone,
  createDistributor, 
  createDealer,  
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
router.post("/upload-distributors",authMiddleware(["Company"]), upload.single("file"), async (req, res) => {
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
// GET ALL DISTRIBUTORS (Only Company)
router.get("/distributors", authMiddleware(["Company"]), async (req, res) => {
  try {
    const distributors = await User.find({ role: "Distributor" }).sort({ createdAt: -1 });

    res.json({
      distributors
    });
  } catch (err) {
    console.error("GET DISTRIBUTORS ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/dealers", authMiddleware(["Company"]), getAllDealers);

// Distributor routes
router.post("/dealers", authMiddleware(["Distributor"]), createDealer);
router.get("/my-dealers", authMiddleware(["Company", "Distributor"]), async (req, res) => {
  try {
    let dealers;

    if (req.user.role === "Company") {
      // Company can see all dealers
      dealers = await User.find({ role: "Dealer" })
        .populate("distributorID", "name bpCode")
        .sort({ createdAt: -1 });

    } else if (req.user.role === "Distributor") {
      // Distributor sees only his dealers
      dealers = await User.find({ 
        role: "Dealer",
        distributorID: req.user._id 
      })
      .populate("distributorID", "name bpCode")
      .sort({ createdAt: -1 });
    }

    res.json({ dealers });

  } catch (err) {
    console.error("GET MY DEALERS ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post(
  "/upload-dealers",
  authMiddleware(["Company", "Distributor"]),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
      }

      const user = req.user;
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const selectedDistributorBP = req.body.bpCode;   // <-- COMING FROM FRONTEND

      let success = [];
      let failed = [];

      for (const row of rows) {
        try {
          const name = row["Name"];
          const mobile = row["Mobile"];
          const address = row["Address"];

          if (!name || !mobile) {
            failed.push({ row, error: "Missing name/mobile" });
            continue;
          }

          let distributor;

          if (user.role === "Distributor") {
            // Distributor creating dealer → Auto assign
            distributor = user;
          } 
          
          else if (user.role === "Company") {
            // Company must select BP Code from UI
            if (!selectedDistributorBP) {
              failed.push({ row, error: "Distributor BP Code missing" });
              continue;
            }

            distributor = await User.findOne({
              bpCode: selectedDistributorBP,
              role: "Distributor"
            });

            if (!distributor) {
              failed.push({ row, error: "Distributor not found for BP Code" });
              continue;
            }
          }

          // Now create dealer
          const dealer = new User({
            role: "Dealer",
            name,
            mobile,
            address: address || "",
            distributorID: distributor._id,
            bpCode: distributor.bpCode,       // dealer inherits distributor BP Code
            bpName: distributor.bpName,       // dealer inherits distributor BP Name
            createdBy: user._id,
            isActive: true
          });

          await dealer.save();
          success.push(row);

        } catch (err) {
          failed.push({ row, error: err.message });
        }
      }

      res.json({
        msg: "Dealer upload complete",
        successCount: success.length,
        failedCount: failed.length,
        success,
        failed
      });

    } catch (error) {
      console.error("DEALER UPLOAD ERROR:", error);
      res.status(500).json({ msg: "Server error" });
    }
  }
);



export default router;
