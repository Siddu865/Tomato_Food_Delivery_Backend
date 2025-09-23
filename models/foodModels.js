// models/foodModels.js
import mongoose from "mongoose";

export const foodConnection = mongoose.createConnection(
  "mongodb+srv://siddardha865_db_user:FFtQedxpGfE2Jnrm@fooddelivery.ryxlqri.mongodb.net/?retryWrites=true&w=majority&appName=foodDelivery"
);


const foodSchema = mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
});

const userSchema = mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  // NEW: user-scoped cart (synced across devices)
  cart: [
    {
      foodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Food",
        required: true,
      },
      count: { type: Number, default: 0},
    },
  ],
});

const menuSchema = mongoose.Schema({
  menu_name: { type: String, required: true },
  menu_image: { type: String, required: true },
});

const orderSchema = mongoose.Schema(
  {
    items: [
      {
        name: { type: String, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    address: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      phone: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["order in process", "out for delivery", "delivered"],
      default: "order in process",
    },
    createdAt: { type: Date, default: Date.now },
    userId:{type:String,required:true}
  },
  { versionKey: false }
);

const adminUserSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

export const foodModel = foodConnection.model("Food", foodSchema, "foodItems");
export const userModel = foodConnection.model("User", userSchema, "users");
export const menuModel = foodConnection.model("Menu", menuSchema, "menu");
export const orderModel = foodConnection.model("Order", orderSchema, "orders");
export const adminUserModel = foodConnection.model(
  "Admin",
  adminUserSchema,
  "adminUsers"
);
