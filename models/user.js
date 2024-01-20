const mongodb = require('mongodb');
const getDb = require('../util/database').getDb;

const ObjectId = mongodb.ObjectId;

class User {
  constructor(username, email, cart, id) {
    this.name = username;
    this.email = email;
    this.cart = cart || { items: [] }; // Ensure cart is initialized with an empty array if not provided
    this._id = id;
  }

  async save() {
    const db = getDb();
    await db.collection('users').insertOne(this);
  }

  addToCart(product) {
    const cartProductIndex = this.cart.items.findIndex(cp => cp.productId.toString() === product._id.toString());
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];

    if (cartProductIndex >= 0) {
      newQuantity = this.cart.items[cartProductIndex].quantity + 1;
      updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
      updatedCartItems.push({
        productId: new ObjectId(product._id),
        quantity: newQuantity
      });
    }
    const updatedCart = {
      items: updatedCartItems
    };
    const db = getDb();
    return db.collection('users').updateOne(
      { _id: new ObjectId(this._id) },
      { $set: { cart: updatedCart } }
    );
  }

  getCart() {
    const db = getDb();
    const productIds = this.cart.items.map(i => i.productId);
    return db.collection('products')
      .find({ _id: { $in: productIds } })
      .toArray()
      .then(products => {
        return products.map(p => {
          const cartItem = this.cart.items.find(i => i.productId.toString() === p._id.toString());
          return {
            ...p,
            quantity: cartItem ? cartItem.quantity : 0
          };
        });
      })
      .catch(err => {
        console.error('Error in getCart:', err);
        throw err; // or handle the error appropriately
      });
  }

  deleteItemFromCart(productId) {
    const updatedCartItems = this.cart.items.filter(item => item.productId.toString() !== productId.toString());
    const db = getDb();
    return db.collection('users').updateOne(
      { _id: new ObjectId(this._id) },
      { $set: { cart: { items: updatedCartItems } } }
    );
  }

  async addOrder() {
    const db = getDb();
    try {
      const products = await this.getCart();
      const order = {
        items: products,
        user: {
          _id: new ObjectId(this._id),
          name: this.name
        }
      };
      await db.collection('orders').insertOne(order);
      this.cart = { items: [] };
      return db.collection('users').updateOne(
        { _id: new ObjectId(this._id) },
        { $set: { cart: { items: [] } } }
      );
    } catch (err) {
      console.error('Error in addOrder:', err);
      throw err; // or handle the error appropriately
    }
  }

  getOrders() {
    const db = getDb();
    return db.collection('orders').find({ 'user._id': new ObjectId(this._id) }).toArray();
  }

  static async findById(userId) {
    try {
      const db = getDb();
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      console.log(user);
      return user;
    } catch (err) {
      console.error('Error in findById:', err);
      throw err; // or handle the error appropriately
    }
  }
}

module.exports = User;
