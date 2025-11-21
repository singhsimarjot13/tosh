import jwt from "jsonwebtoken";

export const authMiddleware = (roles = []) => {
  if(typeof roles === "string") roles = [roles];

  return (req, res, next) => {
    // Try to get token from cookies first (for httpOnly cookies)
    let token = req.cookies?.token;
    
    // If no cookie token, try authorization header
    if (!token) {
      const authHeader = req.headers["authorization"];
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ msg: "Access denied" });
      }
      
      req.user = decoded;
      next();
    } catch(err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ msg: "Invalid token" });
    }
  };
};
