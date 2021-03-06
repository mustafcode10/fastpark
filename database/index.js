const mongoose = require("mongoose");
//mongoose.connect('mongodb://localhost/test');
mongoose.connect(
  "mongodb://admin:admin123@ds119374.mlab.com:19374/fastpark",
  { useNewUrlParser: true }
);

const bcrypt = require("bcrypt");
const SALT_WORK_FACTOR = 10;
const db = mongoose.connection;
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
db.on("error", function() {
  console.log("mongoose connection error");
});

db.once("open", function() {
  console.log("mongoose connected successfully");
});

const UserSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  email: String,
  plateNumber: {
    type: String,
    required: true
  },
  name: String,
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  }
});
const OwnerSchema = new Schema({
  name: String,
  phoneNumber: String,
  email: String,
  password: String,
  rating: String,
  image: String
});
const ParkSchema = new Schema({
  title: String,
  description: String,
  long: String,
  lat: String,
  location: String,
  image: String,
  ownerId: { type: mongoose.Schema.ObjectId, ref: "Owner" },
  userId: { type: mongoose.Schema.ObjectId, ref: "User" },
  price: String,
  startTime: String,
  endTime: String
});

const User = mongoose.model("User", UserSchema);
const Owner = mongoose.model("Owner", OwnerSchema);
const Park = mongoose.model("Park", ParkSchema);

//saving user to Users table
const saveUser = (data, cb) => {
  hashPassword(data["password"], function(err, hashedPassword) {
    if (err) console.log("HashPassword Error", err);
    let user = new User({
      name: data["name"],
      phoneNumber: data["phoneNumber"],
      username: data["username"],
      password: hashedPassword,
      plateNumber: data["plateNumber"],
      email: data["email"]
    });
    user.save(function(err) {
      if (err) cb(null, err);
      cb(user, null);
    });
  });
};
//generating hash password using bcrypt
const hashPassword = function(password, cb) {
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) throw err;

    bcrypt.hash(password, salt, function(err, hash) {
      if (err) return cb(err, null);
      cb(null, hash);
    });
  });
};
//checking login password with database
const checkPassword = (data, cb) => {
  User.findOne({ email: data.email }, function(err, res) {
    
    if (res) {
      //here i change cb(isMatch,error) to cb(res, err) because i need to send user information in response
      bcrypt.compare(data.password, res.password, function(err, isMatch) {
        if (err) return cb(null, err);
        cb(res, err);
      });
    } else {
      cb(false, null);
    }
  });
}
//saving owner to the Owners table
const saveOwner = (data, cb) => {
  let owner = new Owner({
    name: data["name"],
    phoneNumber: data["phoneNumber"],
    email: data["email"],
    password: data["password"],
    rating: data["rating"],
    image: data["image"]
  });
  owner.save(function(err) {
    if (err) cb(null, err);
    //returning the auto generated id from the db to be used when adding new parks
    cb(owner._id, null);
  });
};

//saving parks to Parks table
const savePark = (data, cb) => {
  let park = new Park({
    title: data["title"],
    description: data["description"],
    long: data["long"],
    lat: data["lat"],
    location: data["location"],
    image: data["image"],
    ownerId: data["ownerId"],
    price: data["price"],
    startTime: data["startTime"],
    endTime: data["endTime"]
  });
  park.save(function(err) {
    if (err) throw err;
    cb(true);
  });
};

//finding all parks based on the provided location
//using aggregation to get all the owner details from owners table
const findParks = (query, cb) => {
  db.collection("parks")
    .aggregate([
      { $match: { location: query } },
      {
        $lookup: {
          from: "owners",
          localField: "ownerId",
          foreignField: "_id",
          as: "ownerdetails"
        }
      },
      { $project: { _id: 0 } }
    ])
    .toArray(function(err, res) {
      if (err) throw err;
      cb(res);
    });
};
//finding all ownerParks based on the provided ownerId
//using aggregation to get all the user details from users table
const findOwnerParks = (ownerId, callback) => {
  db.collection("parks")
    .aggregate([
      { $match: { ownerId: ObjectId(ownerId) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userdetails"
        }
      }
    ])
    .toArray(function(err, res) {
      console.log(res, err);
      if (err) callback(err, null);
      callback(null, res);
    });
};
//updating the park document with userId based on booking and checkout
const updatePark = (parkId, userId, cb) => {
  Park.updateOne({ _id: parkId }, { userId: userId }, function(err, res) {
    if (res) {
      cb(true, null);
    } else {
      cb(false, err);
    }
  });
};
const deletePark = function (parkId, cb){
  Park.deleteOne({"_id":ObjectId(parkId)},(err,res)=>{
    if (err) {
      console.log("delete error", err)
    } 
    cb(res)
  });
};


module.exports.saveOwner = saveOwner;
module.exports.savePark = savePark;
module.exports.findParks = findParks;
module.exports.findOwnerParks = findOwnerParks;
module.exports.saveUser = saveUser;
module.exports.checkPassword = checkPassword;
module.exports.User = User;
module.exports.deletePark = deletePark;
module.exports.updatePark = updatePark;
