import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { 
  loginCompany, 
  loginWithPhone,
  createDistributor, 
  createDealer,
  updateDealer,
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

router.get(
  "/dealers",
  authMiddleware(["Company"]),
  async (req, res) => {
    try {
      const dealers = await User.find({ role: "Dealer" })
        .populate("distributorID", "name bpCode bpName mobile");

      res.json({
        msg: "All dealers fetched",
        count: dealers.length,
        dealers
      });

    } catch (err) {
      console.error("FETCH ALL DEALERS ERROR:", err);
      res.status(500).json({ msg: "Server error" });
    }
  }
);


// Distributor routes
router.post("/dealers", authMiddleware(["Distributor"]), createDealer);
router.put("/dealers/:id", authMiddleware(["Distributor", "Company"]), updateDealer);
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
        distributorID:req.user.id,
      })
      .sort({ createdAt: -1 });
    }
    console.log(req);
    console.log(dealers);
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
      console.log("==== UPLOAD DEALERS STARTED ====");

      if (!req.file) {
        console.log("❌ No file uploaded");
        return res.status(400).json({ msg: "No file uploaded" });
      }

      console.log("User:", req.user);
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      console.log("Total rows in Excel:", rows.length);

      const selectedDistributorBP = req.body.bpCode;
      console.log("Selected Distributor BP from UI:", selectedDistributorBP);

      let success = [];
      let failed = [];
      const cleanedRow = {};
      for (const row of rows) {
        try {
          console.log("\n==============================");
          console.log("Processing Raw Row:", row);
          console.log("==============================");

          // CLEAN HEADERS

          for (let key in row) {
            const cleanKey = key.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
            cleanedRow[cleanKey] = row[key];
          }

          console.log("Cleaned Row:", cleanedRow);

          const name = cleanedRow["Name"];
          const mobile = cleanedRow["Phone Number"];
          const address = cleanedRow["Address"];
          const excelBP = cleanedRow["BP Code"];

          console.log("Parsed Values =>", {
            name,
            mobile,
            address,
            excelBP,
            selectedDistributorBP
          });

          // VALIDATION
          if (!name || !mobile) {
            console.log("❌ Missing Name or Mobile");
            failed.push({ cleanedRow, error: "Missing name/mobile" });
            continue;
          }

          let distributor;
          console.log("User Role:", req.user.role);

          // CASE 1 → Distributor creating dealers
          if (req.user.role === "Distributor") {
            distributor = req.user;
            console.log("Auto assigned distributor as logged in distributor");
          }

          // CASE 2 → Company creating dealers
          else if (req.user.role === "Company") {
            let bpToUse = null;

            if (excelBP) {
              bpToUse = excelBP;
              console.log("Using Excel BP Code:", bpToUse);
            } else if (selectedDistributorBP) {
              bpToUse = selectedDistributorBP;
              console.log("Using UI Selected BP Code:", bpToUse);
            }

            if (!bpToUse) {
              console.log("❌ No BP code found in Excel or UI");
              failed.push({ cleanedRow, error: "Distributor BP Code missing (Excel or UI)" });
              continue;
            }

            console.log("Searching Distributor with BP Code:", bpToUse);

            distributor = await User.findOne({
              bpCode: bpToUse,
              role: "Distributor"
            });

            console.log("Distributor Found:", distributor);

            if (!distributor) {
              console.log("❌ Distributor NOT FOUND for BP:", bpToUse);
              failed.push({ cleanedRow, error: `Distributor not found for BP Code ${bpToUse}` });
              continue;
            }
          }

          // CREATE DEALER
          console.log("Creating Dealer For Distributor:", distributor.bpCode);

          const dealer = new User({
            role: "Dealer",
            name,
            mobile,
            address: address || "",
            distributorID: distributor._id,
            bpCode: distributor.bpCode,
            bpName: distributor.bpName,
            createdBy: req.user._id,
            isActive: true
          });

          await dealer.save();

          console.log("✔ Dealer Created Successfully");
          success.push(cleanedRow);

        } catch (err) {
          console.log("❌ Exception in loop:", err.message);
          failed.push({ error: err.message, cleanedRow });
        }
      }

      console.log("\n==== FINAL RESULT ====");
      console.log("Success:", success.length);
      console.log("Failed:", failed.length);
      console.log("======================\n");

      res.json({
        msg: "Dealer upload complete",
        successCount: success.length,
        failedCount: failed.length,
        success,
        failed
      });

    } catch (error) {
      console.log("❌ SERVER ERROR:", error);
      res.status(500).json({ msg: "Server error", error: error.message });
    }
  }
);





export default router;
