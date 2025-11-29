import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getWalletBalance,
  getWalletTransactions,
  getAllWallets,
  getWalletSummary,
  companyDeductDistributor,
  distributorDeductDealer,
  companyDeductDealer
} from "../controllers/walletController.js";

const router = express.Router();

router.get("/balance", authMiddleware(), getWalletBalance);
router.get("/transactions", authMiddleware(), getWalletTransactions);
router.get("/admin/all", authMiddleware(["Company"]), getAllWallets);
router.get("/admin/summary", authMiddleware(["Company"]), getWalletSummary);
router.post("/admin/deduct-distributor", authMiddleware(["Company"]), companyDeductDistributor);
router.post("/admin/deduct-dealer", authMiddleware(["Company"]), companyDeductDealer);
router.post("/deduct-dealer", authMiddleware(["Distributor"]), distributorDeductDealer);

export default router;


