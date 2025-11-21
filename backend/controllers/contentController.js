import Content from "../models/Content.js";
import multer from "multer";
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sn-content',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mov', 'pdf', 'doc', 'docx'],
    transformation: [
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit (Cloudinary supports larger files)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

// Create new content
export const createContent = async (req, res) => {
  try {
    const { type, title, description, visibleTo, tags } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ msg: "File is required" });
    }

    const content = new Content({
      type,
      title,
      description,
      url: file.path, // Cloudinary provides the URL in file.path
      fileName: file.originalname,
      fileSize: file.size,
      visibleTo: visibleTo || "Both",
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      uploadedBy: req.user.id
    });

    await content.save();
    res.status(201).json({ msg: "Content uploaded successfully", content });
  } catch (error) {
    console.error('Content creation error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get all content (for admin)
export const getAllContent = async (req, res) => {
  try {
    const { type, visibleTo, page = 1, limit = 10 } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (visibleTo) query.visibleTo = visibleTo;

    const content = await Content.find(query)
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Content.countDocuments(query);

    res.json({
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get content for distributors and dealers
export const getContentForUser = async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;
    
    let visibleToQuery;
    if (userRole === "Distributor") {
      visibleToQuery = { $in: ["Distributor", "Both"] };
    } else if (userRole === "Dealer") {
      visibleToQuery = { $in: ["Dealer", "Both"] };
    } else {
      return res.status(403).json({ msg: "Access denied" });
    }

    const query = { 
      isActive: true,
      visibleTo: visibleToQuery
    };

    if (type) query.type = type;

    const content = await Content.find(query)
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Content.countDocuments(query);

    res.json({
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get content for user error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get content by ID
export const getContentById = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('uploadedBy', 'name role');

    if (!content) {
      return res.status(404).json({ msg: "Content not found" });
    }

    res.json(content);
  } catch (error) {
    console.error('Get content by ID error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Update content
export const updateContent = async (req, res) => {
  try {
    const { title, description, visibleTo, tags, isActive } = req.body;
    
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ msg: "Content not found" });
    }

    content.title = title || content.title;
    content.description = description || content.description;
    content.visibleTo = visibleTo || content.visibleTo;
    content.tags = tags ? tags.split(',').map(tag => tag.trim()) : content.tags;
    content.isActive = isActive !== undefined ? isActive : content.isActive;

    await content.save();
    res.json({ msg: "Content updated successfully", content });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Delete content
export const deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ msg: "Content not found" });
    }

    // Delete file from Cloudinary
    try {
      const publicId = content.url.split('/').pop().split('.')[0]; // Extract public ID from URL
      await cloudinary.uploader.destroy(`sn-content/${publicId}`);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    await Content.findByIdAndDelete(req.params.id);
    res.json({ msg: "Content deleted successfully" });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get content summary
export const getContentSummary = async (req, res) => {
  try {
    const summary = await Content.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" }
        }
      }
    ]);

    const totalContent = await Content.countDocuments({ isActive: true });
    const totalSize = await Content.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
    ]);

    res.json({
      summary,
      totalContent,
      totalSize: totalSize[0]?.totalSize || 0
    });
  } catch (error) {
    console.error('Get content summary error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};
