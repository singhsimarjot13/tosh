import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createContent,
  getAllContent,
  getContentForUser,
  getContentById,
  updateContent,
  deleteContent,
  getContentSummary,
  uploadMiddleware
} from "../controllers/contentController.js";

const router = express.Router();

// Company routes
router.post("/", authMiddleware(["Company"]), uploadMiddleware, createContent);
router.get("/admin/all", authMiddleware(["Company"]), getAllContent);
router.get("/admin/summary", authMiddleware(["Company"]), getContentSummary);
router.put("/:id", authMiddleware(["Company"]), updateContent);
router.delete("/:id", authMiddleware(["Company"]), deleteContent);

// User routes (Distributors and Dealers)
router.get("/", authMiddleware(["Distributor", "Dealer"]), getContentForUser);

// Public routes
router.get("/:id", getContentById);

export default router;
