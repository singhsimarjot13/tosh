import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Phone number login for Distributors and Dealers
export const loginWithPhone = async (req, res) => {
  try {
    const { mobile, role } = req.body;
    
    if (!mobile || !role) {
      return res.status(400).json({ msg: "Mobile number and role are required" });
    }

    if (!["Distributor", "Dealer"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role for phone login" });
    }

    const user = await User.findOne({ mobile, role, isActive: true });
    if (!user) {
      return res.status(400).json({ msg: "User not found with this mobile number" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ 
      msg: "Login successful", 
      user: { id: user._id, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Company/Admin login
export const loginCompany = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ msg: "Username and password are required" });
    }

    const user = await User.findOne({ username, role: "Company", isActive: true });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ 
      msg: "Login successful", 
      user: { id: user._id, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create distributor (Company can create)
export const createDistributor = async (req, res) => {
  try {
    const { name, mobile, email, address, companyName, businessType } = req.body;
    
    if (!name || !mobile) {
      return res.status(400).json({ msg: "Name and mobile are required" });
    }

    // Check if mobile already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ msg: "Mobile number already registered" });
    }

    const distributor = new User({
      role: "Distributor",
      name,
      mobile,
      email,
      address,
      companyName,
      businessType,
      createdBy: req.user.id
    });

    await distributor.save();

    res.status(201).json({
      msg: "Distributor created successfully",
      distributor: {
        id: distributor._id,
        name: distributor.name,
        mobile: distributor.mobile,
        email: distributor.email,
        companyName: distributor.companyName
      }
    });
  } catch (error) {
    console.error('Create distributor error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create dealer (Distributor can create)
export const createDealer = async (req, res) => {
  try {
    const { name, mobile, email, address, companyName, businessType } = req.body;
    
    if (!name || !mobile) {
      return res.status(400).json({ msg: "Name and mobile are required" });
    }

    // Check if mobile already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ msg: "Mobile number already registered" });
    }

    const dealer = new User({
      role: "Dealer",
      name,
      mobile,
      email,
      address,
      companyName,
      businessType,
      distributorID: req.user.id,
      createdBy: req.user.id
    });

    await dealer.save();

    res.status(201).json({
      msg: "Dealer created successfully",
      dealer: {
        id: dealer._id,
        name: dealer.name,
        mobile: dealer.mobile,
        email: dealer.email,
        companyName: dealer.companyName
      }
    });
  } catch (error) {
    console.error('Create dealer error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get all distributors (Company can see all)


// Get dealers for a distributor
export const getDealers = async (req, res) => {
  try {
    const dealers = await User.find({ 
      role: "Dealer", 
      distributorID: req.user.id,
      isActive: true 
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ dealers });
  } catch (error) {
    console.error('Get dealers error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get all dealers (Company can see all)
export const getAllDealers = async (req, res) => {
  try {
    const dealers = await User.find({ role: "Dealer", isActive: true })
      .populate('distributorID', 'name mobile companyName')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ dealers });
  } catch (error) {
    console.error('Get all dealers error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ msg: "Server error" });
  }
};

// Logout
export const logout = async (req, res) => {
  res.clearCookie('token');
  res.json({ msg: "Logged out successfully" });
};
