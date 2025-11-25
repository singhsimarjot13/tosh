import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.js";
import {
  uploadInvoices,
  companyCreateInvoice,
  distributorCreateInvoice,
  getInvoiceFormData,
  getMyInvoices,
  getAdminInvoices,
  getAdminInvoiceSummary,
  getDistributorInvoiceSummary,
  getMyProductAllocations
} from "../controllers/invoiceController.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload-invoices",
  authMiddleware(["Company", "Distributor"]),
  upload.single("file"),
  uploadInvoices
);

router.post("/company-create", authMiddleware(["Company"]), companyCreateInvoice);
router.post("/distributor-create", authMiddleware(["Distributor"]), distributorCreateInvoice);
router.get("/form-data", authMiddleware(["Company", "Distributor"]), getInvoiceFormData);
router.get("/my-invoices", authMiddleware(["Company", "Distributor", "Dealer"]), getMyInvoices);
router.get("/admin/all", authMiddleware(["Company"]), getAdminInvoices);
router.get("/admin/summary", authMiddleware(["Company"]), getAdminInvoiceSummary);
router.get("/distributor/summary", authMiddleware(["Distributor"]), getDistributorInvoiceSummary);
router.get("/my-products", authMiddleware(["Company", "Distributor", "Dealer"]), getMyProductAllocations);

export default router;
