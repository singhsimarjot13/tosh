import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/product.js";
import contentRoutes from "./routes/contentRoutes.js";
import dotenv from "dotenv";
import invoiceRoutes from "./routes/invoice.js";
import walletRoutes from "./routes/wallet.js";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Increase JSON body parser limit to handle bulk product uploads with images
// Default is 100kb, increasing to 50MB to handle base64 images if needed
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Routes
app.get("/", (req, res) => res.send("API Running"));
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/wallets", walletRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
