// server.js
import express from "express";
import {
  foodModel,
  userModel,
  menuModel,
  orderModel,
  adminUserModel,
} from "./models/foodModels.js";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5555;

//console

// ---------------- JWT MIDDLEWARE ---------------- //
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  jwt.verify(token, "SidduAdminKey", (err, decoded) => {
    if (err)
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired token" });
    req.admin = decoded;
    next();
  });
};

const verifyUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, "Siddu865", (err, decoded) => {
    if (err)
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired token" });
    req.user = decoded; // { id, username }
    next();
  });
};

// ---------------- AUTH ---------------- //
app.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json("All fields are required");

    const usernameQuery = await userModel.findOne({ username });
    if (usernameQuery) return res.status(409).json("Username already exists");

    const emailQuery = await userModel.findOne({ email });
    if (emailQuery) return res.status(409).json("Email already registered");

    const hashedPassword = await bcrypt.hash(password, 10);
    await userModel.create({ username, email, password: hashedPassword });

    return res.status(201).json("User created successfully");
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { loginUsername, loginPassword } = req.body;

    const user = await userModel.findOne({ username: loginUsername });
    if (!user) return res.status(404).json("Invalid username");

    const validPassword = await bcrypt.compare(loginPassword, user.password);
    if (!validPassword)
      return res.status(401).json("Username and password do not match");

    // include user id so we can reference it in cart routes
    const payload = { id: user._id.toString(), username: user.username };
    const jwt_token = jwt.sign(payload, "Siddu865", { expiresIn: "24h" });
    return res.status(200).json({ jwt_token });
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

// ---------------- ADMIN LOGIN ---------------- //
app.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const adminUser = await adminUserModel.findOne({ username });
    if (!adminUser)
      return res
        .status(401)
        .json({ success: false, message: "Invalid username" });

    const validPassword = await bcrypt.compare(password, adminUser.password);
    if (!validPassword)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ username }, "SidduAdminKey", { expiresIn: "24h" });

    res.json({
      success: true,
      message: "Admin login successful!",
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ---------------- MENU ---------------- //
app.get("/menu", async (req, res) => {
  try {
    const menuItems = await menuModel.find({});
    res.send(menuItems);
  } catch (error) {
    console.log(error);
    res.status(500).json("Server error");
  }
});

// ---------------- FOOD ITEMS ---------------- //
app.get("/fooditems", async (req, res) => {
  try {
    const { search } = req.query;
    let foodItems;

    if (search) {
      foodItems = await foodModel.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ],
      });
    } else {
      foodItems = await foodModel.find({});
    }

    res.status(200).json(foodItems);
  } catch (error) {
    console.log(error);
    res.status(500).json("Something went wrong");
  }
});

app.get("/fooditems/:category", async (req, res) => {
  try {
    const { category } = req.params;
    
    // Find all food items that match the category (case-insensitive)
    const foodItems = await foodModel.find({
      category: { $regex: new RegExp(category, "i") }
    });
    
    res.status(200).json(foodItems);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch food items by category" });
  }
});

app.get("/admin/listitems", verifyAdminToken, async (req, res) => {
  try {
    const { search } = req.query;
    let foodItems;

    if (search) {
      foodItems = await foodModel.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ],
      });
    } else {
      foodItems = await foodModel.find({});
    }

    res.status(200).json(foodItems);
  } catch (error) {
    console.log(error);
    res.status(500).json("Something went wrong");
  }
});

app.post("/fooditems", verifyAdminToken, async (req, res) => {
  try {
    const newItem = req.body;
    if (
      !newItem.name ||
      !newItem.category ||
      !newItem.price ||
      !newItem.image
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const savedItem = await foodModel.create(newItem);
    res.status(201).json(savedItem);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to add item" });
  }
});

app.delete("/fooditems/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    await foodModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Item removed successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

//get count of each food item

app.get("/eachfooditem/:id", verifyUserToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await userModel.findById(userId);
    const userCart = user.cart;
    const itemIndex = userCart.findIndex((i) => i.foodId.toString() === id);
    if (itemIndex !== -1) {
      res.status(200).json(userCart[itemIndex].count);
    } else {
      res.status(200).json(0);
    }
  } catch (error) {
    console.log(error);
    res.status(404).json("Cannot find the food item");
  }
});

// ---------------- CART (JWT-PROTECTED) ---------------- //
// Get current user's cart with populated food details
app.get("/cart", verifyUserToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).populate("cart.foodId");
    res.json(user?.cart ?? []);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// Add/update an item (if count <= 0, item is removed)
app.post("/cart/add", verifyUserToken, async (req, res) => {
  try {
    const { foodId, count } = req.body;
    
    console.log("=== CART ADD REQUEST START ===");
    console.log(`User ID: ${req.user.id}`);
    console.log(`Food ID received: ${foodId} (type: ${typeof foodId})`);
    console.log(`Count received: ${count} (type: ${typeof count})`);
    
    if (!foodId) return res.status(400).json({ error: "foodId is required" });

    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    console.log("=== CURRENT CART STATE ===");
    console.log(`Cart length: ${user.cart.length}`);
    user.cart.forEach((item, index) => {
      console.log(`Item ${index}: foodId=${item.foodId.toString()} (type: ${typeof item.foodId}), count=${item.count}`);
    });

    // Try multiple comparison methods
    console.log("=== SEARCHING FOR EXISTING ITEM ===");
    const foodIdString = foodId.toString();
    console.log(`Searching for foodId as string: ${foodIdString}`);
    
    let idx = -1;
    for (let i = 0; i < user.cart.length; i++) {
      const cartItemId = user.cart[i].foodId.toString();
      console.log(`Comparing: "${cartItemId}" === "${foodIdString}" = ${cartItemId === foodIdString}`);
      if (cartItemId === foodIdString) {
        idx = i;
        break;
      }
    }
    
    console.log(`Found existing item at index: ${idx}`);

    console.log("=== PERFORMING ACTION ===");
    if (!count || count <= 0) {
      if (idx !== -1) {
        console.log(`REMOVING item from cart at index ${idx}`);
        user.cart.splice(idx, 1);
      } else {
        console.log(`Item not found for removal`);
      }
    } else if (idx !== -1) {
      console.log(`UPDATING existing item at index ${idx} from ${user.cart[idx].count} to ${count}`);
      user.cart[idx].count = count;
    } else {
      console.log(`ADDING new item to cart`);
      user.cart.push({ foodId, count });
    }

    console.log("=== SAVING TO DATABASE ===");
    await user.save();
    
    console.log("=== FINAL CART STATE ===");
    console.log(`Final cart length: ${user.cart.length}`);
    user.cart.forEach((item, index) => {
      console.log(`Final Item ${index}: foodId=${item.foodId.toString()}, count=${item.count}`);
    });
    console.log("=== CART ADD REQUEST END ===\n");
    
    res.json({ message: "Cart updated successfully", cart: user.cart });
  } catch (err) {
    console.log("ERROR in /cart/add:", err);
    res.status(500).json({ error: "Failed to update cart" });
  }
});

// Also add logging to the GET endpoint to see what count is being returned
app.get("/fooditems/:id", verifyUserToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`=== GET COUNT REQUEST ===`);
    console.log(`User ID: ${userId}`);
    console.log(`Food ID: ${id}`);
    
    const user = await userModel.findById(userId);
    const userCart = user.cart;
    
    console.log(`User cart length: ${userCart.length}`);
    userCart.forEach((item, index) => {
      console.log(`Cart Item ${index}: foodId=${item.foodId.toString()}, count=${item.count}`);
    });
    
    const itemIndex = userCart.findIndex((i) => i.foodId.toString() === id);
    
    console.log(`Looking for foodId: ${id}`);
    console.log(`Found at index: ${itemIndex}`);
    
    if (itemIndex !== -1) {
      const count = userCart[itemIndex].count;
      console.log(`Returning count: ${count}`);
      res.status(200).json(count);
    } else {
      console.log(`Item not found, returning count: 0`);
      res.status(200).json(0);
    }
    console.log(`=== GET COUNT REQUEST END ===\n`);
  } catch (error) {
    console.log("ERROR in GET /fooditems/:id:", error);
    res.status(404).json("Cannot find the food item");
  }
});

// Remove a specific item
app.delete("/cart/:foodId", verifyUserToken, async (req, res) => {
  try {
    const { foodId } = req.params;
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart = user.cart.filter((i) => i.foodId.toString() !== String(foodId));
    await user.save();
    const populated = await user.populate("cart.foodId");
    res.json(populated.cart);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

// Clear entire cart (used after successful checkout)
app.post("/cart/clear", verifyUserToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart = [];
    await user.save();
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

// ---------------- ORDERS ---------------- //
app.get("/admin/orders", verifyAdminToken, async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/orders",verifyUserToken, async (req, res) => {
  try {
    const userId=req.user.id
    const orders = await orderModel.find({
      userId:userId
    });
    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.post("/orders",verifyUserToken, async (req, res) => {
  try {
    const userId=req.user.id
    req.body.userId=userId.toString()
    const newOrder = req.body;

    const savedOrder = await orderModel.create(newOrder);
    res.status(201).json(savedOrder);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.patch("/orders/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedOrder = await orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.status(200).json(updatedOrder);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

app.delete("/orders/:id", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    await orderModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

// ---------------- SERVER ---------------- //
app.listen(PORT, () => {
  console.log(`App is running at the port ${PORT}`);
});
